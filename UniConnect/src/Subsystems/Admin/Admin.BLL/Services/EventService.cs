using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Admin.Core.Interfaces;
using Admin.Core.DTOs;
using Admin.DataAccess.Data;

namespace Admin.BLL.Services
{
    public class EventService : IEventService
    {
        private readonly AdminDbContext _db;

        public EventService(AdminDbContext db)
        {
            _db = db;
        }

        public async Task<(bool Success, string Error, object? Events)> GetEventsAsync()
        {
            try
            {
                var events = await _db.Events.ToListAsync();
                return (true, string.Empty, events);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }

        public async Task<(bool Success, string Error, object? Event)> AddEventAsync(AddEventDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Title))
                {
                    return (false, "Title is required.", null);
                }
                if (string.IsNullOrWhiteSpace(dto.Date))
                {
                    return (false, "Date is required.", null);
                }
                if (string.IsNullOrWhiteSpace(dto.Location))
                {
                    return (false, "Location is required.", null);
                }

                var ev = new global::Core.Models.Event
                {
                    Title = dto.Title.Trim(),
                    Date = dto.Date.Trim(),
                    Location = dto.Location.Trim(),
                    Image = dto.Image?.Trim(),
                    Description = dto.Description?.Trim(),
                    Link = dto.Link?.Trim(),
                    Category = dto.Category?.Trim()
                };

                _db.Events.Add(ev);
                await _db.SaveChangesAsync();

                return (true, string.Empty, ev);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, null);
            }
        }
    }
}
