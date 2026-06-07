using System;
using Core.Enums.Document;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models
{


    [Table("documents")]
    public class Document
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("user_id")]
        public Guid UserId { get; set; }

        [Required]
        [Column("filename")]
        public string Filename { get; set; } = string.Empty;

        [Required]
        [Column("original_name")]
        public string OriginalName { get; set; } = string.Empty;

        [Column("uploaded_at")]
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        [Column("status")]
        public DocumentStatus Status { get; set; } = DocumentStatus.Pending;

        [Required]
        [Column("type")]
        public DocumentType Type { get; set; } = DocumentType.PassportId;

        [Column("reviewed_by")]
        public Guid? ReviewedBy { get; set; }

        [Column("reviewed_at")]
        public DateTime? ReviewedAt { get; set; }

        [Column("review_note")]
        public string? ReviewNote { get; set; }

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }
}
