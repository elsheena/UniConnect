using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models
{
    [Table("programs")]
    public class Program
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("code")]
        public string Code { get; set; } = string.Empty;

        [Required]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("cost_rub")]
        public int CostRUB { get; set; }

        [Column("duration")]
        public string Duration { get; set; } = string.Empty;

        [Column("level")]
        public string Level { get; set; } = string.Empty;

        [Column("language")]
        public string Language { get; set; } = string.Empty;

        [Column("description")]
        public string Description { get; set; } = string.Empty;

        [Column("subjects")]
        public List<string> Subjects { get; set; } = new();

        [Column("careers")]
        public List<string> Careers { get; set; } = new();

        [Column("university_id")]
        public Guid UniversityId { get; set; }

        [ForeignKey(nameof(UniversityId))]
        public University? University { get; set; }
    }
}
