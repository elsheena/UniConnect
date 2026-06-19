using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Files.Core.Interfaces;
using Files.DataAccess;
using Core.Models;

namespace Files.BLL.Services
{
    public class StorageService : IStorageService
    {
        private readonly FilesDbContext _db;

        public StorageService(FilesDbContext db)
        {
            _db = db;
        }

        public async Task<(bool Success, string Error, string Filename)> SaveFileAsync(Stream fileStream, string originalName, Guid userId, string fileType)
        {
            var ext = Path.GetExtension(originalName).ToLower();
            var allowed = new[] { ".jpg", ".jpeg", ".png", ".pdf" };
            if (!allowed.Contains(ext))
            {
                return (false, "Only JPG, PNG, and PDF files are allowed.", string.Empty);
            }

            try
            {
                byte[] fileBytes;
                using (var ms = new MemoryStream())
                {
                    await fileStream.CopyToAsync(ms);
                    fileBytes = ms.ToArray();
                }

                var newFilename = userId == Guid.Empty 
                    ? $"uni_{DateTime.UtcNow.Ticks}{ext}"
                    : $"doc_{userId}_{DateTime.UtcNow.Ticks}{ext}";

                var contentType = ext switch
                {
                    ".pdf" => "application/pdf",
                    ".png" => "image/png",
                    ".jpg" => "image/jpeg",
                    ".jpeg" => "image/jpeg",
                    _ => "application/octet-stream"
                };

                var storedFile = new StoredFile
                {
                    Filename = newFilename,
                    Content = fileBytes,
                    ContentType = contentType,
                    CreatedAt = DateTime.UtcNow
                };

                _db.StoredFiles.Add(storedFile);
                await _db.SaveChangesAsync();

                return (true, string.Empty, newFilename);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Save file to database error: " + ex);
                return (false, "Database file write error.", string.Empty);
            }
        }
    }
}
