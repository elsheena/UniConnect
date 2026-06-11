using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Files.Core.Interfaces;
using Core.Models;
using Core.Enums.Document;
using Files.DataAccess;

namespace Files.API.Controllers
{
    [ApiController]
    [Authorize]
    public class FilesController : ControllerBase
    {
        private readonly FilesDbContext _db;
        private readonly IStorageService _storageService;

        public FilesController(FilesDbContext db, IStorageService storageService)
        {
            _db = db;
            _storageService = storageService;
        }

        // POST /api/users/:id/upload-document
        [HttpPost("api/users/{id}/upload-document")]
        public async Task<IActionResult> UploadDocument(Guid id, [FromForm] IFormFile document, [FromForm] string type = "passport_id")
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var parsedUserId) || parsedUserId != id)
            {
                return StatusCode(403, new { error = "You can only upload documents for yourself." });
            }

            if (document == null || document.Length == 0)
            {
                return BadRequest(new { error = "No file uploaded." });
            }

            if (!Enum.TryParse<DocumentType>(type, true, out var docType))
            {
                if (type.Equals("passport_id", StringComparison.OrdinalIgnoreCase))
                    docType = DocumentType.PassportId;
                else if (type.Equals("student_card", StringComparison.OrdinalIgnoreCase))
                    docType = DocumentType.StudentCard;
                else if (type.Equals("profile_picture", StringComparison.OrdinalIgnoreCase))
                    docType = DocumentType.ProfilePicture;
                else
                    return BadRequest(new { error = "Invalid document type." });
            }

            try
            {
                // Check if already pending document of same type
                var existingPending = await _db.Documents.AnyAsync(d => d.UserId == id && d.Status == DocumentStatus.Pending && d.Type == docType);
                if (existingPending)
                {
                    return Conflict(new { error = $"You already have a {type.Replace('_', ' ')} pending review." });
                }

                // Save file using StorageService
                using (var stream = document.OpenReadStream())
                {
                    var saveResult = await _storageService.SaveFileAsync(stream, document.FileName, id, type);
                    if (!saveResult.Success)
                    {
                        return BadRequest(new { error = saveResult.Error });
                    }

                    var doc = new Document
                    {
                        UserId = id,
                        Filename = saveResult.Filename,
                        OriginalName = document.FileName,
                        UploadedAt = DateTime.UtcNow,
                        Status = DocumentStatus.Pending,
                        Type = docType
                    };

                    _db.Documents.Add(doc);

                    if (docType == DocumentType.ProfilePicture)
                    {
                        var user = await _db.Users.FindAsync(id);
                        if (user != null)
                        {
                            user.AvatarStatus = DocumentStatus.Pending;
                            user.AvatarUrl = $"/uploads/{saveResult.Filename}";
                        }
                    }

                    await _db.SaveChangesAsync();
                    return StatusCode(201, new { message = "Document uploaded. Awaiting verification.", document = doc });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Upload error: " + ex);
                return StatusCode(500, new { error = "Server error." });
            }
        }

        // GET /uploads/{filename}
        [AllowAnonymous]
        [HttpGet("uploads/{filename}")]
        public async Task<IActionResult> GetFile(string filename)
        {
            var storedFile = await _db.StoredFiles.FirstOrDefaultAsync(f => f.Filename == filename);
            if (storedFile == null)
            {
                return NotFound();
            }
            return File(storedFile.Content, storedFile.ContentType);
        }

        // POST /api/files/upload-university-image
        [Authorize(Roles = "admin")]
        [HttpPost("api/files/upload-university-image")]
        public async Task<IActionResult> UploadUniversityImage([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { error = "No file uploaded." });
            }

            try
            {
                using (var stream = file.OpenReadStream())
                {
                    var saveResult = await _storageService.SaveFileAsync(stream, file.FileName, Guid.Empty, "university_image");
                    if (!saveResult.Success)
                    {
                        return BadRequest(new { error = saveResult.Error });
                    }
                    return StatusCode(201, new { url = $"/uploads/{saveResult.Filename}" });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("University image upload error: " + ex);
                return StatusCode(500, new { error = "Server error during upload." });
            }
        }
    }
}
