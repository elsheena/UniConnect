using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models
{
    [Table("private_chats")]
    public class PrivateChat
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("booking_id")]
        public Guid? BookingId { get; set; }

        [Column("student_id")]
        public Guid StudentId { get; set; }

        [Column("applicant_id")]
        public Guid ApplicantId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("is_application_chat")]
        public bool IsApplicationChat { get; set; } = false;

        [Column("university_id")]
        public Guid? UniversityId { get; set; }

        [ForeignKey("StudentId")]
        public virtual User? Student { get; set; }

        [ForeignKey("ApplicantId")]
        public virtual User? Applicant { get; set; }

        [ForeignKey("BookingId")]
        public virtual Booking? Booking { get; set; }
    }
}
