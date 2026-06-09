using System.Collections.Generic;
using System.Threading.Tasks;

namespace Shared.Core.Interfaces
{
    public interface IEmailService
    {
        Task SendApplicationEmailAsync(string applicantName, string applicantEmail, string applicantNationality, string universityName, string programName, string programCode, List<(string FilePath, string OriginalName)> attachments);
    }
}
