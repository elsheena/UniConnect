using System.Collections.Generic;
using System.Threading.Tasks;

namespace Shared.Core.Interfaces
{
    public interface IEmailSender
    {
        Task SendEmailAsync(string to, string subject, string body, List<(string FilePath, string OriginalName)> attachments);
    }
}
