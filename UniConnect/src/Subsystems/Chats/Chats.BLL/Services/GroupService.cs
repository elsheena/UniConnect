using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Chats.Core.DTOs;
using Chats.Core.Interfaces;
using Chats.DataAccess;
using Core.Models;
using Core.Enums.Document;
using Core.Enums.Group;
using Core.Enums.User;

namespace Chats.BLL.Services
{
    public class GroupService : IGroupService
    {
        private readonly ChatsDbContext _db;

        public GroupService(ChatsDbContext db)
        {
            _db = db;
        }

        public record ReactionRecord(Guid UserId, int Amount);

        public async Task<(bool Success, string Error, object? Groups)> GetGroupsAsync(Guid userId)
        {
            var currentUser = await _db.Users.FindAsync(userId);
            if (currentUser == null) return (false, "User not found.", null);

            var groups = await _db.Groups.ToListAsync();

            var visibleGroups = groups.Where(g =>
            {
                if (g.GroupType != GroupType.University) return true;
                if ((currentUser.Role == UserRole.Student || currentUser.Role == UserRole.Representative || currentUser.Role == UserRole.Moderator) && g.UniversityId == currentUser.UniversityId) return true;
                if (currentUser.Role == UserRole.Admin) return true;
                return false;
            }).ToList();

            var unis = await _db.Universities.ToDictionaryAsync(u => u.Id);

            var enhanced = new List<object>();
            foreach (var g in visibleGroups)
            {
                var memberCount = await _db.Memberships.CountAsync(m => m.GroupId == g.Id);
                var isMember = await _db.Memberships.AnyAsync(m => m.GroupId == g.Id && m.UserId == userId);
                string? avatarUrl = null;
                if (g.GroupType == GroupType.University && g.UniversityId.HasValue)
                {
                    if (unis.TryGetValue(g.UniversityId.Value, out var uni))
                    {
                        avatarUrl = uni.Logo;
                    }
                }
                enhanced.Add(new
                {
                    g.Id,
                    g.Name,
                    g.Flag,
                    g.Description,
                    g.CountryCode,
                    isCountryGroup = (g.GroupType == GroupType.Country),
                    isUniversityGroup = (g.GroupType == GroupType.University),
                    g.UniversityId,
                    memberCount,
                    avatarUrl,
                    isMember
                });
            }

            return (true, string.Empty, enhanced);
        }

        public async Task<(bool Success, string Error, object? GroupDetails)> GetGroupDetailsAsync(Guid groupId, Guid userId)
        {
            var group = await _db.Groups.FindAsync(groupId);
            if (group == null)
            {
                return (false, "Group not found.", null);
            }

            var members = await _db.Memberships
                .Where(m => m.GroupId == groupId)
                .Select(m => new
                {
                    m.User!.Id,
                    m.User.FullName,
                    m.User.Nationality,
                    m.User.UniversityName,
                    isRepresentative = m.User.Role == UserRole.Representative,
                    role = m.User.Role.ToString().ToLower(),
                    isMuted = m.User.IsMuted,
                    isBanned = m.User.IsBanned
                })
                .ToListAsync();

            var isMember = await _db.Memberships.AnyAsync(m => m.GroupId == groupId && m.UserId == userId);

            var details = new
            {
                group = new
                {
                    group.Id,
                    group.Name,
                    group.Flag,
                    group.Description,
                    group.CountryCode,
                    isCountryGroup = (group.GroupType == GroupType.Country),
                    isUniversityGroup = (group.GroupType == GroupType.University),
                    group.UniversityId,
                    memberCount = members.Count
                },
                members,
                isMember
            };

            return (true, string.Empty, details);
        }

        public async Task<(bool Success, string Error, string Message)> JoinGroupAsync(Guid groupId, Guid userId, GroupJoinDto dto)
        {
            var currentUser = await _db.Users.FindAsync(userId);
            if (currentUser == null) return (false, "User not found.", string.Empty);

            if (!currentUser.IsVerified)
            {
                return (false, "Your account is not verified yet. Please upload your student document.", string.Empty);
            }

            var group = await _db.Groups.FindAsync(groupId);
            if (group == null)
            {
                return (false, "Group not found.", string.Empty);
            }

            var existing = await _db.Memberships.FirstOrDefaultAsync(m => m.UserId == userId && m.GroupId == groupId);
            if (existing != null)
            {
                return (false, "You are already a member of this group.", string.Empty);
            }

            var existingReq = await _db.GroupRequests.FirstOrDefaultAsync(r => r.UserId == userId && r.GroupId == groupId && r.Status == GroupRequestStatus.Pending);
            if (existingReq != null)
            {
                return (false, "You already have a pending request for this group.", string.Empty);
            }

            bool isAutoApprove = false;
            if (group.GroupType == GroupType.University)
            {
                if ((currentUser.Role == UserRole.Student || currentUser.Role == UserRole.Representative || currentUser.Role == UserRole.Moderator) && currentUser.UniversityId == group.UniversityId)
                {
                    isAutoApprove = true;
                }
                else
                {
                    return (false, "Only students of this university can join this chat.", string.Empty);
                }
            }
            else if (group.GroupType != GroupType.Country || group.CountryCode == "ALL")
            {
                isAutoApprove = true;
            }
            else
            {
                var country = await _db.Countries.FindAsync(group.CountryCode);
                if (country != null && (currentUser.Nationality == country.Name || currentUser.Nationality == country.Code))
                {
                    isAutoApprove = true;
                }
            }

            if (isAutoApprove)
            {
                var membership = new Membership
                {
                    UserId = userId,
                    GroupId = groupId,
                    JoinedAt = DateTime.UtcNow
                };
                _db.Memberships.Add(membership);
                await _db.SaveChangesAsync();

                return (true, string.Empty, $"You joined \"{group.Name}\"!");
            }
            else
            {
                if (string.IsNullOrWhiteSpace(dto.Reason))
                {
                    return (false, "A reason is required to join this group.", "requiresReason");
                }

                var groupRequest = new GroupRequest
                {
                    UserId = userId,
                    UserName = currentUser.FullName,
                    GroupId = groupId,
                    GroupName = group.Name,
                    Reason = dto.Reason.Trim(),
                    Status = GroupRequestStatus.Pending,
                    RequestedAt = DateTime.UtcNow
                };
                _db.GroupRequests.Add(groupRequest);
                await _db.SaveChangesAsync();

                return (true, string.Empty, "Join request sent! An admin will review it shortly.");
            }
        }

        public async Task<(bool Success, string Error)> LeaveGroupAsync(Guid groupId, Guid userId)
        {
            var membership = await _db.Memberships.FirstOrDefaultAsync(m => m.UserId == userId && m.GroupId == groupId);
            if (membership == null)
            {
                return (false, "You are not a member of this group.");
            }

            _db.Memberships.Remove(membership);
            await _db.SaveChangesAsync();

            return (true, string.Empty);
        }

        public async Task<(bool Success, string Error, object? Messages)> GetGroupMessagesAsync(Guid groupId, Guid userId, string currentUserRole)
        {
            var isMember = await _db.Memberships.AnyAsync(m => m.UserId == userId && m.GroupId == groupId);
            if (!isMember && currentUserRole != "admin")
            {
                return (false, "You must be a member to view messages.", null);
            }

            var msgs = await _db.GroupMessages
                .Where(m => m.GroupId == groupId)
                .Include(m => m.Sender)
                .OrderBy(m => m.SentAt)
                .ToListAsync();

            var messages = msgs.Select(m => new
            {
                m.Id,
                text = m.IsDeleted ? "This message was deleted." : m.Text,
                senderName = m.SenderName,
                senderAvatar = m.Sender != null && m.Sender.AvatarStatus == DocumentStatus.Approved ? m.Sender.AvatarUrl : null,
                senderId = m.SenderId,
                sentAt = m.SentAt,
                isEdited = m.IsEdited,
                isDeleted = m.IsDeleted,
                reactions = JsonSerializer.Deserialize<List<ReactionRecord>>(m.ReactionsJson) ?? new List<ReactionRecord>()
            }).ToList();

            return (true, string.Empty, messages);
        }

        public async Task<(bool Success, string Error, GroupMessage? Message)> SendGroupMessageAsync(Guid groupId, Guid userId, string text)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return (false, "User not found.", null);

            if (user.Role == UserRole.Muted || user.IsMuted)
            {
                return (false, "You are currently muted and cannot send messages.", null);
            }

            var isMember = await _db.Memberships.AnyAsync(m => m.UserId == userId && m.GroupId == groupId);
            if (!isMember && user.Role != UserRole.Admin)
            {
                return (false, "You must be a member to send messages.", null);
            }

            if (string.IsNullOrWhiteSpace(text))
            {
                return (false, "Message text is required.", null);
            }

            var newMsg = new GroupMessage
            {
                GroupId = groupId,
                SenderId = userId,
                SenderName = user.FullName,
                Text = text.Trim(),
                SentAt = DateTime.UtcNow,
                ReactionsJson = "[]",
                IsEdited = false,
                IsDeleted = false
            };
            _db.GroupMessages.Add(newMsg);
            await _db.SaveChangesAsync();

            return (true, string.Empty, newMsg);
        }

        public async Task<(bool Success, string Error, GroupMessage? Message)> EditGroupMessageAsync(Guid groupId, Guid msgId, Guid userId, string currentUserRole, string text)
        {
            var msg = await _db.GroupMessages.FindAsync(msgId);
            if (msg == null)
            {
                return (false, "Message not found.", null);
            }

            bool isAdmin = currentUserRole == "admin" || currentUserRole == "moderator";
            if (msg.SenderId != userId && !isAdmin)
            {
                return (false, "Not authorized to edit this message.", null);
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

        public async Task<(bool Success, string Error)> DeleteGroupMessageAsync(Guid groupId, Guid msgId, Guid userId, string currentUserRole)
        {
            var msg = await _db.GroupMessages.FindAsync(msgId);
            if (msg == null)
            {
                return (false, "Message not found.");
            }

            bool isAdmin = currentUserRole == "admin" || currentUserRole == "moderator";
            if (msg.SenderId != userId && !isAdmin)
            {
                return (false, "Not authorized to delete this message.");
            }

            msg.IsDeleted = true;
            await _db.SaveChangesAsync();

            return (true, string.Empty);
        }

        public async Task<(bool Success, string Error, int NewBalance)> ReactToGroupMessageAsync(Guid groupId, Guid msgId, Guid userId, int amount)
        {
            var msg = await _db.GroupMessages.FindAsync(msgId);
            if (msg == null)
            {
                return (false, "Message not found.", 0);
            }

            var user = await _db.Users.FindAsync(userId);
            if (user == null) return (false, "User not found.", 0);

            amount = amount <= 0 ? 10 : amount;
            if (user.BalanceMP < amount)
            {
                return (false, "Insufficient Matryoshka Points (MP).", 0);
            }

            var sender = await _db.Users.FindAsync(msg.SenderId);
            if (sender == null)
            {
                return (false, "Message sender not found.", 0);
            }

            if (sender.Id == userId)
            {
                return (false, "You cannot react to your own message.", 0);
            }

            user.BalanceMP -= amount;
            sender.BalanceMP += amount;

            var reactions = JsonSerializer.Deserialize<List<ReactionRecord>>(msg.ReactionsJson) ?? new List<ReactionRecord>();
            reactions.Add(new ReactionRecord(userId, amount));
            msg.ReactionsJson = JsonSerializer.Serialize(reactions);

            await _db.SaveChangesAsync();

            return (true, string.Empty, user.BalanceMP);
        }
    }
}
