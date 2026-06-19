using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Admin.Core.DTOs;
using Admin.Core.Interfaces;

namespace Admin.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class WalletController : ControllerBase
    {
        private readonly IWalletService _walletService;

        public WalletController(IWalletService walletService)
        {
            _walletService = walletService;
        }

        // GET /api/wallet
        [HttpGet]
        public async Task<IActionResult> GetWallet()
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _walletService.GetWalletAsync(userId);
            if (!result.Success) return Unauthorized();

            return Ok(result.WalletData);
        }

        // POST /api/wallet/deposit
        [HttpPost("deposit")]
        public async Task<IActionResult> Deposit([FromBody] WalletAmountDto dto)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _walletService.DepositAsync(userId, dto.Amount);
            if (!result.Success) return BadRequest(new { error = result.Error });

            return Ok(new { message = "Deposit successful!", balanceUSD = ((dynamic)result.WalletData!).balanceUSD, balanceMP = ((dynamic)result.WalletData!).balanceMP });
        }

        // POST /api/wallet/buy-mp
        [HttpPost("buy-mp")]
        public async Task<IActionResult> BuyMP([FromBody] WalletAmountDto dto)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _walletService.BuyMPAsync(userId, dto.Amount);
            if (!result.Success) return BadRequest(new { error = result.Error });

            return Ok(new { message = "Exchange successful!", balanceUSD = ((dynamic)result.WalletData!).balanceUSD, balanceMP = ((dynamic)result.WalletData!).balanceMP });
        }

        // POST /api/wallet/redeem
        [HttpPost("redeem")]
        public async Task<IActionResult> Redeem([FromBody] WalletAmountDto dto)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _walletService.RedeemAsync(userId, dto.Amount);
            if (!result.Success) return BadRequest(new { error = result.Error });

            return Ok(new { message = "Redeem successful!", balanceUSD = ((dynamic)result.WalletData!).balanceUSD, balanceMP = ((dynamic)result.WalletData!).balanceMP });
        }

        // POST /api/wallet/withdraw
        [HttpPost("withdraw")]
        public async Task<IActionResult> Withdraw([FromBody] WalletAmountDto dto)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            var isVerifiedVal = User.FindFirstValue("isVerified"); // or check DB
            bool isVerified = isVerifiedVal == "True" || isVerifiedVal == "true";

            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _walletService.WithdrawAsync(userId, dto.Amount, userRole, isVerified);
            if (!result.Success)
            {
                if (result.Error.Contains("verify")) return StatusCode(403, new { error = result.Error });
                return BadRequest(new { error = result.Error });
            }

            return Ok(new { message = "Withdrawal request processed!", balanceUSD = ((dynamic)result.WalletData!).balanceUSD, balanceMP = ((dynamic)result.WalletData!).balanceMP });
        }
    }
}
