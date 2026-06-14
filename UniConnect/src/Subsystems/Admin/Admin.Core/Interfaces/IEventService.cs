using System.Threading.Tasks;

namespace Admin.Core.Interfaces
{
    public interface IEventService
    {
        Task<(bool Success, string Error, object? Events)> GetEventsAsync();
    }
}
