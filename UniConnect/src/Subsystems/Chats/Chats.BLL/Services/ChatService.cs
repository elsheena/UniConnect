using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Chats.Core.Interfaces;
using Chats.DataAccess;
using Core.Models;
using Core.Enums.Document;
using Core.Enums.User;

namespace Chats.BLL.Services
{
    public class ChatService : IChatService
    {
        private readonly ChatsDbContext _db;

        public ChatService(ChatsDbContext db)
        {
            _db = db;
        }

        public record ReactionRecord(Guid UserId, int Amount);

        public async Task<(bool Success, string Error, object? Chats)> GetChatsAsync(Guid userId)
        {
            var myChats = await _db.PrivateChats
                .Where(c => c.StudentId == userId || c.ApplicantId == userId)
                .Include(c => c.Student)
                .Include(c => c.Applicant)
                .Include(c => c.Booking)
                .ToListAsync();

            var enhanced = myChats.Select(c =>
            {
                var otherUser = c.StudentId == userId ? c.Applicant : c.Student;
                return new
                {
                    c.Id,
                    c.BookingId,
                    c.StudentId,
                    c.ApplicantId,
                    c.CreatedAt,
                    c.IsApplicationChat,
                    c.UniversityId,
                    otherUserName = otherUser?.FullName ?? "Unknown User",
                    otherUserAvatar = otherUser?.AvatarStatus == DocumentStatus.Approved ? otherUser.AvatarUrl : null,
                    serviceName = c.Booking != null ? c.Booking.ServiceName : (c.IsApplicationChat ? "University Application" : "Private Message")
                };
            }).ToList();

            return (true, string.Empty, enhanced);
        }

        public async Task<(bool Success, string Error, PrivateChat? Chat)> CreateChatAsync(Guid userId, string currentUserRole, Guid targetId)
        {
            if (targetId == userId)
            {
                return (false, "Cannot create a chat with yourself.", null);
            }

            var otherUser = await _db.Users.FindAsync(targetId);
            if (otherUser == null)
            {
                return (false, "User not found.", null);
            }

            var chat = await _db.PrivateChats.FirstOrDefaultAsync(c =>
                (c.StudentId == userId && c.ApplicantId == targetId) ||
                (c.StudentId == targetId && c.ApplicantId == userId)
            );

            if (chat == null)
            {
                Guid studentId = userId;
                Guid applicantId = targetId;

                if (currentUserRole == "applicant" && otherUser.Role != UserRole.Applicant)
                {
                    studentId = targetId;
                    applicantId = userId;
                }

                chat = new PrivateChat
                {
                    StudentId = studentId,
                    ApplicantId = applicantId,
                    CreatedAt = DateTime.UtcNow,
                    IsApplicationChat = false
                };
                _db.PrivateChats.Add(chat);
                await _db.SaveChangesAsync();
            }

            return (true, string.Empty, chat);
        }

        public async Task<(bool Success, string Error, object? ChatDetails)> GetChatDetailsAsync(Guid chatId, Guid userId, string currentUserRole)
        {
            var chat = await _db.PrivateChats.FindAsync(chatId);
            if (chat == null)
            {
                return (false, "Chat not found.", null);
            }

            if (chat.StudentId != userId && chat.ApplicantId != userId && currentUserRole != "admin")
            {
                return (false, "Not authorized.", null);
            }

            var messagesFromDb = await _db.PrivateMessages
                .Where(m => m.ChatId == chatId)
                .OrderBy(m => m.SentAt)
                .ToListAsync();

            var messages = messagesFromDb.Select(m => new
            {
                m.Id,
                m.ChatId,
                m.SenderId,
                m.SenderName,
                text = m.IsDeleted ? "This message was deleted." : m.Text,
                sentAt = m.SentAt,
                isEdited = m.IsEdited,
                isDeleted = m.IsDeleted,
                reactions = JsonSerializer.Deserialize<List<ReactionRecord>>(m.ReactionsJson) ?? new List<ReactionRecord>()
            }).ToList();

            var otherId = chat.StudentId == userId ? chat.ApplicantId : chat.StudentId;
            var otherUser = await _db.Users.FindAsync(otherId);
            var booking = chat.BookingId.HasValue ? await _db.Bookings.FindAsync(chat.BookingId) : null;
            var currentUser = await _db.Users.FindAsync(userId);

            var details = new
            {
                chat,
                messages,
                otherUserName = otherUser?.FullName ?? "Unknown User",
                otherUserAvatar = otherUser?.AvatarStatus == DocumentStatus.Approved ? otherUser.AvatarUrl : null,
                currentUserAvatar = currentUser?.AvatarStatus == DocumentStatus.Approved ? currentUser.AvatarUrl : null,
                serviceName = booking != null ? booking.ServiceName : (chat.IsApplicationChat ? "University Application" : "Private Message")
            };

            return (true, string.Empty, details);
        }

        public async Task<(bool Success, string Error, object? Message)> SendMessageAsync(Guid chatId, Guid userId, string senderName, string text)
        {
            var chat = await _db.PrivateChats.FindAsync(chatId);
            if (chat == null)
            {
                return (false, "Chat not found.", null);
            }

            var dbUser = await _db.Users.FindAsync(userId);
            if (dbUser != null && (dbUser.Role == UserRole.Muted || dbUser.IsMuted))
            {
                return (false, "You are currently muted and cannot send messages.", null);
            }

            if (chat.StudentId != userId && chat.ApplicantId != userId)
            {
                return (false, "Not authorized.", null);
            }

            if (string.IsNullOrWhiteSpace(text))
            {
                return (false, "Message text is required.", null);
            }

            var newMessage = new PrivateMessage
            {
                ChatId = chat.Id,
                SenderId = userId,
                SenderName = senderName,
                Text = text.Trim(),
                SentAt = DateTime.UtcNow,
                ReactionsJson = "[]",
                IsEdited = false,
                IsDeleted = false
            };

            _db.PrivateMessages.Add(newMessage);

            var otherId = chat.StudentId == userId ? chat.ApplicantId : chat.StudentId;
            var notification = new Notification
            {
                UserId = otherId,
                Title = "New Message",
                Text = $"You received a new message from {senderName}",
                Link = $"/messages?chatId={chat.Id}",
                Read = false,
                CreatedAt = DateTime.UtcNow
            };
            _db.Notifications.Add(notification);

            await _db.SaveChangesAsync();

            var safeMsg = new
            {
                newMessage.Id,
                newMessage.ChatId,
                newMessage.SenderId,
                newMessage.SenderName,
                text = newMessage.Text,
                sentAt = newMessage.SentAt,
                reactions = new List<ReactionRecord>(),
                isEdited = newMessage.IsEdited,
                isDeleted = newMessage.IsDeleted
            };

            return (true, string.Empty, safeMsg);
        }

        public async Task<(bool Success, string Error, PrivateMessage? Message)> EditMessageAsync(Guid chatId, Guid msgId, Guid userId, string currentUserRole, string text)
        {
            var msg = await _db.PrivateMessages.FindAsync(msgId);
            if (msg == null)
            {
                return (false, "Message not found.", null);
            }

            bool isAdmin = currentUserRole == "admin" || currentUserRole == "moderator";
            if (msg.SenderId != userId && !isAdmin)
            {
                return (false, "Not authorized.", null);
            }

            if (string.IsNullOrWhiteSpace(text))
            {
                return (false, "New text is required.", null);
            }

            msg.Text = text.Trim();
            msg.IsEdited = true;
            await _db.SaveChangesAsync();

            return (true, string.Empty, msg);
        }

        public async Task<(bool Success, string Error)> DeleteMessageAsync(Guid chatId, Guid msgId, Guid userId, string currentUserRole)
        {
            var msg = await _db.PrivateMessages.FindAsync(msgId);
            if (msg == null)
            {
                return (false, "Message not found.");
            }

            bool isAdmin = currentUserRole == "admin" || currentUserRole == "moderator";
            if (msg.SenderId != userId && !isAdmin)
            {
                return (false, "Not authorized.");
            }

            msg.IsDeleted = true;
            await _db.SaveChangesAsync();

            return (true, string.Empty);
        }

        public async Task<(bool Success, string Error, int NewBalance)> ReactToMessageAsync(Guid chatId, Guid msgId, Guid userId, int amount)
        {
            var msg = await _db.PrivateMessages.FindAsync(msgId);
            if (msg == null)
            {
                return (false, "Message not found.", 0);
            }

            var user = await _db.Users.FindAsync(userId);
            if (user == null)
            {
                return (false, "User not found.", 0);
            }

            amount = amount <= 0 ? 10 : amount;
            if (user.BalanceMP < amount)
            {
                return (false, "Insufficient MP.", 0);
            }

            var sender = await _db.Users.FindAsync(msg.SenderId);
            if (sender == null)
            {
                return (false, "Sender not found.", 0);
            }

            if (sender.Id == userId)
            {
                return (false, "Cannot react to self.", 0);
            }

            user.BalanceMP -= amount;
            sender.BalanceMP += amount;

            var reactions = JsonSerializer.Deserialize<List<ReactionRecord>>(msg.ReactionsJson) ?? new List<ReactionRecord>();
            reactions.Add(new ReactionRecord(userId, amount));
            msg.ReactionsJson = JsonSerializer.Serialize(reactions);

            await _db.SaveChangesAsync();

            return (true, string.Empty, user.BalanceMP);
        }

        public async Task<(bool Success, string Error)> ReportMessageAsync(Guid messageId, Guid reporterId, string reporterName, Guid chatId, string chatType, string reason)
        {
            if (string.IsNullOrWhiteSpace(reason))
            {
                return (false, "Reason is required to report a message.");
            }

            string messageText = string.Empty;
            Guid senderId = Guid.Empty;
            string senderName = string.Empty;

            if (chatType.Equals("group", StringComparison.OrdinalIgnoreCase))
            {
                var msg = await _db.GroupMessages.FindAsync(messageId);
                if (msg == null) return (false, "Group message not found.");
                messageText = msg.Text;
                senderId = msg.SenderId;
                senderName = msg.SenderName;
            }
            else
            {
                var msg = await _db.PrivateMessages.FindAsync(messageId);
                if (msg == null) return (false, "Private message not found.");
                messageText = msg.Text;
                senderId = msg.SenderId;
                senderName = msg.SenderName;
            }

            var report = new ReportedMessage
            {
                Id = Guid.NewGuid(),
                MessageId = messageId,
                ChatId = chatId,
                ChatType = chatType.ToLower().Trim(),
                ReporterId = reporterId,
                ReporterName = reporterName,
                SenderId = senderId,
                SenderName = senderName,
                MessageText = messageText,
                Reason = reason.Trim(),
                ReportedAt = DateTime.UtcNow,
                Status = "pending"
            };

            _db.ReportedMessages.Add(report);
            await _db.SaveChangesAsync();

            return (true, string.Empty);
        }
    }
}
