using System.Threading.Tasks;
using Admin.Core.DTOs;

namespace Admin.Core.Interfaces
{
    public interface IEventService
    {
        Task<(bool Success, string Error, object? Events)> GetEventsAsync();
        Task<(bool Success, string Error, object? Event)> AddEventAsync(AddEventDto dto);
    }
}
