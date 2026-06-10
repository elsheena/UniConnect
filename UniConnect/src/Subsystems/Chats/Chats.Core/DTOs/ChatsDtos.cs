using System;

namespace Chats.Core.DTOs
{
    public record SendMessageDto(string Text);

    public record EditMessageDto(string Text);

    public record ReactMessageDto(int Amount);

    public record GroupJoinDto(string? Reason);

    public record AddGroupDto(
        string Name,
        string Flag,
        string Description,
        string? CountryCode,
        bool IsCountryGroup,
        bool IsUniversityGroup,
        Guid? UniversityId
    );
}
