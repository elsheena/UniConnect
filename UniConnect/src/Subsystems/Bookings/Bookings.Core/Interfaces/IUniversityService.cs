using System;
using System.Threading.Tasks;
using Bookings.Core.DTOs;

namespace Bookings.Core.Interfaces
{
    public interface IUniversityService
    {
        object GetUniversities();
        object GetUniversityById(Guid id);
        object GetCountries();
        Task<(bool Success, string Error, object? Data)> ApplyToUniversityAsync(Guid universityId, Guid userId, ApplyDto dto);
    }
}
