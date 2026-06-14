using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Shared.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Admin.BLL.Services
{
    public class SmtpEmailSender : IEmailSender
    {
        private readonly IConfiguration _config;
        private readonly ILogger<SmtpEmailSender> _logger;

        public SmtpEmailSender(IConfiguration config, ILogger<SmtpEmailSender> _loggerVal)
        {
            _config = config;
            _logger = _loggerVal;
        }

        public async Task SendEmailAsync(string to, string subject, string body, List<(string FilePath, string OriginalName)> attachments)
        {
            var smtpHost = _config["SMTP_HOST"] ?? "smtp.mail.ru";
            var smtpPortVal = _config["SMTP_PORT"];
            var smtpPort = int.TryParse(smtpPortVal, out var port) ? port : 587;
            var smtpUser = _config["SMTP_USER"] ?? "mina@mikhaeil.ru";
            var smtpPass = _config["SMTP_PASS"];

            _logger.LogInformation("SMTP: Preparing to send email to {Recipient} via {Host}:{Port} using user {User}...", to, smtpHost, smtpPort, smtpUser);

            if (string.IsNullOrEmpty(smtpPass))
            {
                throw new InvalidOperationException("SMTP password is not configured. Cannot send email via SMTP.");
            }

            using (var mail = new MailMessage())
            {
                mail.From = new MailAddress(smtpUser, "UniConnect Notification");
                mail.To.Add(to);
                mail.Subject = subject;
                mail.Body = body;
                mail.IsBodyHtml = false;

                foreach (var att in attachments)
                {
                    if (File.Exists(att.FilePath))
                    {
                        mail.Attachments.Add(new Attachment(att.FilePath)
                        {
                            Name = att.OriginalName
                        });
                        _logger.LogInformation("SMTP: Attached file {OriginalName} ({FilePath})", att.OriginalName, att.FilePath);
                    }
                    else
                    {
                        _logger.LogWarning("SMTP: Attachment file not found: {FilePath}", att.FilePath);
                    }
                }

                using (var smtp = new SmtpClient(smtpHost, smtpPort))
                {
                    smtp.Credentials = new NetworkCredential(smtpUser, smtpPass);
                    smtp.EnableSsl = true;
                    await smtp.SendMailAsync(mail);
                }
            }

            _logger.LogInformation("SMTP: Email successfully sent to {Recipient}.", to);
        }
    }
}
