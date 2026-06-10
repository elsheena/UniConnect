using System;

namespace Auth.Core.DTOs
{
    public record RegisterDto(
        string FullName,
        string Email,
        string Password,
        string Role,
        string? PhoneNumber,
        string? Nationality,
        Guid? UniversityId
    );

    public record LoginDto(string Email, string Password);

    public record UserDto(
        Guid Id,
        string FullName,
        string Email,
        string Role,
        string? PhoneNumber,
        string? Nationality,
        Guid? UniversityId,
        string? UniversityName,
        string? AvatarUrl,
        string AvatarStatus,
        DateTime CreatedAt,
        decimal BalanceUSD,
        int BalanceMP,
        string VerificationStatus,
        bool IsVerified,
        string LocalCurrency = "USD"
    );

    public record UpdateVerificationStatusDto(string Action, Guid? UniversityId);
}
