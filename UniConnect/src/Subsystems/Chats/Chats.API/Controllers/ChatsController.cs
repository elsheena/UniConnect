using System;
using System.Collections.Generic;
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
    public class ChatsController : ControllerBase
    {
        private readonly IChatService _chatService;

        public ChatsController(IChatService chatService)
        {
            _chatService = chatService;
        }

        // GET /api/chats
        [HttpGet]
        public async Task<IActionResult> GetChats()
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _chatService.GetChatsAsync(userId);
            if (!result.Success) return BadRequest(new { error = result.Error });

            return Ok(new { chats = result.Chats });
        }

        // POST /api/chats
        [HttpPost]
        public async Task<IActionResult> CreateChat([FromBody] Dictionary<string, object> body)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            if (!body.TryGetValue("otherUserId", out var otherUserIdObj) || otherUserIdObj == null)
            {
                return BadRequest(new { error = "otherUserId is required." });
            }

            if (!Guid.TryParse(otherUserIdObj.ToString(), out var targetId))
            {
                return BadRequest(new { error = "otherUserId must be a valid GUID." });
            }

            var result = await _chatService.CreateChatAsync(userId, userRole, targetId);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                return BadRequest(new { error = result.Error });
            }

            return Ok(new { chat = result.Chat });
        }

        // GET /api/chats/:id
        [HttpGet("{id}")]
        public async Task<IActionResult> GetChat(Guid id)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _chatService.GetChatDetailsAsync(id, userId, userRole);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                if (result.Error.Contains("authorized")) return StatusCode(403, new { error = result.Error });
                return BadRequest(new { error = result.Error });
            }

            return Ok(result.ChatDetails);
        }

        // POST /api/chats/:id/messages
        [HttpPost("{id}/messages")]
        public async Task<IActionResult> SendMessage(Guid id, [FromBody] SendMessageDto dto)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var senderName = User.FindFirstValue(ClaimTypes.Name) ?? "User";
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _chatService.SendMessageAsync(id, userId, senderName, dto.Text);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                if (result.Error.Contains("muted") || result.Error.Contains("authorized")) return StatusCode(403, new { error = result.Error });
                return BadRequest(new { error = result.Error });
            }

            return Ok(new { message = "Sent!", msg = result.Message });
        }

        // PATCH /api/chats/:chatId/messages/:msgId
        [HttpPatch("{chatId}/messages/{msgId}")]
        public async Task<IActionResult> EditMessage(Guid chatId, Guid msgId, [FromBody] EditMessageDto dto)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _chatService.EditMessageAsync(chatId, msgId, userId, userRole, dto.Text);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                if (result.Error.Contains("authorized")) return StatusCode(403, new { error = result.Error });
                return BadRequest(new { error = result.Error });
            }

            return Ok(new { message = "Updated.", msg = result.Message });
        }

        // DELETE /api/chats/:chatId/messages/:msgId
        [HttpDelete("{chatId}/messages/{msgId}")]
        public async Task<IActionResult> DeleteMessage(Guid chatId, Guid msgId)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _chatService.DeleteMessageAsync(chatId, msgId, userId, userRole);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                if (result.Error.Contains("authorized")) return StatusCode(403, new { error = result.Error });
                return BadRequest(new { error = result.Error });
            }

            return Ok(new { message = "Deleted." });
        }

        // POST /api/chats/:chatId/messages/:msgId/react
        [HttpPost("{chatId}/messages/{msgId}/react")]
        public async Task<IActionResult> ReactToMessage(Guid chatId, Guid msgId, [FromBody] ReactMessageDto dto)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _chatService.ReactToMessageAsync(chatId, msgId, userId, dto.Amount);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                return BadRequest(new { error = result.Error });
            }

            return Ok(new { message = "Reacted.", newBalance = result.NewBalance });
        }

        // POST /api/chats/messages/{msgId}/report
        [HttpPost("messages/{msgId}/report")]
        public async Task<IActionResult> ReportMessage(Guid msgId, [FromBody] ReportMessageDto dto)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var reporterName = User.FindFirstValue(ClaimTypes.Name) ?? "User";
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _chatService.ReportMessageAsync(msgId, userId, reporterName, dto.ChatId, dto.ChatType, dto.Reason);
            if (!result.Success) return BadRequest(new { error = result.Error });

            return Ok(new { message = "Message reported successfully." });
        }
    }
}
