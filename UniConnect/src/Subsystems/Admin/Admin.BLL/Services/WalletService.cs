using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Admin.Core.DTOs;
using Admin.Core.Interfaces;
using Core.Models;
using Core.Enums.Transaction;
using Admin.DataAccess.Data;

namespace Admin.BLL.Services
{
    public class WalletService : IWalletService
    {
        private readonly AdminDbContext _db;

        public WalletService(AdminDbContext db)
        {
            _db = db;
        }

        public async Task<(bool Success, string Error, object? WalletData)> GetWalletAsync(Guid userId)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return (false, "User not found.", null);

            var txs = await _db.WalletTransactions
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            var data = new
            {
                balanceUSD = user.BalanceUSD,
                balanceMP = user.BalanceMP,
                transactions = txs
            };

            return (true, string.Empty, data);
        }

        public async Task<(bool Success, string Error, object? WalletData)> DepositAsync(Guid userId, decimal amount)
        {
            if (amount <= 0)
            {
                return (false, "Amount must be greater than zero.", null);
            }

            var user = await _db.Users.FindAsync(userId);
            if (user == null) return (false, "User not found.", null);

            user.BalanceUSD += amount;

            var tx = new WalletTransaction
            {
                UserId = userId,
                Type = TransactionType.Deposit,
                AmountUSD = amount,
                AmountMP = 0,
                Description = $"Deposited ${amount:F2} via bank transfer",
                CreatedAt = DateTime.UtcNow
            };
            _db.WalletTransactions.Add(tx);

            await _db.SaveChangesAsync();

            var data = new
            {
                balanceUSD = user.BalanceUSD,
                balanceMP = user.BalanceMP
            };

            return (true, string.Empty, data);
        }

        public async Task<(bool Success, string Error, object? WalletData)> BuyMPAsync(Guid userId, decimal amount)
        {
            if (amount <= 0)
            {
                return (false, "Amount must be greater than zero.", null);
            }

            var user = await _db.Users.FindAsync(userId);
            if (user == null) return (false, "User not found.", null);

            if (user.BalanceUSD < amount)
            {
                return (false, "Insufficient USD balance.", null);
            }

            int mpAmount = (int)(amount * 50);

            user.BalanceUSD -= amount;
            user.BalanceMP += mpAmount;

            var tx = new WalletTransaction
            {
                UserId = userId,
                Type = TransactionType.MpBuy,
                AmountUSD = -amount,
                AmountMP = mpAmount,
                Description = $"Exchanged ${amount:F2} for {mpAmount} Matryoshka Points",
                CreatedAt = DateTime.UtcNow
            };
            _db.WalletTransactions.Add(tx);

            await _db.SaveChangesAsync();

            var data = new
            {
                balanceUSD = user.BalanceUSD,
                balanceMP = user.BalanceMP
            };

            return (true, string.Empty, data);
        }

        public async Task<(bool Success, string Error, object? WalletData)> RedeemAsync(Guid userId, decimal mpAmount)
        {
            int mpAmountInt = (int)mpAmount;
            if (mpAmountInt <= 0)
            {
                return (false, "MP amount must be greater than zero.", null);
            }

            var user = await _db.Users.FindAsync(userId);
            if (user == null) return (false, "User not found.", null);

            if (user.BalanceMP < mpAmountInt)
            {
                return (false, "Insufficient MP balance.", null);
            }

            decimal usdValue = mpAmountInt / 100m;

            user.BalanceMP -= mpAmountInt;
            user.BalanceUSD += usdValue;

            var tx = new WalletTransaction
            {
                UserId = userId,
                Type = TransactionType.Redeem,
                AmountUSD = usdValue,
                AmountMP = -mpAmountInt,
                Description = $"Redeemed {mpAmountInt} Matryoshka Points for ${usdValue:F2}",
                CreatedAt = DateTime.UtcNow
            };
            _db.WalletTransactions.Add(tx);

            await _db.SaveChangesAsync();

            var data = new
            {
                balanceUSD = user.BalanceUSD,
                balanceMP = user.BalanceMP
            };

            return (true, string.Empty, data);
        }

        public async Task<(bool Success, string Error, object? WalletData)> WithdrawAsync(Guid userId, decimal amount, string currentUserRole, bool isVerified)
        {
            if (amount <= 0)
            {
                return (false, "Amount must be greater than zero.", null);
            }

            var user = await _db.Users.FindAsync(userId);
            if (user == null) return (false, "User not found.", null);

            if (currentUserRole == "applicant" && !isVerified)
            {
                return (false, "Applicants must verify their student status first before withdrawing funds.", null);
            }

            if (user.BalanceUSD < amount)
            {
                return (false, "Insufficient USD balance.", null);
            }

            user.BalanceUSD -= amount;

            var tx = new WalletTransaction
            {
                UserId = userId,
                Type = TransactionType.Withdraw,
                AmountUSD = -amount,
                AmountMP = 0,
                Description = $"Withdrew ${amount:F2} to bank account",
                CreatedAt = DateTime.UtcNow
            };
            _db.WalletTransactions.Add(tx);

            await _db.SaveChangesAsync();

            var data = new
            {
                balanceUSD = user.BalanceUSD,
                balanceMP = user.BalanceMP
            };

            return (true, string.Empty, data);
        }
    }
}
