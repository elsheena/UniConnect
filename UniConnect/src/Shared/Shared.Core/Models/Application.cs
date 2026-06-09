using System;
using Core.Enums.Application;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models
{
    [Table("applications")]
    public class Application
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("user_id")]
        public Guid UserId { get; set; }

        [Column("university_id")]
        public Guid UniversityId { get; set; }

        [Required]
        [Column("university_name")]
        public string UniversityName { get; set; } = string.Empty;

        [Required]
        [Column("program_code")]
        public string ProgramCode { get; set; } = string.Empty;

        [Required]
        [Column("program_name")]
        public string ProgramName { get; set; } = string.Empty;

        [Required]
        [Column("status")]
        public ApplicationStatus Status { get; set; } = ApplicationStatus.Pending;

        [Column("applied_at")]
        public DateTime AppliedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }
}
