using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Admin.Core.Interfaces;
using Admin.DataAccess.Data;

namespace Admin.BLL.Services
{
    public class NotificationService : INotificationService
    {
        private readonly AdminDbContext _db;

        public NotificationService(AdminDbContext db)
        {
            _db = db;
        }

        public async Task<(bool Success, string Error, object? Notifications)> GetNotificationsAsync(Guid userId)
        {
            var notifs = await _db.Notifications
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            return (true, string.Empty, notifs);
        }

        public async Task<(bool Success, string Error)> MarkAsReadAsync(Guid notificationId, Guid userId)
        {
            var notif = await _db.Notifications.FindAsync(notificationId);
            if (notif == null)
            {
                return (false, "Notification not found.");
            }

            if (notif.UserId != userId)
            {
                return (false, "Not authorized.");
            }

            notif.Read = true;
            await _db.SaveChangesAsync();
            return (true, string.Empty);
        }
    }
}
