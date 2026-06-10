using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Auth.Core.DTOs;
using Auth.Core.Interfaces;

namespace Auth.API.Controllers
{
    [ApiController]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        // GET /api/users/:id
        [HttpGet("api/users/{id}")]
        public async Task<IActionResult> GetUser(Guid id)
        {
            var result = await _userService.GetUserProfileAsync(id);
            if (!result.Success)
            {
                return NotFound(new { error = result.Error });
            }
            return Ok(new { user = result.UserData });
        }

        // PUT /api/users/:id
        [HttpPut("api/users/{id}")]
        public async Task<IActionResult> UpdateUser(Guid id, [FromBody] RegisterDto dto)
        {
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            var currentUserIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

            var result = await _userService.UpdateUserProfileAsync(id, dto, currentUserRole, currentUserIdVal);
            if (!result.Success)
            {
                if (result.Error.Contains("authorized") || result.Error.Contains("edit own profile"))
                {
                    return StatusCode(403, new { error = result.Error });
                }
                return BadRequest(new { error = result.Error });
            }

            return Ok(new { message = "Profile updated.", user = result.UserData, verificationReset = result.VerificationReset });
        }

        // GET /api/users/:id/verification-status
        [HttpGet("api/users/{id}/verification-status")]
        public async Task<IActionResult> GetVerificationStatus(Guid id)
        {
            var result = await _userService.GetVerificationStatusAsync(id);
            if (!result.Success)
            {
                return NotFound(new { error = result.Error });
            }
            return Ok(result.VerificationData);
        }

        // POST /api/users/:id/verification-status
        [HttpPost("api/users/{id}/verification-status")]
        public async Task<IActionResult> UpdateVerificationStatus(Guid id, [FromBody] UpdateVerificationStatusDto dto)
        {
            var result = await _userService.UpdateVerificationStatusAsync(id, dto.Action, dto.UniversityId);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                return BadRequest(new { error = result.Error });
            }
            return Ok(new { success = true });
        }

        // GET /api/stats
        [HttpGet("api/stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized(new { error = "Auth required." });
            }

            var result = await _userService.GetDashboardStatsAsync(userId);
            if (!result.Success)
            {
                return Unauthorized(new { error = result.Error });
            }

            return Ok(result.Stats);
        }
    }
}
