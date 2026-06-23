using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Bookings.Core.DTOs;
using Bookings.Core.Interfaces;

namespace Bookings.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class BookingsController : ControllerBase
    {
        private readonly IBookingService _bookingService;

        public BookingsController(IBookingService bookingService)
        {
            _bookingService = bookingService;
        }

        // GET /api/bookings
        [HttpGet]
        [AllowAnonymous]
        public IActionResult GetServices()
        {
            var services = _bookingService.GetServiceTypes();
            return Ok(new { services });
        }

        // POST /api/bookings/book
        [HttpPost("book")]
        public async Task<IActionResult> BookService([FromBody] BookServiceDto dto)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _bookingService.BookServiceAsync(userId, dto);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                if (result.Error.Contains("verify")) return StatusCode(403, new { error = result.Error });
                return BadRequest(new { error = result.Error });
            }

            return StatusCode(201, new { message = "Service booked!", booking = result.Booking });
        }

        // GET /api/bookings/my-bookings
        [HttpGet("my-bookings")]
        public async Task<IActionResult> GetMyBookings()
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _bookingService.GetMyBookingsAsync(userId);
            if (!result.Success) return BadRequest(new { error = result.Error });

            return Ok(new { bookings = result.Bookings });
        }

        // GET /api/bookings/offers
        [HttpGet("offers")]
        public async Task<IActionResult> GetOffers([FromQuery] Guid? universityId)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var isAcceptedOnly = Request.Query["accepted"].ToString().ToLower() == "true";

            var result = await _bookingService.GetOffersAsync(userId, userRole, universityId, isAcceptedOnly);
            if (!result.Success)
            {
                if (result.Error.Contains("verified") || result.Error.Contains("document"))
                {
                    return StatusCode(403, new { error = result.Error });
                }
                return BadRequest(new { error = result.Error });
            }

            if (isAcceptedOnly)
            {
                return Ok(new { bookings = result.Offers });
            }

            return Ok(new { offers = result.Offers });
        }

        // POST /api/bookings/:id/accept
        [HttpPost("{id}/accept")]
        public async Task<IActionResult> AcceptOffer(Guid id)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _bookingService.AcceptOfferAsync(id, userId);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                if (result.Error.Contains("Only a representative")) return StatusCode(403, new { error = result.Error });
                return BadRequest(new { error = result.Error });
            }

            return Ok(new { message = "You accepted the request! A private chat has been created.", booking = ((dynamic)result.Data!).booking, chatId = ((dynamic)result.Data!).chatId });
        }

        // POST /api/bookings/:id/complete
        [HttpPost("{id}/complete")]
        public async Task<IActionResult> CompleteService(Guid id)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _bookingService.CompleteServiceAsync(id, userId);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                if (result.Error.Contains("authorized")) return StatusCode(403, new { error = result.Error });
                return BadRequest(new { error = result.Error });
            }

            return Ok(new
            {
                message = "Service completed!",
                booking = ((dynamic)result.Data!).booking,
                studentEarning = ((dynamic)result.Data!).studentEarning
            });
        }

        // POST /api/bookings/:id/cancel
        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> CancelBooking(Guid id)
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _bookingService.CancelBookingAsync(id, userId, userRole);
            if (!result.Success)
            {
                if (result.Error.Contains("not found")) return NotFound(new { error = result.Error });
                if (result.Error.Contains("authorized") || result.Error.Contains("only the booker")) return StatusCode(403, new { error = result.Error });
                return BadRequest(new { error = result.Error });
            }

            return Ok(new { message = "Booking cancelled.", booking = result.Booking });
        }

        // GET /api/bookings/accepted
        [HttpGet("accepted")]
        public async Task<IActionResult> GetAcceptedServices()
        {
            var userIdVal = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdVal == null || !Guid.TryParse(userIdVal, out var userId))
            {
                return Unauthorized();
            }

            var result = await _bookingService.GetOffersAsync(userId, string.Empty, null, true);
            if (!result.Success) return BadRequest(new { error = result.Error });

            return Ok(new { bookings = result.Offers });
        }
    }
}
