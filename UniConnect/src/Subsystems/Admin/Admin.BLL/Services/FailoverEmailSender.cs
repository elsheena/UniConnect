using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Shared.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace Admin.BLL.Services
{
    public class FailoverEmailSender : IEmailSender
    {
        private readonly SmtpEmailSender _smtpSender;
        private readonly FileEmailSender _fileSender;
        private readonly ILogger<FailoverEmailSender> _logger;

        public FailoverEmailSender(SmtpEmailSender smtpSender, FileEmailSender fileSender, ILogger<FailoverEmailSender> logger)
        {
            _smtpSender = smtpSender;
            _fileSender = fileSender;
            _logger = logger;
        }

        public async Task SendEmailAsync(string to, string subject, string body, List<(string FilePath, string OriginalName)> attachments)
        {
            try
            {
                _logger.LogInformation("FailoverEmailSender: Attempting email dispatch via SMTP...");
                await _smtpSender.SendEmailAsync(to, subject, body, attachments);
                _logger.LogInformation("FailoverEmailSender: SMTP dispatch successful.");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "FailoverEmailSender: SMTP dispatch failed with error. Falling back to File-based email simulation...");
                try
                {
                    await _fileSender.SendEmailAsync(to, subject, body, attachments);
                    _logger.LogInformation("FailoverEmailSender: Fallback File-based simulation completed successfully.");
                }
                catch (Exception fileEx)
                {
                    _logger.LogError(fileEx, "FailoverEmailSender: Fatal error. Both SMTP and Fallback File-based email dispatch failed.");
                    throw;
                }
            }
        }
    }
}
