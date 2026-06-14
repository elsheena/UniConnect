using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Shared.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Admin.BLL.Services
{
    public class MailtrapEmailSender : IEmailSender
    {
        private readonly IConfiguration _config;
        private readonly ILogger<MailtrapEmailSender> _logger;
        private readonly HttpClient _httpClient;

        public MailtrapEmailSender(IConfiguration config, ILogger<MailtrapEmailSender> loggerVal)
        {
            _config = config;
            _logger = loggerVal;
            _httpClient = new HttpClient();
        }

        public async Task SendEmailAsync(string to, string subject, string body, List<(string FilePath, string OriginalName)> attachments)
        {
            var apiToken = _config["MAILTRAP_API_TOKEN"] ?? "b1dbdab3dfefcedee6a2ebfac79d61ce";
            var senderEmail = _config["MAILTRAP_SENDER_EMAIL"] ?? "hello@demomailtrap.co";
            var senderName = _config["MAILTRAP_SENDER_NAME"] ?? "UniConnect";

            _logger.LogInformation("Mailtrap: Sending email to {Recipient} via API...", to);

            var attachmentsList = new List<object>();
            foreach (var att in attachments)
            {
                if (File.Exists(att.FilePath))
                {
                    var bytes = await File.ReadAllBytesAsync(att.FilePath);
                    var base64 = Convert.ToBase64String(bytes);
                    var ext = Path.GetExtension(att.FilePath).ToLowerInvariant();
                    var mimeType = ext switch
                    {
                        ".pdf" => "application/pdf",
                        ".jpg" => "image/jpeg",
                        ".jpeg" => "image/jpeg",
                        ".png" => "image/png",
                        ".txt" => "text/plain",
                        _ => "application/octet-stream"
                    };

                    attachmentsList.Add(new
                    {
                        content = base64,
                        filename = att.OriginalName,
                        type = mimeType,
                        disposition = "attachment"
                    });
                    _logger.LogInformation("Mailtrap: Encoded attachment {OriginalName}", att.OriginalName);
                }
                else
                {
                    _logger.LogWarning("Mailtrap: Attachment file not found: {FilePath}", att.FilePath);
                }
            }

            var payload = new
            {
                from = new { email = senderEmail, name = senderName },
                to = new[] { new { email = to } },
                subject = subject,
                text = body,
                attachments = attachmentsList.Count > 0 ? attachmentsList : null
            };

            var jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
            };
            var jsonPayload = JsonSerializer.Serialize(payload, jsonOptions);

            using (var request = new HttpRequestMessage(HttpMethod.Post, "https://send.api.mailtrap.io/api/send"))
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);
                request.Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                var response = await _httpClient.SendAsync(request);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Mailtrap: Failed to send email. Status Code: {StatusCode}, Response: {Response}", response.StatusCode, responseContent);
                    throw new Exception($"Mailtrap send failed: {response.StatusCode} - {responseContent}");
                }

                _logger.LogInformation("Mailtrap: Email successfully sent to {Recipient}. Response: {Response}", to, responseContent);
            }
        }
    }
}
