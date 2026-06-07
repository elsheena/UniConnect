using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models
{
    [Table("stored_files")]
    public class StoredFile
    {
        [Key]
        [Column("filename")]
        [Required]
        public string Filename { get; set; } = string.Empty;

        [Column("content")]
        [Required]
        public byte[] Content { get; set; } = Array.Empty<byte>();

        [Column("content_type")]
        [Required]
        public string ContentType { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
