using System;
using System.Threading.Tasks;
using Services.Core.DTOs;
using Core.Models;

namespace Services.Core.Interfaces
{
    public interface IServiceBookingService
    {
        object GetServiceTypes();
        Task<(bool Success, string Error, Booking? Booking)> BookServiceAsync(Guid userId, BookServiceDto dto);
        Task<(bool Success, string Error, object? Bookings)> GetMyBookingsAsync(Guid userId);
        Task<(bool Success, string Error, object? Offers)> GetOffersAsync(Guid userId, string currentUserRole, Guid? universityId, bool acceptedOnly);
        Task<(bool Success, string Error, object? Data)> AcceptOfferAsync(Guid id, Guid userId);
        Task<(bool Success, string Error, object? Data)> CompleteServiceAsync(Guid id, Guid userId);
        Task<(bool Success, string Error, Booking? Booking)> CancelBookingAsync(Guid id, Guid userId, string currentUserRole);
    }
}
