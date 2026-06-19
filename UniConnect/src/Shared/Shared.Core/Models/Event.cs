using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models
{
    [Table("events")]
    public class Event
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("title")]
        public string Title { get; set; } = string.Empty;

        [Required]
        [Column("date")]
        public string Date { get; set; } = string.Empty; // e.g. "2026-06-12"

        [Required]
        [Column("location")]
        public string Location { get; set; } = string.Empty;

        [Column("image")]
        public string? Image { get; set; }

        [Column("description")]
        public string? Description { get; set; }

        [Column("link")]
        public string? Link { get; set; }

        [Column("category")]
        public string? Category { get; set; }
    }
}
