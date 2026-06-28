using Microsoft.EntityFrameworkCore;
using Core.Models;
using Core.Enums.Application;
using Core.Enums.Booking;
using Core.Enums.Document;
using Core.Enums.Group;
using Core.Enums.Transaction;
using Core.Enums.User;
using Shared.DataAccess.Data;
using System;

namespace Admin.DataAccess.Data
{
    public class AdminDbContext : BaseDbContext
    {
        public AdminDbContext(DbContextOptions<AdminDbContext> options) : base(options)
        {
        }

        public DbSet<Document> Documents { get; set; }
        public DbSet<Group> Groups { get; set; }
        public DbSet<Membership> Memberships { get; set; }
        public DbSet<Application> Applications { get; set; }
        public DbSet<Booking> Bookings { get; set; }
        public DbSet<PrivateChat> PrivateChats { get; set; }
        public DbSet<PrivateMessage> PrivateMessages { get; set; }
        public DbSet<GroupMessage> GroupMessages { get; set; }
        public DbSet<GroupRequest> GroupRequests { get; set; }
        public DbSet<Event> Events { get; set; }
        public DbSet<University> Universities { get; set; }
        public DbSet<Program> Programs { get; set; }
        public DbSet<Country> Countries { get; set; }
        public DbSet<ServiceType> ServiceTypes { get; set; }
        public DbSet<StoredFile> StoredFiles { get; set; }

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

            modelBuilder.Entity<Booking>(entity =>
            {
                entity.Property(b => b.Status).HasConversion(
                    v => v.ToString().ToLower(),
                    v => (BookingStatus)Enum.Parse(typeof(BookingStatus), v, true)
                );
            });

            modelBuilder.Entity<Application>(entity =>
            {
                entity.Property(a => a.Status).HasConversion(
                    v => v.ToString().ToLower(),
                    v => (ApplicationStatus)Enum.Parse(typeof(ApplicationStatus), v, true)
                );
            });



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

            modelBuilder.Entity<Program>(entity =>
            {
                entity.Property(p => p.Subjects).HasColumnType("text[]");
                entity.Property(p => p.Careers).HasColumnType("text[]");
            });

            modelBuilder.Entity<Membership>(entity =>
            {
                entity.HasIndex(m => new { m.UserId, m.GroupId }).IsUnique();
            });

            // Seed default events
            modelBuilder.Entity<Event>().HasData(
                new Event
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                    Title = "World Youth Festival",
                    Date = "2026-03-01",
                    Location = "Sirius (Sochi)",
                    Image = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1000",
                    Description = "The largest youth event in the world, bringing together top leaders, activists, and students from across the globe.",
                    Link = "https://fest2024.com/en",
                    Category = "Forum"
                },
                new Event
                {
                    Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                    Title = "Kazan Digital Week",
                    Date = "2026-09-20",
                    Location = "Kazan Expo",
                    Image = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1000",
                    Description = "An international platform for discussing digital transformation in economy, social sphere, and governance.",
                    Link = "https://kazandigitalweek.com/en",
                    Category = "Tech"
                },
                new Event
                {
                    Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                    Title = "SPIEF 2026",
                    Date = "2026-06-12",
                    Location = "St. Petersburg",
                    Image = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1000",
                    Description = "St. Petersburg International Economic Forum — a unique event in the world of business and economy.",
                    Link = "https://forumspb.com/en",
                    Category = "Economy"
                },
                new Event
                {
                    Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
                    Title = "Russia — Land of Opportunity",
                    Date = "2026-05-15",
                    Location = "Moscow, VDNKh",
                    Image = "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1000",
                    Description = "A platform for personal growth and professional development for young people in Russia.",
                    Link = "https://rsv.ru",
                    Category = "Social"
                }
            );
        }
    }
}
