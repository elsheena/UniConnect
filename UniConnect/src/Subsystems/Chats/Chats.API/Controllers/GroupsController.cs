using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Chats.Core.DTOs;
using Chats.Core.Interfaces;

namespace Chats.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class GroupsController : ControllerBase
    {
        private readonly IGroupService _groupService;

        public GroupsController(IGroupService groupService)
        {
            _groupService = groupService;
        }

        // GET /api/groups
        [HttpGet]
        public async Task<IActionResult> GetGroups()
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _groupService.GetGroupsAsync(userId);
            if (!result.Success) return Unauthorized();

            return Ok(new { groups = result.Groups });
        }

        // GET /api/groups/:id
        [HttpGet("{id}")]
        public async Task<IActionResult> GetGroup(Guid id)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _groupService.GetGroupDetailsAsync(id, userId);
            if (!result.Success)
            {
                return NotFound(new { error = result.Error });
            }

            return Ok(result.GroupDetails);
        }

        // POST /api/groups/:id/join
        [HttpPost("{id}/join")]
        public async Task<IActionResult> JoinGroup(Guid id, [FromBody] GroupJoinDto dto)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _groupService.JoinGroupAsync(id, userId, dto);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                if (result.Error.Contains("verified") || result.Error.Contains("Only students")) return StatusCode(403, new { error = result.Error });
                if (result.Error.Contains("already")) return Conflict(new { error = result.Error });
                if (result.Error.Contains("reason is required")) return BadRequest(new { error = result.Error, requiresReason = true });
                return BadRequest(new { error = result.Error });
            }

            return Ok(new { message = result.Message });
        }

        // POST /api/groups/:id/leave
        [HttpPost("{id}/leave")]
        public async Task<IActionResult> LeaveGroup(Guid id)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _groupService.LeaveGroupAsync(id, userId);
            if (!result.Success)
            {
                return NotFound(new { error = result.Error });
            }

            return Ok(new { message = "You left the group." });
        }

        // GET /api/groups/:id/messages
        [HttpGet("{id}/messages")]
        public async Task<IActionResult> GetGroupMessages(Guid id)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _groupService.GetGroupMessagesAsync(id, userId, userRole);
            if (!result.Success)
            {
                return StatusCode(403, new { error = result.Error });
            }

            return Ok(new { messages = result.Messages });
        }

        // POST /api/groups/:id/messages
        [HttpPost("{id}/messages")]
        public async Task<IActionResult> SendGroupMessage(Guid id, [FromBody] SendMessageDto dto)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _groupService.SendGroupMessageAsync(id, userId, dto.Text);
            if (!result.Success)
            {
                return StatusCode(403, new { error = result.Error });
            }

            return Ok(new { message = "Message sent.", msg = result.Message });
        }

        // PATCH /api/groups/:groupId/messages/:msgId
        [HttpPatch("{groupId}/messages/{msgId}")]
        public async Task<IActionResult> EditGroupMessage(Guid groupId, Guid msgId, [FromBody] EditMessageDto dto)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _groupService.EditGroupMessageAsync(groupId, msgId, userId, userRole, dto.Text);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                return StatusCode(403, new { error = result.Error });
            }

            return Ok(new { message = "Message updated.", msg = result.Message });
        }

        // DELETE /api/groups/:groupId/messages/:msgId
        [HttpDelete("{groupId}/messages/{msgId}")]
        public async Task<IActionResult> DeleteGroupMessage(Guid groupId, Guid msgId)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _groupService.DeleteGroupMessageAsync(groupId, msgId, userId, userRole);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                return StatusCode(403, new { error = result.Error });
            }

            return Ok(new { message = "Message deleted." });
        }

        // POST /api/groups/:groupId/messages/:msgId/react
        [HttpPost("{groupId}/messages/{msgId}/react")]
        public async Task<IActionResult> ReactToGroupMessage(Guid groupId, Guid msgId, [FromBody] ReactMessageDto dto)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _groupService.ReactToGroupMessageAsync(groupId, msgId, userId, dto.Amount);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                return BadRequest(new { error = result.Error });
            }

            return Ok(new { message = "Reaction added!", newBalance = result.NewBalance });
        }
    }
}
