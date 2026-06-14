using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Admin.Core.Interfaces;
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
    }
}
