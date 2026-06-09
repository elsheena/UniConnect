using System;
using System.Threading.Tasks;
using Auth.Core.DTOs;

namespace Auth.Core.Interfaces
{
    public interface IUserService
    {
        Task<(bool Success, string Error, object? UserData)> GetUserProfileAsync(Guid id);
        Task<(bool Success, string Error, object? UserData, bool VerificationReset)> UpdateUserProfileAsync(Guid id, RegisterDto dto, string currentUserRole, string currentUserIdVal);
        Task<(bool Success, string Error, object? VerificationData)> GetVerificationStatusAsync(Guid id);
        Task<(bool Success, string Error)> UpdateVerificationStatusAsync(Guid id, string action, Guid? pendingUniId = null);
        Task<(bool Success, string Error, object? Stats)> GetDashboardStatsAsync(Guid userId);
    }
}
