using Microsoft.EntityFrameworkCore;
using Core.Models;
using Core.Enums.Document;
using Core.Enums.Group;
using Core.Enums.Application;
using Core.Enums.Booking;
using Shared.DataAccess.Data;
using System;

namespace Auth.DataAccess
{
    public class AuthDbContext : BaseDbContext
    {
        public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options)
        {
        }

        public DbSet<Document> Documents { get; set; }
        public DbSet<University> Universities { get; set; }
        public DbSet<Membership> Memberships { get; set; }
        public DbSet<GroupRequest> GroupRequests { get; set; }
        public DbSet<Application> Applications { get; set; }
        public DbSet<Booking> Bookings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Document>(entity =>
            {
                entity.Property(d => d.Status).HasConversion(
                    v => v.ToString().ToLower(),
                    v => (DocumentStatus)Enum.Parse(typeof(DocumentStatus), v, true)
                );
                entity.Property(d => d.Type).HasConversion(
                    v => v == DocumentType.PassportId ? "passport_id" : v == DocumentType.StudentCard ? "student_card" : "profile_picture",
                    v => v == "passport_id" ? DocumentType.PassportId : v == "student_card" ? DocumentType.StudentCard : DocumentType.ProfilePicture
                );
            });

            modelBuilder.Entity<Membership>(entity =>
            {
                entity.HasIndex(m => new { m.UserId, m.GroupId }).IsUnique();
            });

            modelBuilder.Entity<GroupRequest>(entity =>
            {
                entity.Property(r => r.Status).HasConversion(
                    v => v.ToString().ToLower(),
                    v => (GroupRequestStatus)Enum.Parse(typeof(GroupRequestStatus), v, true)
                );
            });

            modelBuilder.Entity<Application>(entity =>
            {
                entity.Property(a => a.Status).HasConversion(
                    v => v.ToString().ToLower(),
                    v => (ApplicationStatus)Enum.Parse(typeof(ApplicationStatus), v, true)
                );
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
