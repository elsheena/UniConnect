using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Services.Core.DTOs;
using Services.Core.Interfaces;
using Services.DataAccess;
using Core.Models;
using Core.Enums.Application;
using Core.Enums.User;
using Shared.Core.Interfaces;

namespace Services.BLL.Services
{
    public class UniversityService : IUniversityService
    {
        private readonly ServicesDbContext _db;
        private readonly IEmailService _emailService;

        public UniversityService(ServicesDbContext db, IEmailService emailService)
        {
            _db = db;
            _emailService = emailService;
        }

        public object GetServiceTypes()
        {
            return _db.ServiceTypes.ToList();
        }

        public object GetUniversities()
        {
            return _db.Universities.Include(u => u.Programs).ToList();
        }

        public object GetUniversityById(Guid id)
        {
            var uni = _db.Universities.Include(u => u.Programs).FirstOrDefault(u => u.Id == id);
            if (uni == null) return null!;

            var serviceIds = new List<string> { "student_consultation", "representative_call", "scholarship_guidance" };
            var services = _db.ServiceTypes.Where(s => serviceIds.Contains(s.Id)).ToList();

            return new { university = uni, services };
        }

        public object GetCountries()
        {
            return _db.Countries.ToList();
        }

        public async Task<(bool Success, string Error, object? Data)> ApplyToUniversityAsync(Guid universityId, Guid userId, ApplyDto dto)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user == null)
            {
                return (false, "User not found.", null);
            }

            var uni = await _db.Universities.Include(u => u.Programs).FirstOrDefaultAsync(u => u.Id == universityId);
            if (uni == null)
            {
                return (false, "University not found.", null);
            }

            if (string.IsNullOrEmpty(dto.ProgramCode))
            {
                return (false, "Program code is required.", null);
            }

            var program = uni.Programs.FirstOrDefault(p => p.Code == dto.ProgramCode);
            if (program == null)
            {
                return (false, "Program not found.", null);
            }

            var alreadyApplied = await _db.Applications.AnyAsync(a => a.UserId == userId && a.UniversityId == universityId);
            if (alreadyApplied)
            {
                return (false, "You have already applied to this university.", null);
            }

            var rep = await _db.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Representative && u.UniversityId == universityId);
            if (rep == null)
            {
                return (false, "No university representative found at this time.", null);
            }

            var application = new Application
            {
                UserId = userId,
                UniversityId = universityId,
                UniversityName = uni.Name,
                ProgramCode = dto.ProgramCode,
                ProgramName = program.Name,
                Status = ApplicationStatus.Pending,
                AppliedAt = DateTime.UtcNow
            };

            _db.Applications.Add(application);
            await _db.SaveChangesAsync();

            var chat = await _db.PrivateChats.FirstOrDefaultAsync(c =>
                (c.StudentId == rep.Id && c.ApplicantId == userId) ||
                (c.StudentId == userId && c.ApplicantId == rep.Id)
            );

            if (chat == null)
            {
                chat = new PrivateChat
                {
                    StudentId = rep.Id,
                    ApplicantId = userId,
                    CreatedAt = DateTime.UtcNow,
                    IsApplicationChat = true,
                    UniversityId = universityId
                };
                _db.PrivateChats.Add(chat);
                await _db.SaveChangesAsync();
            }

            var autoMsg = new PrivateMessage
            {
                ChatId = chat.Id,
                SenderId = userId,
                SenderName = user.FullName,
                Text = $"Hello! I have just applied to the \"{program.Name}\" program ({dto.ProgramCode}). I look forward to hearing from you.",
                SentAt = DateTime.UtcNow,
                ReactionsJson = "[]",
                IsEdited = false,
                IsDeleted = false
            };
            _db.PrivateMessages.Add(autoMsg);
            await _db.SaveChangesAsync();

            // Email delivery
            var userDocs = await _db.Documents.Where(d => d.UserId == userId).ToListAsync();

            var attachments = new List<(string FilePath, string OriginalName)>();
            foreach (var doc in userDocs)
            {
                attachments.Add((doc.Filename, doc.OriginalName));
            }

            await _emailService.SendApplicationEmailAsync(
                user.FullName,
                user.Email,
                user.Nationality ?? "Unknown",
                uni.Name,
                program.Name,
                dto.ProgramCode,
                attachments
            );

            // Create notification for applicant (will trigger automatic email notification)
            var applicantNotification = new Notification
            {
                UserId = userId,
                Title = "Application Submitted",
                Text = $"Your application for the program \"{program.Name}\" ({dto.ProgramCode}) at {uni.Name} has been submitted successfully.",
                Link = "/profile",
                Read = false,
                CreatedAt = DateTime.UtcNow
            };
            _db.Notifications.Add(applicantNotification);

            await _db.SaveChangesAsync();

            var responseData = new ApplicationResultDto(application.Id, chat.Id);
            return (true, string.Empty, responseData);
        }
    }
}
