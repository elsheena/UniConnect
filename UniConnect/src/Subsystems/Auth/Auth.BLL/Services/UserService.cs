using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Auth.Core.DTOs;
using Auth.Core.Interfaces;
using Auth.DataAccess;
using Core.Models;
using Core.Enums.Document;
using Core.Enums.User;
using Core.Enums.Group;

namespace Auth.BLL.Services
{
    public class UserService : IUserService
    {
        private readonly AuthDbContext _db;

        public UserService(AuthDbContext db)
        {
            _db = db;
        }

        public async Task<(bool Success, string Error, object? UserData)> GetUserProfileAsync(Guid id)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null)
            {
                return (false, "User not found.", null);
            }

            var groups = await _db.Memberships
                .Where(m => m.UserId == user.Id)
                .Select(m => new { m.Group!.Id, m.Group!.Name, m.Group!.Flag })
                .ToListAsync();

            var userData = new
            {
                user.Id,
                fullName = user.FullName,
                user.Email,
                role = user.Role.ToString().ToLower(),
                phoneNumber = user.PhoneNumber,
                user.Nationality,
                universityId = user.UniversityId,
                universityName = user.UniversityName,
                avatarUrl = user.AvatarUrl,
                avatarStatus = user.AvatarStatus.ToString().ToLower(),
                isVerified = user.IsVerified,
                verificationStatus = user.VerificationStatus.ToString().ToLower(),
                createdAt = user.CreatedAt,
                groups
            };

            return (true, string.Empty, userData);
        }

        public async Task<(bool Success, string Error, object? UserData, bool VerificationReset)> UpdateUserProfileAsync(Guid id, RegisterDto dto, string currentUserRole, string currentUserIdVal)
        {
            if (currentUserIdVal == null || (!Guid.TryParse(currentUserIdVal, out var currentUserId) || (currentUserId != id && currentUserRole != "admin")))
            {
                return (false, "You can only edit your own profile.", null, false);
            }

            var user = await _db.Users.FindAsync(id);
            if (user == null)
            {
                return (false, "User not found.", null, false);
            }

            if (!string.IsNullOrWhiteSpace(dto.FullName)) user.FullName = dto.FullName;
            if (!string.IsNullOrWhiteSpace(dto.Email))
            {
                var emailExists = await _db.Users.AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower() && u.Id != user.Id);
                if (emailExists)
                {
                    return (false, "Email already exists.", null, false);
                }
                user.Email = dto.Email;
            }

            if (!string.IsNullOrWhiteSpace(dto.Password))
            {
                user.Password = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            }

            if (dto.PhoneNumber != null) user.PhoneNumber = dto.PhoneNumber;

            bool verificationReset = false;
            if (!string.IsNullOrWhiteSpace(dto.Nationality) && dto.Nationality != user.Nationality)
            {
                user.Nationality = dto.Nationality;
                if (user.Role == UserRole.Student)
                {
                    user.IsVerified = false;
                    user.VerificationStatus = UserVerificationStatus.None;
                    verificationReset = true;
                }
            }

            await _db.SaveChangesAsync();

            var safeUser = new
            {
                user.Id,
                fullName = user.FullName,
                user.Email,
                role = user.Role.ToString().ToLower(),
                phoneNumber = user.PhoneNumber,
                user.Nationality,
                universityId = user.UniversityId,
                universityName = user.UniversityName,
                avatarUrl = user.AvatarUrl,
                avatarStatus = user.AvatarStatus.ToString().ToLower(),
                createdAt = user.CreatedAt,
                isVerified = user.IsVerified
            };

            return (true, string.Empty, safeUser, verificationReset);
        }

        public async Task<(bool Success, string Error, object? VerificationData)> GetVerificationStatusAsync(Guid id)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null)
            {
                return (false, "User not found.", null);
            }

            var docs = await _db.Documents.Where(d => d.UserId == id).ToListAsync();
            var latestDoc = docs.OrderByDescending(d => d.UploadedAt).FirstOrDefault();

            var verificationData = new
            {
                isVerified = user.IsVerified,
                documents = docs,
                latestDocument = latestDoc
            };

            return (true, string.Empty, verificationData);
        }

        public async Task<(bool Success, string Error)> UpdateVerificationStatusAsync(Guid id, string action, Guid? pendingUniId = null)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null)
            {
                return (false, "User not found.");
            }

            if (action == "cancel")
            {
                var pendingStudentCard = await _db.Documents.FirstOrDefaultAsync(d => d.UserId == id && d.Type == DocumentType.StudentCard && d.Status == DocumentStatus.Pending);
                if (pendingStudentCard != null)
                {
                    _db.Documents.Remove(pendingStudentCard);
                }
                user.PendingUniversityId = null;

                var userDocs = await _db.Documents.Where(d => d.UserId == id && d.Id != (pendingStudentCard != null ? pendingStudentCard.Id : Guid.Empty)).ToListAsync();
                var hasApprovedPassport = userDocs.Any(d => d.Type == DocumentType.PassportId && d.Status == DocumentStatus.Approved);
                var hasApprovedAvatar = userDocs.Any(d => d.Type == DocumentType.ProfilePicture && d.Status == DocumentStatus.Approved);
                if (hasApprovedPassport && hasApprovedAvatar)
                {
                    user.VerificationStatus = UserVerificationStatus.Verified;
                    user.IsVerified = true;
                }
                else
                {
                    user.VerificationStatus = userDocs.Any(d => d.Status == DocumentStatus.Pending) ? UserVerificationStatus.Pending : UserVerificationStatus.None;
                    user.IsVerified = false;
                }
                await _db.SaveChangesAsync();
                return (true, string.Empty);
            }

            if (action != "pending")
            {
                return (false, "Invalid status");
            }

            if (user.Role == UserRole.Applicant && user.IsVerified && pendingUniId.HasValue)
            {
                // Keep verified status as applicant
            }
            else if (user.Role == UserRole.Student && user.IsVerified && pendingUniId.HasValue)
            {
                // Keep verified status as student
            }
            else
            {
                user.IsVerified = false;
            }

            if (Enum.TryParse<UserVerificationStatus>(action, true, out var status))
            {
                user.VerificationStatus = status;
            }
            else
            {
                user.VerificationStatus = UserVerificationStatus.Pending;
            }

            if (pendingUniId.HasValue)
            {
                user.PendingUniversityId = pendingUniId.Value;
            }

            await _db.SaveChangesAsync();
            return (true, string.Empty);
        }

        public async Task<(bool Success, string Error, object? Stats)> GetDashboardStatsAsync(Guid userId)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user == null)
            {
                return (false, "User not found.", null);
            }

            var pendingRequests = await _db.GroupRequests.CountAsync(r => r.UserId == userId && r.Status == GroupRequestStatus.Pending);
            var appliedCount = await _db.Applications.CountAsync(a => a.UserId == userId);
            var bookingsCount = await _db.Bookings.CountAsync(b => b.BookerId == userId || b.AcceptedBy == userId);

            var stats = new
            {
                appliedUniversities = appliedCount,
                pendingRequests = pendingRequests + bookingsCount,
                balanceUSD = user.BalanceUSD,
                balanceMP = user.BalanceMP
            };

            return (true, string.Empty, stats);
        }
    }
}
