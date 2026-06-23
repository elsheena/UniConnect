using Microsoft.EntityFrameworkCore;
using Core.Models;
using Core.Enums.Booking;
using Core.Enums.Application;
using Core.Enums.Document;
using Shared.DataAccess.Data;
using System;

namespace Bookings.DataAccess
{
    public class BookingsDbContext : BaseDbContext
    {
        public BookingsDbContext(DbContextOptions<BookingsDbContext> options) : base(options)
        {
        }

        public DbSet<University> Universities { get; set; }
        public DbSet<Program> Programs { get; set; }
        public DbSet<Booking> Bookings { get; set; }
        public DbSet<ServiceType> ServiceTypes { get; set; }
        public DbSet<Country> Countries { get; set; }
        public DbSet<Application> Applications { get; set; }
        public DbSet<PrivateChat> PrivateChats { get; set; }
        public DbSet<PrivateMessage> PrivateMessages { get; set; }
        public DbSet<Document> Documents { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Program>(entity =>
            {
                entity.Property(p => p.Subjects).HasColumnType("text[]");
                entity.Property(p => p.Careers).HasColumnType("text[]");
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
        }
    }
}
