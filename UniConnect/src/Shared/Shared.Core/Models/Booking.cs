using System;
using Core.Enums.Booking;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models
{
    [Table("bookings")]
    public class Booking
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("service_type_id")]
        public string ServiceTypeId { get; set; } = string.Empty;

        [Required]
        [Column("service_name")]
        public string ServiceName { get; set; } = string.Empty;

        [Column("service_icon")]
        public string? ServiceIcon { get; set; }

        [Column("price")]
        public decimal Price { get; set; }

        [Column("booker_id")]
        public Guid BookerId { get; set; }

        [Required]
        [Column("booker_name")]
        public string BookerName { get; set; } = string.Empty;

        [Required]
        [Column("booker_email")]
        public string BookerEmail { get; set; } = string.Empty;

        [Column("university_id")]
        public Guid? UniversityId { get; set; }

        [Column("university_name")]
        public string? UniversityName { get; set; }

        [Column("notes")]
        public string Notes { get; set; } = string.Empty;

        [Required]
        [Column("status")]
        public BookingStatus Status { get; set; } = BookingStatus.Open;

        [Column("accepted_by")]
        public Guid? AcceptedBy { get; set; }

        [Column("accepted_by_name")]
        public string? AcceptedByName { get; set; }

        [Column("accepted_at")]
        public DateTime? AcceptedAt { get; set; }

        [Column("completed_at")]
        public DateTime? CompletedAt { get; set; }

        [Column("student_earning")]
        public decimal StudentEarning { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("BookerId")]
        public virtual User? Booker { get; set; }

        [ForeignKey("AcceptedBy")]
        public virtual User? Provider { get; set; }
    }
}
