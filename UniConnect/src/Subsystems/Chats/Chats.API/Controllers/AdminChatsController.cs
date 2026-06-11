using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Chats.DataAccess;
using Core.Models;
using Core.Enums.Group;

namespace Chats.API.Controllers
{
    [ApiController]
    [Authorize(Roles = "admin")]
    [Route("api/admin/chats")]
    public class AdminChatsController : ControllerBase
    {
        private readonly ChatsDbContext _db;

        public AdminChatsController(ChatsDbContext db)
        {
            _db = db;
        }

        // GET /api/admin/chats
        [HttpGet]
        public async Task<IActionResult> GetConversations()
        {
            // Retrieve all private chats
            var privateChats = await _db.PrivateChats
                .Include(c => c.Student)
                .Include(c => c.Applicant)
                .ToListAsync();

            var conversations = new List<object>();

            foreach (var pc in privateChats)
            {
                var lastMsg = await _db.PrivateMessages
                    .Where(m => m.ChatId == pc.Id)
                    .OrderByDescending(m => m.SentAt)
                    .FirstOrDefaultAsync();

                conversations.Add(new
                {
                    id = $"private_{pc.Id}",
                    title = $"{pc.Student?.FullName ?? "Unknown Student"} & {pc.Applicant?.FullName ?? "Unknown Applicant"}",
                    lastMessage = lastMsg != null ? lastMsg.Text : "No messages yet.",
                    timestamp = lastMsg != null ? lastMsg.SentAt : pc.CreatedAt,
                    type = "Private",
                    badgeClass = "badge-blue"
                });
            }

            // Retrieve all groups
            var groups = await _db.Groups.ToListAsync();

            foreach (var g in groups)
            {
                var lastMsg = await _db.GroupMessages
                    .Where(m => m.GroupId == g.Id)
                    .OrderByDescending(m => m.SentAt)
                    .FirstOrDefaultAsync();

                conversations.Add(new
                {
                    id = $"group_{g.Id}",
                    title = g.Name,
                    lastMessage = lastMsg != null ? lastMsg.Text : "No messages yet.",
                    timestamp = lastMsg != null ? lastMsg.SentAt : DateTime.UtcNow.AddDays(-30), // default older date for sorting if empty
                    type = g.GroupType == GroupType.University ? "University Group" : g.GroupType == GroupType.Country ? "Country Group" : "Group",
                    badgeClass = g.GroupType == GroupType.University ? "badge-purple" : g.GroupType == GroupType.Country ? "badge-green" : "badge-gray"
                });
            }

            // Sort by latest message/activity
            var sortedConversations = conversations
                .OrderByDescending(c => ((dynamic)c).timestamp)
                .ToList();

            return Ok(new { conversations = sortedConversations });
        }

        // GET /api/admin/chats/private_{id}
        [HttpGet("private_{id}")]
        public async Task<IActionResult> GetPrivateChatDetails(Guid id)
        {
            var chat = await _db.PrivateChats
                .Include(c => c.Student)
                .Include(c => c.Applicant)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (chat == null) return NotFound(new { error = "Private chat not found." });

            var messages = await _db.PrivateMessages
                .Where(m => m.ChatId == id)
                .OrderBy(m => m.SentAt)
                .Select(m => new
                {
                    m.Id,
                    senderId = m.SenderId,
                    senderName = m.SenderName,
                    text = m.Text,
                    timestamp = m.SentAt
                })
                .ToListAsync();

            return Ok(new
            {
                chatId = $"private_{id}",
                messages = messages
            });
        }

        // GET /api/admin/chats/group_{id}
        [HttpGet("group_{id}")]
        public async Task<IActionResult> GetGroupChatDetails(Guid id)
        {
            var group = await _db.Groups.FindAsync(id);
            if (group == null) return NotFound(new { error = "Group not found." });

            var messages = await _db.GroupMessages
                .Where(m => m.GroupId == id)
                .OrderBy(m => m.SentAt)
                .Select(m => new
                {
                    m.Id,
                    senderId = m.SenderId,
                    senderName = m.SenderName,
                    text = m.Text,
                    timestamp = m.SentAt
                })
                .ToListAsync();

            return Ok(new
            {
                chatId = $"group_{id}",
                messages = messages
            });
        }
    }
}
