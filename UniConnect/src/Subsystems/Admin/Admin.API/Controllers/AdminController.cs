using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Admin.Core.DTOs;
using Admin.Core.Interfaces;

namespace Admin.API.Controllers
{
    [ApiController]
    [Authorize(Roles = "admin")]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;

        public AdminController(IAdminService adminService)
        {
            _adminService = adminService;
        }

        // GET /api/admin/pending-documents
        [HttpGet("pending-documents")]
        public async Task<IActionResult> GetPendingDocuments()
        {
            var result = await _adminService.GetPendingDocumentsAsync();
            if (!result.Success) return BadRequest(new { error = result.Error });

            return Ok(new { documents = result.Documents });
        }

        // POST /api/admin/verify/{docId}
        [HttpPost("verify/{docId}")]
        public async Task<IActionResult> VerifyDocument(Guid docId, [FromBody] VerifyDocumentDto dto)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var adminId))
            {
                return Unauthorized();
            }

            var result = await _adminService.VerifyDocumentAsync(docId, adminId, dto);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                return BadRequest(new { error = result.Error });
            }

            return Ok(new { message = $"Document {dto.Action}d successfully!" });
        }

        // GET /api/admin/group-requests
        [HttpGet("group-requests")]
        public async Task<IActionResult> GetGroupRequests()
        {
            var result = await _adminService.GetGroupRequestsAsync();
            if (!result.Success) return BadRequest(new { error = result.Error });

            return Ok(new { requests = result.Requests });
        }

        // POST /api/admin/group-requests/{id}
        [HttpPost("group-requests/{id}")]
        public async Task<IActionResult> VerifyGroupRequest(Guid id, [FromBody] VerifyGroupRequestDto dto)
        {
            var result = await _adminService.VerifyGroupRequestAsync(id, dto);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                return BadRequest(new { error = result.Error });
            }

            return Ok(new { message = $"Group request {dto.Action}d." });
        }

        // GET /api/admin/users
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            var result = await _adminService.GetAllUsersAsync();
            if (!result.Success) return BadRequest(new { error = result.Error });

            return Ok(new { users = result.Users });
        }

        // GET /api/admin/stats
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var result = await _adminService.GetAdminStatsAsync();
            if (!result.Success) return BadRequest(new { error = result.Error });

            return Ok(result.Stats);
        }

        // POST /api/admin/universities
        [HttpPost("universities")]
        public async Task<IActionResult> AddUniversity([FromBody] AddUniversityDto dto)
        {
            var result = await _adminService.AddUniversityAsync(dto);
            if (!result.Success) return BadRequest(new { error = result.Error });
            return Ok(new { message = "University added successfully!", university = result.University });
        }

        // POST /api/admin/universities/{universityId}/programs
        [HttpPost("universities/{universityId}/programs")]
        public async Task<IActionResult> AddProgram(Guid universityId, [FromBody] AddProgramDto dto)
        {
            var result = await _adminService.AddProgramAsync(universityId, dto);
            if (!result.Success) return BadRequest(new { error = result.Error });
            return Ok(new { message = "Program added successfully!", program = result.Program });
        }

        // POST /api/admin/groups
        [HttpPost("groups")]
        public async Task<IActionResult> AddGroup([FromBody] AddGroupDto dto)
        {
            var result = await _adminService.AddGroupAsync(dto);
            if (!result.Success) return BadRequest(new { error = result.Error });
            return Ok(new { message = "Group added successfully!", group = result.Group });
        }

        // POST /api/admin/countries
        [HttpPost("countries")]
        public async Task<IActionResult> AddCountry([FromBody] AddCountryDto dto)
        {
            var result = await _adminService.AddCountryAsync(dto);
            if (!result.Success) return BadRequest(new { error = result.Error });
            return Ok(new { message = "Country added successfully!", country = result.Country });
        }

        // POST /api/admin/services
        [HttpPost("services")]
        public async Task<IActionResult> AddServiceType([FromBody] AddServiceTypeDto dto)
        {
            var result = await _adminService.AddServiceTypeAsync(dto);
            if (!result.Success) return BadRequest(new { error = result.Error });
            return Ok(new { message = "Service Type added successfully!", serviceType = result.ServiceType });
        }

        // POST /api/admin/users/{userId}/deduct-mp
        [HttpPost("users/{userId}/deduct-mp")]
        public async Task<IActionResult> DeductMP(Guid userId, [FromBody] DeductMPDto dto)
        {
            var result = await _adminService.DeductUserMPAsync(userId, dto);
            if (!result.Success) return BadRequest(new { error = result.Error });
            return Ok(new { message = "MP points deducted successfully!" });
        }

        // POST /api/admin/users/{userId}/add-mp
        [HttpPost("users/{userId}/add-mp")]
        public async Task<IActionResult> AddMP(Guid userId, [FromBody] AddMPDto dto)
        {
            var result = await _adminService.AddUserMPAsync(userId, dto);
            if (!result.Success) return BadRequest(new { error = result.Error });
            return Ok(new { message = "MP points added successfully!" });
        }
    }
}
