using System;
using System.Threading.Tasks;
using Admin.Core.DTOs;

namespace Admin.Core.Interfaces
{
    public interface IWalletService
    {
        Task<(bool Success, string Error, object? WalletData)> GetWalletAsync(Guid userId);
        Task<(bool Success, string Error, object? WalletData)> DepositAsync(Guid userId, decimal amount);
        Task<(bool Success, string Error, object? WalletData)> BuyMPAsync(Guid userId, decimal amount);
        Task<(bool Success, string Error, object? WalletData)> RedeemAsync(Guid userId, decimal mpAmount);
        Task<(bool Success, string Error, object? WalletData)> WithdrawAsync(Guid userId, decimal amount, string currentUserRole, bool isVerified);
    }
}
