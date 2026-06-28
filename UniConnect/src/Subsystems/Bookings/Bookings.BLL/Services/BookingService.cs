using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Bookings.Core.DTOs;
using Bookings.Core.Interfaces;
using Bookings.DataAccess;
using Core.Models;
using Core.Enums.Booking;
using Core.Enums.User;
using Core.Enums.Transaction;

namespace Bookings.BLL.Services
{
    public class BookingService : IBookingService
    {
        private readonly BookingsDbContext _db;

        public BookingService(BookingsDbContext db)
        {
            _db = db;
        }

        public object GetServiceTypes()
        {
            return _db.ServiceTypes.ToList();
        }

        public async Task<(bool Success, string Error, Booking? Booking)> BookServiceAsync(Guid userId, BookServiceDto dto)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return (false, "User not found.", null);

            if (string.IsNullOrWhiteSpace(dto.ServiceTypeId))
            {
                return (false, "serviceTypeId is required.", null);
            }

            var serviceType = await _db.ServiceTypes.FindAsync(dto.ServiceTypeId);
            if (serviceType == null)
            {
                return (false, "Service type not found.", null);
            }

            if (user.Role == UserRole.Applicant && !user.IsVerified)
            {
                return (false, "You must verify your student status first before booking services.", null);
            }

            string? universityName = null;
            if (dto.UniversityId.HasValue)
            {
                var uni = await _db.Universities.FindAsync(dto.UniversityId.Value);
                if (uni != null) universityName = uni.Name;
            }

            if (serviceType.Price > 0)
            {
                if (user.BalanceMP < serviceType.Price)
                {
                    return (false, "Insufficient MP points to book this service. Please go to your wallet to convert USD to MP.", null);
                }
                user.BalanceMP -= (int)serviceType.Price;

                var tx = new WalletTransaction
                {
                    UserId = userId,
                    Type = TransactionType.Withdraw,
                    AmountUSD = 0,
                    AmountMP = -(int)serviceType.Price,
                    Description = $"Paid {serviceType.Price} MP for service: {serviceType.Name}",
                    CreatedAt = DateTime.UtcNow
                };
                _db.WalletTransactions.Add(tx);
            }

            var booking = new Booking
            {
                ServiceTypeId = dto.ServiceTypeId,
                ServiceName = serviceType.Name,
                ServiceIcon = serviceType.Icon,
                Price = serviceType.Price,
                BookerId = userId,
                BookerName = user.FullName,
                BookerEmail = user.Email,
                UniversityId = dto.UniversityId,
                UniversityName = universityName,
                Notes = dto.Notes ?? string.Empty,
                Status = BookingStatus.Open,
                StudentEarning = serviceType.Price > 0 ? Math.Round(serviceType.Price * 0.1m) : 0,
                CreatedAt = DateTime.UtcNow
            };

            _db.Bookings.Add(booking);
            await _db.SaveChangesAsync();

            return (true, string.Empty, booking);
        }

        public async Task<(bool Success, string Error, object? Bookings)> GetMyBookingsAsync(Guid userId)
        {
            var bookings = await _db.Bookings
                .Where(b => b.BookerId == userId)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            return (true, string.Empty, bookings);
        }

        public async Task<(bool Success, string Error, object? Offers)> GetOffersAsync(Guid userId, string currentUserRole, Guid? universityId, bool acceptedOnly)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return (false, "User not found.", null);

            if (!user.IsVerified)
            {
                return (false, "Your account is not verified yet. Please upload your student document.", null);
            }

            if (acceptedOnly)
            {
                var accepted = await _db.Bookings
                    .Where(b => b.AcceptedBy == userId)
                    .OrderByDescending(b => b.CreatedAt)
                    .ToListAsync();
                return (true, string.Empty, accepted);
            }

            var allBookings = await _db.Bookings.ToListAsync();
            var offers = new List<Booking>();

            if (currentUserRole == "representative")
            {
                offers = allBookings.Where(b =>
                    b.Status == BookingStatus.Open &&
                    b.UniversityId == user.UniversityId &&
                    b.ServiceTypeId == "representative_call"
                ).ToList();
            }
            else if (currentUserRole == "student" || currentUserRole == "moderator")
            {
                offers = allBookings.Where(b =>
                    b.Status == BookingStatus.Open &&
                    b.BookerId != userId &&
                    b.ServiceTypeId != "representative_call"
                ).ToList();

                if (user.UniversityId.HasValue)
                {
                    offers = offers.Where(b => !b.UniversityId.HasValue || b.UniversityId == user.UniversityId).ToList();
                }
                else
                {
                    offers = offers.Where(b => !b.UniversityId.HasValue).ToList();
                }
            }

            if (universityId.HasValue)
            {
                offers = offers.Where(b => b.UniversityId == universityId.Value).ToList();
            }

            return (true, string.Empty, offers);
        }

        public async Task<(bool Success, string Error, object? Data)> AcceptOfferAsync(Guid id, Guid userId)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return (false, "User not found.", null);

            var booking = await _db.Bookings.FindAsync(id);
            if (booking == null)
            {
                return (false, "Booking not found.", null);
            }

            if (booking.Status != BookingStatus.Open)
            {
                return (false, "This booking is no longer available.", null);
            }

            if (booking.BookerId == userId)
            {
                return (false, "You cannot accept your own booking.", null);
            }

            if (booking.ServiceTypeId == "representative_call")
            {
                if (user.Role != UserRole.Representative || booking.UniversityId != user.UniversityId)
                {
                    return (false, "Only a representative of this university can accept this request.", null);
                }
            }
            else
            {
                bool isRepOfUni = user.Role == UserRole.Representative && booking.UniversityId == user.UniversityId;
                bool isVerifiedStudent = (user.Role == UserRole.Student || user.Role == UserRole.Moderator) && user.IsVerified;

                if (!isRepOfUni && !isVerifiedStudent)
                {
                    return (false, "Only a representative of this university or a verified student can accept this request.", null);
                }
            }

            booking.Status = BookingStatus.Accepted;
            booking.AcceptedBy = userId;
            booking.AcceptedByName = user.FullName;
            booking.AcceptedAt = DateTime.UtcNow;

            var chat = new PrivateChat
            {
                BookingId = booking.Id,
                StudentId = userId,
                ApplicantId = booking.BookerId,
                CreatedAt = DateTime.UtcNow
            };
            _db.PrivateChats.Add(chat);

            var notification = new Notification
            {
                UserId = booking.BookerId,
                Title = "Service Accepted",
                Text = $"Your request for {booking.ServiceName} was accepted by {user.FullName}",
                Link = $"/messages?chatId={chat.Id}",
                Read = false,
                CreatedAt = DateTime.UtcNow
            };
            _db.Notifications.Add(notification);

            await _db.SaveChangesAsync();

            var data = new { booking, chatId = chat.Id };
            return (true, string.Empty, data);
        }

        public async Task<(bool Success, string Error, object? Data)> CompleteServiceAsync(Guid id, Guid userId)
        {
            var booking = await _db.Bookings.FindAsync(id);
            if (booking == null)
            {
                return (false, "Booking not found.", null);
            }

            if (booking.Status != BookingStatus.Accepted)
            {
                return (false, "Can only complete an accepted booking.", null);
            }

            if (booking.BookerId != userId && booking.AcceptedBy != userId)
            {
                return (false, "Not authorized to complete this booking.", null);
            }

            booking.Status = BookingStatus.Completed;
            booking.CompletedAt = DateTime.UtcNow;

            if (booking.StudentEarning > 0 && booking.AcceptedBy.HasValue)
            {
                var provider = await _db.Users.FindAsync(booking.AcceptedBy.Value);
                if (provider != null)
                {
                    provider.BalanceMP += (int)booking.StudentEarning;

                    var tx = new WalletTransaction
                    {
                        UserId = provider.Id,
                        Type = TransactionType.Deposit,
                        AmountUSD = 0,
                        AmountMP = (int)booking.StudentEarning,
                        Description = $"Earned {booking.StudentEarning} MP for completing service: {booking.ServiceName}",
                        CreatedAt = DateTime.UtcNow
                    };
                    _db.WalletTransactions.Add(tx);
                }
            }

            await _db.SaveChangesAsync();

            var data = new
            {
                booking,
                studentEarning = booking.StudentEarning
            };

            return (true, string.Empty, data);
        }

        public async Task<(bool Success, string Error, Booking? Booking)> CancelBookingAsync(Guid id, Guid userId, string currentUserRole)
        {
            var booking = await _db.Bookings.FindAsync(id);
            if (booking == null)
            {
                return (false, "Booking not found.", null);
            }

            if (booking.BookerId != userId && currentUserRole != "admin")
            {
                return (false, "Only the booker or admin can cancel.", null);
            }

            if (booking.Status == BookingStatus.Completed)
            {
                return (false, "Cannot cancel a completed booking.", null);
            }

            booking.Status = BookingStatus.Cancelled;
            await _db.SaveChangesAsync();

            return (true, string.Empty, booking);
        }
    }
}
