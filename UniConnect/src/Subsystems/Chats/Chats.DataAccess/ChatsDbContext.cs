using Microsoft.EntityFrameworkCore;
using Core.Models;
using Core.Enums.Booking;
using Core.Enums.Group;
using Shared.DataAccess.Data;
using System;

namespace Chats.DataAccess
{
    public class ChatsDbContext : BaseDbContext
    {
        public ChatsDbContext(DbContextOptions<ChatsDbContext> options) : base(options)
        {
        }

        public DbSet<PrivateChat> PrivateChats { get; set; }
        public DbSet<PrivateMessage> PrivateMessages { get; set; }
        public DbSet<Group> Groups { get; set; }
        public DbSet<GroupMessage> GroupMessages { get; set; }
        public DbSet<Membership> Memberships { get; set; }
        public DbSet<GroupRequest> GroupRequests { get; set; }
        public DbSet<Country> Countries { get; set; }
        public DbSet<University> Universities { get; set; }
        public DbSet<Booking> Bookings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<GroupRequest>(entity =>
            {
                entity.Property(r => r.Status).HasConversion(
                    v => v.ToString().ToLower(),
                    v => (GroupRequestStatus)Enum.Parse(typeof(GroupRequestStatus), v, true)
                );
            });

            modelBuilder.Entity<Group>(entity =>
            {
                entity.Property(g => g.GroupType).HasConversion(
                    v => v.ToString().ToLower(),
                    v => (GroupType)Enum.Parse(typeof(GroupType), v, true)
                );
            });

            modelBuilder.Entity<Membership>(entity =>
            {
                entity.HasIndex(m => new { m.UserId, m.GroupId }).IsUnique();
            });

            modelBuilder.Entity<Booking>(entity =>
            {
                entity.Property(b => b.Status).HasConversion(
                    v => v.ToString().ToLower(),
                    v => (BookingStatus)Enum.Parse(typeof(BookingStatus), v, true)
                );
            });
        }
    }
}
