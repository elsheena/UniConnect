using Microsoft.EntityFrameworkCore;
using Core.Models;
using Core.Enums.Document;
using Core.Enums.User;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Shared.DataAccess.Data
{
    public abstract class BaseDbContext : DbContext
    {
        protected BaseDbContext(DbContextOptions options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<BackgroundEmail> BackgroundEmails { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(u => u.Email).IsUnique();
                entity.Property(u => u.Role).HasConversion(
                    v => v.ToString().ToLower(),
                    v => (UserRole)Enum.Parse(typeof(UserRole), v, true)
                );
                entity.Property(u => u.AvatarStatus).HasConversion(
                    v => v.ToString().ToLower(),
                    v => (DocumentStatus)Enum.Parse(typeof(DocumentStatus), v, true)
                );
                entity.Property(u => u.VerificationStatus).HasConversion(
                    v => v.ToString().ToLower(),
                    v => (UserVerificationStatus)Enum.Parse(typeof(UserVerificationStatus), v, true)
                );
            });
        }

        public override int SaveChanges()
        {
            QueueEmailNotifications();
            return base.SaveChanges();
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            await QueueEmailNotificationsAsync();
            return await base.SaveChangesAsync(cancellationToken);
        }

        private void QueueEmailNotifications()
        {
            var newNotifications = ChangeTracker.Entries<Notification>()
                .Where(e => e.State == EntityState.Added)
                .Select(e => e.Entity)
                .ToList();

            if (!newNotifications.Any()) return;

            foreach (var notif in newNotifications)
            {
                var user = Users.Find(notif.UserId);
                if (user != null && !string.IsNullOrEmpty(user.Email))
                {
                    var alreadyQueued = BackgroundEmails.Local.Any(e => e.ToEmail == user.Email && e.Subject == $"Notification: {notif.Title}" && e.CreatedAt > DateTime.UtcNow.AddSeconds(-5));
                    if (!alreadyQueued)
                    {
                        var body = $"Hello {user.FullName},\n\nYou have a new notification on UniConnect:\n\n{notif.Text}\n\n{(string.IsNullOrEmpty(notif.Link) ? "" : $"Link: http://localhost:3000{notif.Link}\n\n")}Regards,\nUniConnect Team";
                        BackgroundEmails.Add(new BackgroundEmail
                        {
                            ToEmail = user.Email,
                            Subject = $"Notification: {notif.Title}",
                            Body = body,
                            Sent = false,
                            CreatedAt = DateTime.UtcNow,
                            AttachmentsJson = "[]"
                        });
                    }
                }
            }
        }

        private async Task QueueEmailNotificationsAsync()
        {
            var newNotifications = ChangeTracker.Entries<Notification>()
                .Where(e => e.State == EntityState.Added)
                .Select(e => e.Entity)
                .ToList();

            if (!newNotifications.Any()) return;

            foreach (var notif in newNotifications)
            {
                var user = await Users.FindAsync(notif.UserId);
                if (user != null && !string.IsNullOrEmpty(user.Email))
                {
                    var alreadyQueued = BackgroundEmails.Local.Any(e => e.ToEmail == user.Email && e.Subject == $"Notification: {notif.Title}" && e.CreatedAt > DateTime.UtcNow.AddSeconds(-5))
                        || await BackgroundEmails.AnyAsync(e => e.ToEmail == user.Email && e.Subject == $"Notification: {notif.Title}" && e.CreatedAt > DateTime.UtcNow.AddSeconds(-5));
                    if (!alreadyQueued)
                    {
                        var body = $"Hello {user.FullName},\n\nYou have a new notification on UniConnect:\n\n{notif.Text}\n\n{(string.IsNullOrEmpty(notif.Link) ? "" : $"Link: http://localhost:3000{notif.Link}\n\n")}Regards,\nUniConnect Team";
                        BackgroundEmails.Add(new BackgroundEmail
                        {
                            ToEmail = user.Email,
                            Subject = $"Notification: {notif.Title}",
                            Body = body,
                            Sent = false,
                            CreatedAt = DateTime.UtcNow,
                            AttachmentsJson = "[]"
                        });
                    }
                }
            }
        }
    }
}
