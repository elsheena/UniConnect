using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models
{
    [Table("private_messages")]
    public class PrivateMessage
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("chat_id")]
        public Guid ChatId { get; set; }

        [Column("sender_id")]
        public Guid SenderId { get; set; }

        [Required]
        [Column("sender_name")]
        public string SenderName { get; set; } = string.Empty;

        [Required]
        [Column("text")]
        public string Text { get; set; } = string.Empty;

        [Column("sent_at")]
        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        [Column("reactions")]
        public string ReactionsJson { get; set; } = "[]"; // Serialized JSON: [{"userId": 1, "amount": 10}]

        [Column("is_edited")]
        public bool IsEdited { get; set; } = false;

        [Column("is_deleted")]
        public bool IsDeleted { get; set; } = false;

        [ForeignKey("ChatId")]
        public virtual PrivateChat? Chat { get; set; }

        [ForeignKey("SenderId")]
        public virtual User? Sender { get; set; }
    }
}
