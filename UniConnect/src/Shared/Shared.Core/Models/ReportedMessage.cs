using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models
{
    [Table("reported_messages")]
    public class ReportedMessage
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("message_id")]
        public Guid MessageId { get; set; }

        [Column("chat_id")]
        public Guid ChatId { get; set; }

        [Column("chat_type")]
        public string ChatType { get; set; } = "group";

        [Column("reporter_id")]
        public Guid ReporterId { get; set; }

        [Column("reporter_name")]
        public string ReporterName { get; set; } = string.Empty;

        [Column("sender_id")]
        public Guid SenderId { get; set; }

        [Column("sender_name")]
        public string SenderName { get; set; } = string.Empty;

        [Column("message_text")]
        public string MessageText { get; set; } = string.Empty;

        [Column("reason")]
        public string Reason { get; set; } = string.Empty;

        [Column("reported_at")]
        public DateTime ReportedAt { get; set; } = DateTime.UtcNow;

        [Column("status")]
        public string Status { get; set; } = "pending";
    }
}
