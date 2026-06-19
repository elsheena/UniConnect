using System;
using Core.Enums.Group;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models
{
    [Table("group_requests")]
    public class GroupRequest
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("user_id")]
        public Guid UserId { get; set; }

        [Required]
        [Column("user_name")]
        public string UserName { get; set; } = string.Empty;

        [Column("group_id")]
        public Guid GroupId { get; set; }

        [Required]
        [Column("group_name")]
        public string GroupName { get; set; } = string.Empty;

        [Column("reason")]
        public string? Reason { get; set; }

        [Required]
        [Column("status")]
        public GroupRequestStatus Status { get; set; } = GroupRequestStatus.Pending;

        [Column("requested_at")]
        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [ForeignKey("GroupId")]
        public virtual Group? Group { get; set; }
    }
}
