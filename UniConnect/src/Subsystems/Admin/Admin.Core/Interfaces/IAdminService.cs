using System;
using System.Threading.Tasks;
using Admin.Core.DTOs;

namespace Admin.Core.Interfaces
{
    public interface IAdminService
    {
        Task<(bool Success, string Error, object? Documents)> GetPendingDocumentsAsync();
        Task<(bool Success, string Error)> VerifyDocumentAsync(Guid docId, Guid adminId, VerifyDocumentDto dto);
        Task<(bool Success, string Error, object? Requests)> GetGroupRequestsAsync();
        Task<(bool Success, string Error)> VerifyGroupRequestAsync(Guid requestId, VerifyGroupRequestDto dto);
        Task<(bool Success, string Error, object? Users)> GetAllUsersAsync();
        Task<(bool Success, string Error, object? Stats)> GetAdminStatsAsync();
        Task<(bool Success, string Error, object? University)> AddUniversityAsync(AddUniversityDto dto);
        Task<(bool Success, string Error, object? Program)> AddProgramAsync(Guid universityId, AddProgramDto dto);
        Task<(bool Success, string Error, object? Group)> AddGroupAsync(AddGroupDto dto);
        Task<(bool Success, string Error, object? Country)> AddCountryAsync(AddCountryDto dto);
        Task<(bool Success, string Error, object? ServiceType)> AddServiceTypeAsync(AddServiceTypeDto dto);
        Task<(bool Success, string Error)> DeductUserMPAsync(Guid userId, DeductMPDto dto);
        Task<(bool Success, string Error)> AddUserMPAsync(Guid userId, AddMPDto dto);
        Task<(bool Success, string Error)> ModerateUserAsync(Guid userId, string action);
        Task<(bool Success, string Error, object? Reports)> GetPendingReportsAsync();
        Task<(bool Success, string Error)> ResolveReportAsync(Guid reportId, string action);
    }
}
