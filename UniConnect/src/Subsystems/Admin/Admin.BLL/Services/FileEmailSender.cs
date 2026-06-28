using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Shared.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace Admin.BLL.Services
{
    public class FileEmailSender : IEmailSender
    {
        private readonly ILogger<FileEmailSender> _logger;

        public FileEmailSender(ILogger<FileEmailSender> loggerVal)
        {
            _logger = loggerVal;
        }

        public async Task SendEmailAsync(string to, string subject, string body, List<(string FilePath, string OriginalName)> attachments)
        {
            var fileName = $"email_{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Guid.NewGuid().ToString().Substring(0, 8)}.html";
            
            // Attempt to resolve ApiGateway's wwwroot folder
            var baseDir = AppContext.BaseDirectory;
            var pathCandidates = new[]
            {
                Path.Combine(baseDir, "..", "..", "..", "..", "ApiGateway", "wwwroot", "html", "sent_emails"),
                Path.Combine(baseDir, "..", "..", "ApiGateway", "wwwroot", "html", "sent_emails"),
                Path.Combine(baseDir, "..", "ApiGateway", "wwwroot", "html", "sent_emails"),
                Path.Combine(baseDir, "wwwroot", "html", "sent_emails"),
                Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "html", "sent_emails"),
                Path.Combine(Directory.GetCurrentDirectory(), "..", "ApiGateway", "wwwroot", "html", "sent_emails")
            };

            string targetDir = string.Empty;
            foreach (var candidate in pathCandidates)
            {
                try
                {
                    var fullCandidate = Path.GetFullPath(candidate);
                    var parentDir = Path.GetDirectoryName(fullCandidate);
                    if (parentDir != null && Directory.Exists(parentDir))
                    {
                        targetDir = fullCandidate;
                        break;
                    }
                }
                catch
                {
                    // Ignore resolution errors
                }
            }

            if (string.IsNullOrEmpty(targetDir))
            {
                targetDir = Path.Combine(Directory.GetCurrentDirectory(), "sent_emails");
            }

            Directory.CreateDirectory(targetDir);
            var filePath = Path.Combine(targetDir, fileName);

            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html>");
            sb.AppendLine("<html>");
            sb.AppendLine("<head>");
            sb.AppendLine("    <meta charset=\"utf-8\">");
            sb.AppendLine("    <title>Simulated Email</title>");
            sb.AppendLine("    <style>");
            sb.AppendLine("        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background-color: #0f172a; color: #cbd5e1; margin: 0; }");
            sb.AppendLine("        .email-container { max-width: 650px; margin: 30px auto; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); padding: 30px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); backdrop-filter: blur(10px); }");
            sb.AppendLine("        .header { border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 15px; margin-bottom: 20px; }");
            sb.AppendLine("        .header h3 { margin: 0 0 15px 0; color: #38bdf8; font-size: 1.3em; letter-spacing: 0.5px; text-transform: uppercase; }");
            sb.AppendLine("        .meta-row { margin: 8px 0; font-size: 0.95em; }");
            sb.AppendLine("        .label { font-weight: 600; color: #94a3b8; display: inline-block; width: 90px; }");
            sb.AppendLine("        .body-content { line-height: 1.7; white-space: pre-wrap; margin-bottom: 25px; color: #e2e8f0; font-size: 1.05em; background: rgba(15, 23, 42, 0.4); padding: 20px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05); }");
            sb.AppendLine("        .attachments { border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 20px; }");
            sb.AppendLine("        .attachments h4 { margin: 0 0 10px 0; color: #38bdf8; font-size: 1em; }");
            sb.AppendLine("        .attachment-item { background: rgba(51, 65, 85, 0.5); padding: 10px 14px; margin: 6px 0; border-radius: 6px; font-size: 0.9em; display: flex; align-items: center; justify-content: space-between; border: 1px solid rgba(255, 255, 255, 0.05); }");
            sb.AppendLine("        .attachment-name { color: #f1f5f9; font-weight: 500; }");
            sb.AppendLine("        .attachment-path { color: #64748b; font-size: 0.8em; margin-left: 10px; }");
            sb.AppendLine("    </style>");
            sb.AppendLine("</head>");
            sb.AppendLine("<body>");
            sb.AppendLine("    <div class=\"email-container\">");
            sb.AppendLine("        <div class=\"header\">");
            sb.AppendLine("            <h3>[Simulated Email Dispatch]</h3>");
            sb.AppendLine($"            <div class=\"meta-row\"><span class=\"label\">To:</span> {to}</div>");
            sb.AppendLine($"            <div class=\"meta-row\"><span class=\"label\">Subject:</span> {subject}</div>");
            sb.AppendLine($"            <div class=\"meta-row\"><span class=\"label\">Sent At:</span> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</div>");
            sb.AppendLine("        </div>");
            sb.AppendLine($"        <div class=\"body-content\">{body}</div>");

            if (attachments != null && attachments.Count > 0)
            {
                sb.AppendLine("        <div class=\"attachments\">");
                sb.AppendLine("            <h4>Attachments ({0})</h4>".Replace("{0}", attachments.Count.ToString()));
                foreach (var att in attachments)
                {
                    sb.AppendLine("            <div class=\"attachment-item\">");
                    sb.AppendLine($"                <span class=\"attachment-name\">[Attachment] {att.OriginalName}</span>");
                    sb.AppendLine($"                <span class=\"attachment-path\">Path: {att.FilePath}</span>");
                    sb.AppendLine("            </div>");
                }
                sb.AppendLine("        </div>");
            }

            sb.AppendLine("    </div>");
            sb.AppendLine("</body>");
            sb.AppendLine("</html>");

            await File.WriteAllTextAsync(filePath, sb.ToString(), Encoding.UTF8);

            var relativePath = "";
            if (targetDir.Contains("wwwroot"))
            {
                var idx = targetDir.IndexOf("wwwroot");
                relativePath = targetDir.Substring(idx + 7).Replace("\\", "/");
                if (!relativePath.StartsWith("/")) relativePath = "/" + relativePath;
                if (!relativePath.EndsWith("/")) relativePath += "/";
                _logger.LogInformation("EMAIL SIMULATED: Simulated email written to file {FilePath}. View in browser: http://localhost:3000{RelativePath}{FileName}", filePath, relativePath, fileName);
            }
            else
            {
                _logger.LogInformation("EMAIL SIMULATED: Simulated email written to file {FilePath}.", filePath);
            }
        }
    }
}
