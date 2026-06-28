using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Bookings.Core.DTOs;
using Bookings.Core.Interfaces;

namespace Bookings.API.Controllers
{
    [ApiController]
    public class UniversitiesController : ControllerBase
    {
        private readonly IUniversityService _universityService;

        public UniversitiesController(IUniversityService universityService)
        {
            _universityService = universityService;
        }

        // GET /api/universities
        [HttpGet("api/universities")]
        [AllowAnonymous]
        public IActionResult GetUniversities()
        {
            var universities = _universityService.GetUniversities();
            return Ok(new { universities });
        }

        // GET /api/universities/:id
        [HttpGet("api/universities/{id}")]
        [AllowAnonymous]
        public IActionResult GetUniversityById(Guid id)
        {
            var result = _universityService.GetUniversityById(id);
            if (result == null)
            {
                return NotFound(new { error = "University not found." });
            }
            return Ok(result);
        }

        // GET /api/countries
        [HttpGet("api/countries")]
        [AllowAnonymous]
        public IActionResult GetCountries()
        {
            var countries = _universityService.GetCountries();
            return Ok(new { countries });
        }

        // POST /api/universities/:id/apply
        [HttpPost("api/universities/{id}/apply")]
        [Authorize]
        public async Task<IActionResult> ApplyToUniversity(Guid id, [FromBody] ApplyDto dto)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized(new { error = "Auth required." });
            }

            var result = await _universityService.ApplyToUniversityAsync(id, userId, dto);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                return BadRequest(new { error = result.Error });
            }

            var appResult = (ApplicationResultDto)result.Data!;
            return Ok(new
            {
                message = "Application submitted successfully!",
                applicationId = appResult.ApplicationId,
                chatId = appResult.ChatId
            });
        }
    }
}
