using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Shared.Core.Interfaces;
using Core.Models;
using Services.DataAccess;

namespace Services.BLL.Services
{
    public class ServicesEmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ServicesDbContext _db;

        public ServicesEmailService(IConfiguration config, ServicesDbContext db)
        {
            _config = config;
            _db = db;
        }

        public async Task SendApplicationEmailAsync(string applicantName, string applicantEmail, string applicantNationality, string universityName, string programName, string programCode, List<(string FilePath, string OriginalName)> attachments)
        {
            try
            {
                var attachmentsList = attachments.Select(a => new { filePath = a.FilePath, originalName = a.OriginalName }).ToList();
                var attachmentsJson = JsonSerializer.Serialize(attachmentsList);

                var toEmail = _config["RECIPIENT_EMAIL"] ?? "mina@mikhaeil.ru";

                var backgroundEmail = new BackgroundEmail
                {
                    ToEmail = toEmail,
                    Subject = $"New University Application - {universityName} - {applicantName}",
                    Body = $"Hello,\n\nAn applicant wants to study at your university.\n\nApplicant Details:\nName: {applicantName}\nEmail: {applicantEmail}\nNationality: {applicantNationality}\nProgram: {programName} ({programCode})\nPlease find the applicant's verification documents attached.",
                    Sent = false,
                    CreatedAt = DateTime.UtcNow,
                    AttachmentsJson = attachmentsJson
                };

                _db.BackgroundEmails.Add(backgroundEmail);
                await _db.SaveChangesAsync();

                Console.WriteLine($"[ServicesEmailService] Queued background application email for applicant {applicantName}");
            }
            catch (Exception ex)
            {
                Console.WriteLine("[ServicesEmailService] Error: Failed to queue email: " + ex.Message);
            }
        }
    }
}
