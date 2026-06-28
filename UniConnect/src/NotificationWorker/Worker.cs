using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Admin.DataAccess.Data;
using Core.Models;
using Shared.Core.Interfaces;

namespace NotificationWorker
{
    public class Worker : BackgroundService
    {
        private readonly ILogger<Worker> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IConfiguration _config;
        private readonly IEmailSender _emailSender;

        public Worker(ILogger<Worker> logger, IServiceScopeFactory scopeFactory, IConfiguration config, IEmailSender emailSender)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
            _config = config;
            _emailSender = emailSender;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("NotificationWorker started successfully.");
            while (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogInformation("NotificationWorker polling background email and audit queues...");
                try
                {
                    await ProcessBackgroundEmailsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing background emails.");
                }
                await Task.Delay(2000, stoppingToken);
            }
        }

        private async Task ProcessBackgroundEmailsAsync(CancellationToken stoppingToken)
        {
            using (var scope = _scopeFactory.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
                try
                {
                    await db.Database.EnsureCreatedAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Database initialization checked; tables may already exist.");
                }
                
                var unsentEmails = await db.BackgroundEmails
                     .Where(e => !e.Sent)
                     .OrderBy(e => e.CreatedAt)
                     .Take(10)
                     .ToListAsync(stoppingToken);

                if (!unsentEmails.Any()) return;

                foreach (var email in unsentEmails)
                {
                    _logger.LogInformation("Processing background email ID {EmailId} for {Recipient}...", email.Id, email.ToEmail);
                    var attachments = new List<(string FilePath, string OriginalName)>();
                    var tempFiles = new List<string>();
                    try
                    {
                        if (!string.IsNullOrEmpty(email.AttachmentsJson) && email.AttachmentsJson != "[]")
                        {
                            try
                            {
                                var attachmentInfos = JsonSerializer.Deserialize<List<AttachmentInfo>>(email.AttachmentsJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                                if (attachmentInfos != null)
                                {
                                    foreach (var att in attachmentInfos)
                                    {
                                        var storedFile = await db.StoredFiles.FirstOrDefaultAsync(sf => sf.Filename == att.FilePath, stoppingToken);
                                        if (storedFile != null)
                                        {
                                            var tempPath = Path.Combine(Path.GetTempPath(), storedFile.Filename);
                                            await File.WriteAllBytesAsync(tempPath, storedFile.Content, stoppingToken);
                                            attachments.Add((tempPath, att.OriginalName));
                                            tempFiles.Add(tempPath);
                                        }
                                        else
                                        {
                                            _logger.LogWarning("Attachment file {Filename} not found in database for email {EmailId}.", att.FilePath, email.Id);
                                        }
                                    }
                                }
                            }
                            catch (Exception jsonEx)
                            {
                                _logger.LogError(jsonEx, "Failed to deserialize attachments JSON for email {EmailId}", email.Id);
                            }
                        }

                        await _emailSender.SendEmailAsync(email.ToEmail, email.Subject, email.Body, attachments);
                        
                        email.Sent = true;
                        db.BackgroundEmails.Update(email);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send email {EmailId}.", email.Id);
                    }
                    finally
                    {
                        foreach (var tempFile in tempFiles)
                        {
                            try
                            {
                                if (File.Exists(tempFile))
                                {
                                    File.Delete(tempFile);
                                    _logger.LogInformation("Cleaned up temporary email attachment: {FilePath}", tempFile);
                                }
                            }
                            catch (Exception cleanEx)
                            {
                                _logger.LogWarning(cleanEx, "Failed to delete temporary email attachment: {FilePath}", tempFile);
                            }
                        }
                    }
                }
                await db.SaveChangesAsync(stoppingToken);
            }
        }

        private class AttachmentInfo
        {
            public string FilePath { get; set; } = string.Empty;
            public string OriginalName { get; set; } = string.Empty;
        }
    }
}
