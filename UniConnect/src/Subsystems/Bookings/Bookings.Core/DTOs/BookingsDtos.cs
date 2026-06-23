using System;

namespace Bookings.Core.DTOs
{
    public record ApplyDto(string ProgramCode);

    public record BookServiceDto(string ServiceTypeId, Guid? UniversityId, string? Notes);

    public record AcceptBookingDto(Guid Id);

    public record ApplicationResultDto(Guid ApplicationId, Guid ChatId);
}
