using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Admin.Core.Interfaces;

namespace Admin.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EventsController : ControllerBase
    {
        private readonly IEventService _eventService;

        public EventsController(IEventService eventService)
        {
            _eventService = eventService;
        }

        // GET /api/events
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetEvents()
        {
            var result = await _eventService.GetEventsAsync();
            if (!result.Success)
            {
                return StatusCode(500, new { error = "Server error." });
            }
            return Ok(new { events = result.Events });
        }
    }
}
