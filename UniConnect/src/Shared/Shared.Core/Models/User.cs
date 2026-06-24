using System;
using System.Collections.Generic;
using Core.Enums.User;
using Core.Enums.Document;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models
{
    [Table("users")]
    public class User
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("full_name")]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [Column("email")]
        public string Email { get; set; } = string.Empty;

        [Required]
        [Column("password")]
        public string Password { get; set; } = string.Empty;

        [Required]
        [Column("role")]
        public UserRole Role { get; set; } = UserRole.Applicant;

        [Column("phone_number")]
        public string? PhoneNumber { get; set; }

        [Column("nationality")]
        public string? Nationality { get; set; }

        [Column("university_id")]
        public Guid? UniversityId { get; set; }

        [Column("university_name")]
        public string? UniversityName { get; set; }

        [Column("is_verified")]
        public bool IsVerified { get; set; } = false;

        [Column("avatar_url")]
        public string? AvatarUrl { get; set; }

        [Column("avatar_status")]
        public DocumentStatus AvatarStatus { get; set; } = DocumentStatus.Approved;

        [Column("verification_status")]
        public UserVerificationStatus VerificationStatus { get; set; } = UserVerificationStatus.None;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("balance_usd")]
        public decimal BalanceUSD { get; set; } = 0;

        [Column("balance_mp")]
        public int BalanceMP { get; set; } = 0;

        [Column("pending_university_id")]
        public Guid? PendingUniversityId { get; set; }

        [Column("is_muted")]
        public bool IsMuted { get; set; } = false;

        [Column("is_banned")]
        public bool IsBanned { get; set; } = false;

        [Column("graduation_date")]
        public DateTime? GraduationDate { get; set; }
    }
}
