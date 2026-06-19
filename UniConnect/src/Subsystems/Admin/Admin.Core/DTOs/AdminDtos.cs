using System;
using System.Collections.Generic;

namespace Admin.Core.DTOs
{
    // Moderation/Admin DTOs
    public record ModerateUserDto(string Action);

    public record VerifyDocumentDto(string Action, string? Note, DateTime? GraduationDate);

    public record VerifyGroupRequestDto(string Action);

    public record DeductMPDto(int Amount, string Reason);

    public record AddMPDto(int Amount, string Reason);

    // Wallet DTOs
    public record WalletAmountDto(decimal Amount);

    // New Admin DTOs
    public record AddUniversityDto(
        string Name,
        string City,
        string? Logo,
        string? Image,
        string Description
    );

    public record AddProgramDto(
        string Code,
        string Name,
        int CostRUB,
        string Duration,
        string Level,
        string Language,
        string Description,
        List<string> Subjects,
        List<string> Careers
    );

    public record AddGroupDto(
        string Name,
        string Flag,
        string Description,
        string? CountryCode,
        bool IsCountryGroup,
        bool IsUniversityGroup,
        Guid? UniversityId
    );

    public record AddCountryDto(
        string Code,
        string Name,
        string Icon
    );

    public record AddServiceTypeDto(
        string Id,
        string Name,
        string Icon,
        decimal Price,
        bool HasCity,
        bool HasUniversity,
        string Description,
        bool FirstFree
    );

    public record UpdateVerificationStatusDto(string Action, Guid? UniversityId);
}
