using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Admin.Core.DTOs;
using Admin.Core.Interfaces;
using Core.Models;
using Core.Enums.Application;
using Core.Enums.Booking;
using Core.Enums.Document;
using Core.Enums.Group;
using Core.Enums.Transaction;
using Core.Enums.User;
using Admin.DataAccess.Data;

namespace Admin.BLL.Services
{
    public class AdminService : IAdminService
    {
        private readonly AdminDbContext _db;

        public AdminService(AdminDbContext db)
        {
            _db = db;
        }

        public async Task<(bool Success, string Error, object? Documents)> GetPendingDocumentsAsync()
        {
            var rawDocs = await _db.Documents
                .Where(d => d.Status == DocumentStatus.Pending)
                .Include(d => d.User)
                .ToListAsync();

            var docs = rawDocs.Select(d => new
            {
                d.Id,
                d.UserId,
                d.Filename,
                d.OriginalName,
                d.UploadedAt,
                status = d.Status.ToString().ToLower(),
                type = d.Type == DocumentType.PassportId ? "passport_id" :
                       d.Type == DocumentType.StudentCard ? "student_card" :
                       d.Type == DocumentType.ProfilePicture ? "profile_picture" : "unknown",
                userEmail = d.User != null ? d.User.Email : "Unknown",
                userFullName = d.User != null ? d.User.FullName : "Unknown",
                userRole = d.User != null ? d.User.Role.ToString().ToLower() : "Unknown",
                hasVerifiedId = d.User != null && _db.Documents.Any(doc => doc.UserId == d.UserId && doc.Type == DocumentType.PassportId && doc.Status == DocumentStatus.Approved),
                verifiedIdFilename = d.User != null 
                    ? _db.Documents.Where(doc => doc.UserId == d.UserId && doc.Type == DocumentType.PassportId && doc.Status == DocumentStatus.Approved)
                                   .Select(doc => doc.Filename)
                                   .FirstOrDefault()
                    : null
            }).ToList();

            return (true, string.Empty, docs);
        }

        public async Task<(bool Success, string Error)> VerifyDocumentAsync(Guid docId, Guid adminId, VerifyDocumentDto dto)
        {
            var doc = await _db.Documents.FindAsync(docId);
            if (doc == null)
            {
                return (false, "Document not found.");
            }

            if (dto.Action != "approve" && dto.Action != "reject")
            {
                return (false, "Action must be 'approve' or 'reject'.");
            }

            if (dto.Action == "reject" && string.IsNullOrWhiteSpace(dto.Note))
            {
                return (false, "A rejection note is required.");
            }

            doc.Status = dto.Action == "approve" ? DocumentStatus.Approved : DocumentStatus.Rejected;
            doc.ReviewedBy = adminId;
            doc.ReviewedAt = DateTime.UtcNow;
            doc.ReviewNote = dto.Note;

            await _db.SaveChangesAsync();

            var user = await _db.Users.FindAsync(doc.UserId);
            bool allApproved = false;

            if (user != null)
            {
                var wasVerified = user.IsVerified;
                var oldRole = user.Role;

                if (dto.Action == "approve")
                {
                    if (doc.Type == DocumentType.ProfilePicture)
                    {
                        user.AvatarStatus = DocumentStatus.Approved;
                    }
                    if (doc.Type == DocumentType.StudentCard && dto.GraduationDate.HasValue)
                    {
                        user.GraduationDate = dto.GraduationDate.Value;
                    }
                }
                else
                {
                    if (doc.Type == DocumentType.ProfilePicture)
                    {
                        user.AvatarStatus = DocumentStatus.Rejected;
                    }
                    if (doc.Type == DocumentType.StudentCard)
                    {
                        user.PendingUniversityId = null;
                    }
                }

                await UpdateUserStatusAfterDocChangeAsync(user);
                allApproved = user.IsVerified;
                var becameStudent = oldRole == UserRole.Applicant && user.Role == UserRole.Student;

                string notifTitle;
                string notifText;

                if (dto.Action == "approve")
                {
                    if (doc.Type == DocumentType.StudentCard && becameStudent)
                    {
                        notifTitle = "Student Status Verified!";
                        notifText = $"Congratulations! Your student card has been verified. You are now a verified student at {user.UniversityName}!";
                    }
                    else if (doc.Type == DocumentType.StudentCard && user.Role == UserRole.Student && !becameStudent)
                    {
                        notifTitle = "University Transfer Verified!";
                        notifText = $"Congratulations! Your transfer has been verified. You are now a verified student at {user.UniversityName}!";
                    }
                    else
                    {
                        notifTitle = allApproved ? "Account Verified!" : "Document Approved";
                        notifText = allApproved
                            ? "Congratulations! Your account has been verified and community groups unlocked."
                            : $"Your {doc.Type.ToString().Replace('_', ' ')} has been approved. Awaiting review for other documents.";
                    }
                }
                else
                {
                    notifTitle = "Verification Rejected";
                    notifText = $"Your document ({doc.Type.ToString().Replace('_', ' ')}) verification failed. Reason: {dto.Note ?? "Incomplete document details."}";
                }

                var notification = new Notification
                {
                    UserId = doc.UserId,
                    Title = notifTitle,
                    Text = notifText,
                    Link = "/profile",
                    Read = false,
                    CreatedAt = DateTime.UtcNow
                };
                _db.Notifications.Add(notification);
            }

            await _db.SaveChangesAsync();
            return (true, string.Empty);
        }

        public async Task<(bool Success, string Error, object? Requests)> GetGroupRequestsAsync()
        {
            var reqs = await _db.GroupRequests
                .Where(r => r.Status == GroupRequestStatus.Pending)
                .ToListAsync();

            return (true, string.Empty, reqs);
        }

        public async Task<(bool Success, string Error)> VerifyGroupRequestAsync(Guid requestId, VerifyGroupRequestDto dto)
        {
            var req = await _db.GroupRequests.FindAsync(requestId);
            if (req == null)
            {
                return (false, "Group request not found.");
            }

            if (dto.Action != "approve" && dto.Action != "reject")
            {
                return (false, "Action must be 'approve' or 'reject'.");
            }

            req.Status = dto.Action == "approve" ? GroupRequestStatus.Approved : GroupRequestStatus.Rejected;

            if (dto.Action == "approve")
            {
                var existing = await _db.Memberships.AnyAsync(m => m.UserId == req.UserId && m.GroupId == req.GroupId);
                if (!existing)
                {
                    _db.Memberships.Add(new Membership
                    {
                        UserId = req.UserId,
                        GroupId = req.GroupId,
                        JoinedAt = DateTime.UtcNow
                    });
                }
            }

            var notification = new Notification
            {
                UserId = req.UserId,
                Title = dto.Action == "approve" ? "Group Join Request Approved!" : "Group Join Request Rejected",
                Text = dto.Action == "approve"
                    ? $"You have been added to the \"{req.GroupName}\" group chat."
                    : $"Your request to join \"{req.GroupName}\" was declined by administrator.",
                Link = "/groups",
                Read = false,
                CreatedAt = DateTime.UtcNow
            };
            _db.Notifications.Add(notification);

            await _db.SaveChangesAsync();
            return (true, string.Empty);
        }

        public async Task<(bool Success, string Error, object? Users)> GetAllUsersAsync()
        {
            var users = await _db.Users
                .Select(u => new
                {
                    u.Id,
                    fullName = u.FullName,
                    u.Email,
                    role = u.Role.ToString().ToLower(),
                    u.Nationality,
                    u.UniversityName,
                    u.IsVerified,
                    u.CreatedAt,
                    graduationDate = u.GraduationDate
                })
                .ToListAsync();

            return (true, string.Empty, users);
        }

        public async Task<(bool Success, string Error, object? Stats)> GetAdminStatsAsync()
        {
            var totalUsers = await _db.Users.CountAsync();
            var verifiedStudents = await _db.Users.CountAsync(u => u.Role == UserRole.Student && u.IsVerified);
            var pendingDocs = await _db.Documents.CountAsync(d => d.Status == DocumentStatus.Pending);
            var totalBookings = await _db.Bookings.CountAsync();

            var stats = new
            {
                totalUsers,
                students = verifiedStudents,
                verified = verifiedStudents,
                pendingDocs,
                totalBookings
            };

            return (true, string.Empty, stats);
        }

        public async Task<(bool Success, string Error, object? University)> AddUniversityAsync(AddUniversityDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name)) return (false, "University name is required.", null);
            if (string.IsNullOrWhiteSpace(dto.City)) return (false, "City is required.", null);

            var university = new University
            {
                Name = dto.Name.Trim(),
                City = dto.City.Trim(),
                Logo = string.IsNullOrWhiteSpace(dto.Logo) ? "/img/universities/default.png" : dto.Logo.Trim(),
                Image = string.IsNullOrWhiteSpace(dto.Image) ? "/img/universities/default_building.jpg" : dto.Image.Trim(),
                Description = dto.Description?.Trim() ?? string.Empty,
                Programs = new List<Program>()
            };

            _db.Universities.Add(university);
            await _db.SaveChangesAsync();

            // Auto-create a university chat group for this university
            var shortName = university.Name.Split(' ')[0];
            var uniGroup = new Group
            {
                Name = $"University chat ({shortName})",
                Flag = "building",
                Description = $"Official group chat for students of {university.Name}.",
                GroupType = GroupType.University,
                UniversityId = university.Id
            };
            _db.Groups.Add(uniGroup);
            await _db.SaveChangesAsync();

            return (true, string.Empty, university);
        }

        public async Task<(bool Success, string Error, object? Program)> AddProgramAsync(Guid universityId, AddProgramDto dto)
        {
            var university = await _db.Universities.Include(u => u.Programs).FirstOrDefaultAsync(u => u.Id == universityId);
            if (university == null) return (false, "University not found.", null);

            if (string.IsNullOrWhiteSpace(dto.Code)) return (false, "Program code is required.", null);
            if (string.IsNullOrWhiteSpace(dto.Name)) return (false, "Program name is required.", null);

            var program = new Program
            {
                Code = dto.Code.Trim(),
                Name = dto.Name.Trim(),
                CostRUB = dto.CostRUB,
                Duration = dto.Duration?.Trim() ?? "4 years",
                Level = dto.Level?.Trim() ?? "Bachelor",
                Language = dto.Language?.Trim() ?? "Russian",
                Description = dto.Description?.Trim() ?? string.Empty,
                Subjects = dto.Subjects ?? new List<string>(),
                Careers = dto.Careers ?? new List<string>(),
                UniversityId = universityId
            };

            _db.Programs.Add(program);
            await _db.SaveChangesAsync();

            return (true, string.Empty, program);
        }

        public async Task<(bool Success, string Error, object? Group)> AddGroupAsync(AddGroupDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name)) return (false, "Group name is required.", null);

            var type = GroupType.General;
            if (dto.IsUniversityGroup) type = GroupType.University;
            else if (dto.IsCountryGroup) type = GroupType.Country;

            var group = new Group
            {
                Name = dto.Name.Trim(),
                Flag = string.IsNullOrWhiteSpace(dto.Flag) ? "globe" : dto.Flag.Trim(),
                Description = dto.Description?.Trim() ?? string.Empty,
                CountryCode = dto.CountryCode?.Trim() ?? null,
                GroupType = type,
                UniversityId = dto.UniversityId
            };

            _db.Groups.Add(group);
            await _db.SaveChangesAsync();

            return (true, string.Empty, group);
        }

        public async Task<(bool Success, string Error, object? Country)> AddCountryAsync(AddCountryDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Code)) return (false, "Country code is required.", null);
            if (string.IsNullOrWhiteSpace(dto.Name)) return (false, "Country name is required.", null);

            var codeUpper = dto.Code.Trim().ToUpper();
            var existing = await _db.Countries.FindAsync(codeUpper);
            if (existing != null) return (false, "Country with this code already exists.", null);

            var country = new Country
            {
                Code = codeUpper,
                Name = dto.Name.Trim(),
                Icon = string.IsNullOrWhiteSpace(dto.Icon) ? "flag" : dto.Icon.Trim()
            };

            _db.Countries.Add(country);
            await _db.SaveChangesAsync();

            // Auto-create a country chat group for this country
            var countryGroup = new Group
            {
                Name = $"{country.Name} Students in Russia",
                Flag = "flag",
                Description = $"Verified community for {country.Name} students studying in Russia.",
                GroupType = GroupType.Country,
                CountryCode = country.Code
            };
            _db.Groups.Add(countryGroup);
            await _db.SaveChangesAsync();

            return (true, string.Empty, country);
        }

        public async Task<(bool Success, string Error, object? ServiceType)> AddServiceTypeAsync(AddServiceTypeDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Id)) return (false, "Service ID is required.", null);
            if (string.IsNullOrWhiteSpace(dto.Name)) return (false, "Service name is required.", null);

            var existing = await _db.ServiceTypes.FindAsync(dto.Id);
            if (existing != null) return (false, "Service Type with this ID already exists.", null);

            var serviceType = new ServiceType
            {
                Id = dto.Id.Trim(),
                Name = dto.Name.Trim(),
                Icon = string.IsNullOrWhiteSpace(dto.Icon) ? "document" : dto.Icon.Trim(),
                Price = dto.Price,
                HasCity = dto.HasCity,
                HasUniversity = dto.HasUniversity,
                Description = dto.Description?.Trim() ?? string.Empty,
                FirstFree = dto.FirstFree
            };

            _db.ServiceTypes.Add(serviceType);
            await _db.SaveChangesAsync();

            return (true, string.Empty, serviceType);
        }

        public async Task<(bool Success, string Error)> DeductUserMPAsync(Guid userId, DeductMPDto dto)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return (false, "User not found.");

            if (dto.Amount <= 0) return (false, "Amount must be greater than zero.");

            int deducted = Math.Min(user.BalanceMP, dto.Amount);
            user.BalanceMP -= deducted;

            // Log negative WalletTransaction
            _db.WalletTransactions.Add(new WalletTransaction
            {
                UserId = user.Id,
                Type = TransactionType.Redeem,
                AmountUSD = 0,
                AmountMP = -deducted,
                Description = $"Admin reduction for bad behavior: {dto.Reason}",
                CreatedAt = DateTime.UtcNow
            });

            // Create notification for user
            var notification = new Notification
            {
                UserId = user.Id,
                Title = "MP Points Deducted",
                Text = $"An administrator has deducted {deducted} MP points from your balance due to bad behavior. Reason: {dto.Reason}",
                Link = "/wallet",
                Read = false,
                CreatedAt = DateTime.UtcNow
            };
            _db.Notifications.Add(notification);

            // Queue background email alerting them
            var backgroundEmail = new BackgroundEmail
            {
                ToEmail = user.Email,
                Subject = "Notification: MP Points Deducted",
                Body = $"Hello {user.FullName},\n\nThis is to notify you that an administrator has deducted {deducted} MP points from your account due to bad behavior.\n\nReason: {dto.Reason}\n\nRegards,\nUniConnect Admin Team",
                Sent = false,
                CreatedAt = DateTime.UtcNow,
                AttachmentsJson = "[]"
            };
            _db.BackgroundEmails.Add(backgroundEmail);

            await _db.SaveChangesAsync();

            return (true, string.Empty);
        }

        public async Task<(bool Success, string Error)> AddUserMPAsync(Guid userId, AddMPDto dto)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return (false, "User not found.");

            if (dto.Amount <= 0) return (false, "Amount must be greater than zero.");

            user.BalanceMP += dto.Amount;

            // Log positive WalletTransaction
            _db.WalletTransactions.Add(new WalletTransaction
            {
                UserId = user.Id,
                Type = TransactionType.MpBuy,
                AmountUSD = 0,
                AmountMP = dto.Amount,
                Description = $"Admin reward / addition: {dto.Reason}",
                CreatedAt = DateTime.UtcNow
            });

            // Create notification for user
            var notification = new Notification
            {
                UserId = user.Id,
                Title = "MP Points Received",
                Text = $"An administrator has added {dto.Amount} MP points to your balance. Reason: {dto.Reason}",
                Link = "/wallet",
                Read = false,
                CreatedAt = DateTime.UtcNow
            };
            _db.Notifications.Add(notification);

            // Queue background email alerting them
            var backgroundEmail = new BackgroundEmail
            {
                ToEmail = user.Email,
                Subject = "Notification: MP Points Received",
                Body = $"Hello {user.FullName},\n\nThis is to notify you that an administrator has credited {dto.Amount} MP points to your account.\n\nReason: {dto.Reason}\n\nRegards,\nUniConnect Admin Team",
                Sent = false,
                CreatedAt = DateTime.UtcNow,
                AttachmentsJson = "[]"
            };
            _db.BackgroundEmails.Add(backgroundEmail);

            await _db.SaveChangesAsync();

            return (true, string.Empty);
        }

        private async Task UpdateUserStatusAfterDocChangeAsync(User user)
        {
            var docs = await _db.Documents.Where(d => d.UserId == user.Id).ToListAsync();
            var hasApprovedPassport = docs.Any(d => d.Type == DocumentType.PassportId && d.Status == DocumentStatus.Approved);
            var hasApprovedAvatar = docs.Any(d => d.Type == DocumentType.ProfilePicture && d.Status == DocumentStatus.Approved);
            var hasApprovedStudentCard = docs.Any(d => d.Type == DocumentType.StudentCard && d.Status == DocumentStatus.Approved);

            if (user.Role == UserRole.Representative || user.Role == UserRole.Admin)
            {
                user.IsVerified = true;
                user.VerificationStatus = UserVerificationStatus.Verified;
                return;
            }

            if (hasApprovedStudentCard && hasApprovedPassport && hasApprovedAvatar)
            {
                user.Role = UserRole.Student;
                if (user.PendingUniversityId.HasValue)
                {
                    var oldUniId = user.UniversityId;
                    var newUniId = user.PendingUniversityId.Value;
                    var newUni = await _db.Universities.FindAsync(newUniId);
                    if (newUni != null)
                    {
                        user.UniversityId = newUniId;
                        user.UniversityName = newUni.Name;
                    }
                    user.PendingUniversityId = null;

                    // Transition groups
                    if (oldUniId.HasValue && oldUniId.Value != newUniId)
                    {
                        var oldGroup = await _db.Groups.FirstOrDefaultAsync(g => g.GroupType == GroupType.University && g.UniversityId == oldUniId.Value);
                        if (oldGroup != null)
                        {
                            var oldMem = await _db.Memberships.FirstOrDefaultAsync(m => m.UserId == user.Id && m.GroupId == oldGroup.Id);
                            if (oldMem != null) _db.Memberships.Remove(oldMem);
                        }
                    }
                    if (user.UniversityId.HasValue)
                    {
                        var newGroup = await _db.Groups.FirstOrDefaultAsync(g => g.GroupType == GroupType.University && g.UniversityId == user.UniversityId.Value);
                        if (newGroup != null)
                        {
                            var hasNewMem = await _db.Memberships.AnyAsync(m => m.UserId == user.Id && m.GroupId == newGroup.Id);
                            if (!hasNewMem)
                            {
                                _db.Memberships.Add(new Membership { UserId = user.Id, GroupId = newGroup.Id, JoinedAt = DateTime.UtcNow });
                            }
                        }
                    }
                }
                user.IsVerified = true;
                user.VerificationStatus = UserVerificationStatus.Verified;
            }
            else if (hasApprovedPassport && hasApprovedAvatar)
            {
                var hasPendingStudentCard = docs.Any(d => d.Type == DocumentType.StudentCard && d.Status == DocumentStatus.Pending);
                if (hasPendingStudentCard)
                {
                    user.VerificationStatus = UserVerificationStatus.Pending;
                }
                else
                {
                    user.VerificationStatus = UserVerificationStatus.Verified;
                }
                user.IsVerified = true;
            }
            else
            {
                var hasPendingAny = docs.Any(d => d.Status == DocumentStatus.Pending);
                user.VerificationStatus = hasPendingAny ? UserVerificationStatus.Pending : UserVerificationStatus.None;
                user.IsVerified = false;
            }

            // Join country & global groups when verified as applicant or student
            if (user.IsVerified && (user.Role == UserRole.Applicant || user.Role == UserRole.Student))
            {
                var countryGroup = await _db.Groups.FirstOrDefaultAsync(g => g.GroupType == GroupType.Country && g.CountryCode == user.Nationality);
                if (countryGroup == null && !string.IsNullOrEmpty(user.Nationality))
                {
                    var countryInfo = await _db.Countries.FirstOrDefaultAsync(c => c.Name == user.Nationality || c.Code == user.Nationality);
                    if (countryInfo != null)
                    {
                        countryGroup = await _db.Groups.FirstOrDefaultAsync(g => g.GroupType == GroupType.Country && g.CountryCode == countryInfo.Code);
                    }
                }

                if (countryGroup != null)
                {
                    var existingCountryMem = await _db.Memberships.AnyAsync(m => m.UserId == user.Id && m.GroupId == countryGroup.Id);
                    if (!existingCountryMem)
                    {
                        _db.Memberships.Add(new Membership { UserId = user.Id, GroupId = countryGroup.Id, JoinedAt = DateTime.UtcNow });
                    }
                }

                var globalGroup = await _db.Groups.FirstOrDefaultAsync(g => g.CountryCode == "ALL");
                if (globalGroup != null)
                {
                    var existingGlobalMem = await _db.Memberships.AnyAsync(m => m.UserId == user.Id && m.GroupId == globalGroup.Id);
                    if (!existingGlobalMem)
                    {
                        _db.Memberships.Add(new Membership { UserId = user.Id, GroupId = globalGroup.Id, JoinedAt = DateTime.UtcNow });
                    }
                }
            }
        }

        public async Task<(bool Success, string Error)> ModerateUserAsync(Guid userId, string action)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user == null)
            {
                return (false, "User not found.");
            }

            if (user.Role == UserRole.Admin)
            {
                return (false, "Cannot moderate an administrator account.");
            }

            switch (action.ToLower().Trim())
            {
                case "mute":
                    user.IsMuted = true;
                    break;
                case "unmute":
                    user.IsMuted = false;
                    break;
                case "ban":
                    user.IsBanned = true;
                    break;
                case "unban":
                    user.IsBanned = false;
                    break;
                case "promote":
                    if (user.Role != UserRole.Student)
                    {
                        return (false, "Only students can be promoted to moderators.");
                    }
                    user.Role = UserRole.Moderator;
                    break;
                case "demote":
                    user.Role = UserRole.Student; // default demoted role
                    break;
                default:
                    return (false, $"Unknown action: {action}");
            }

            await _db.SaveChangesAsync();
            return (true, string.Empty);
        }

        public async Task<(bool Success, string Error, object? Reports)> GetPendingReportsAsync()
        {
            var reports = await _db.ReportedMessages
                .Where(r => r.Status == "pending")
                .OrderByDescending(r => r.ReportedAt)
                .ToListAsync();

            return (true, string.Empty, reports);
        }

        public async Task<(bool Success, string Error)> ResolveReportAsync(Guid reportId, string action)
        {
            var report = await _db.ReportedMessages.FindAsync(reportId);
            if (report == null)
            {
                return (false, "Report not found.");
            }

            if (report.Status != "pending")
            {
                return (false, "Report has already been resolved.");
            }

            action = action.ToLower().Trim();

            if (action == "dismiss")
            {
                report.Status = "dismissed";
            }
            else if (action == "delete_message")
            {
                if (report.ChatType == "group")
                {
                    var msg = await _db.GroupMessages.FindAsync(report.MessageId);
                    if (msg != null) msg.IsDeleted = true;
                }
                else
                {
                    var msg = await _db.PrivateMessages.FindAsync(report.MessageId);
                    if (msg != null) msg.IsDeleted = true;
                }
                report.Status = "resolved_deleted";
            }
            else if (action == "mute_sender")
            {
                var sender = await _db.Users.FindAsync(report.SenderId);
                if (sender != null) sender.IsMuted = true;
                report.Status = "resolved_muted";
            }
            else if (action == "ban_sender")
            {
                var sender = await _db.Users.FindAsync(report.SenderId);
                if (sender != null) sender.IsBanned = true;
                report.Status = "resolved_banned";
            }
            else
            {
                return (false, $"Invalid report resolution action: {action}");
            }

            await _db.SaveChangesAsync();
            return (true, string.Empty);
        }
    }
}
