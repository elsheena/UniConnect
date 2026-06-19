using System;
using System.Threading.Tasks;

namespace Admin.Core.Interfaces
{
    public interface INotificationService
    {
        Task<(bool Success, string Error, object? Notifications)> GetNotificationsAsync(Guid userId);
        Task<(bool Success, string Error)> MarkAsReadAsync(Guid notificationId, Guid userId);
    }
}
