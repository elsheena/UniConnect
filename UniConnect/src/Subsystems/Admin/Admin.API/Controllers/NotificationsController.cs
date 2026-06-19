using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Admin.Core.Interfaces;

namespace Admin.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationsController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        // GET /api/notifications
        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _notificationService.GetNotificationsAsync(userId);
            if (!result.Success) return BadRequest(new { error = result.Error });

            return Ok(new { notifications = result.Notifications });
        }

        // POST /api/notifications/:id/read
        [HttpPost("{id}/read")]
        public async Task<IActionResult> MarkAsRead(Guid id)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _notificationService.MarkAsReadAsync(id, userId);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                if (result.Error.Contains("authorized")) return StatusCode(403, new { error = result.Error });
                return BadRequest(new { error = result.Error });
            }

            return Ok(new { success = true });
        }
    }
}
