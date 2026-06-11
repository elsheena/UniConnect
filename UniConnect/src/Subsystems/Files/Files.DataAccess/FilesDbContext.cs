using Microsoft.EntityFrameworkCore;
using Core.Models;
using Core.Enums.Document;
using Shared.DataAccess.Data;
using System;

namespace Files.DataAccess
{
    public class FilesDbContext : BaseDbContext
    {
        public FilesDbContext(DbContextOptions<FilesDbContext> options) : base(options)
        {
        }

        public DbSet<Document> Documents { get; set; }
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
        }
    }
}
