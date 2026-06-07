using System;
using Core.Enums.Transaction;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models
{
    [Table("wallet_transactions")]
    public class WalletTransaction
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("user_id")]
        public Guid UserId { get; set; }

        [Required]
        [Column("type")]
        public TransactionType Type { get; set; } = TransactionType.Deposit;

        [Column("amount_usd")]
        public decimal AmountUSD { get; set; }

        [Column("amount_mp")]
        public int AmountMP { get; set; }

        [Column("description")]
        public string? Description { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }
}
