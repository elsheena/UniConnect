using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Files.Core.Interfaces;
using Files.DataAccess;
using Files.BLL.Services;

var builder = WebApplication.CreateBuilder(args);

// Share Data Protection keys across microservices
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(Path.GetTempPath(), "uniconnect-keys")))
    .SetApplicationName("uniconnect");

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// Configure PostgreSQL DbContext
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Database=uniconnect;Username=postgres;Password=123";

builder.Services.AddDbContext<FilesDbContext>(options =>
    options.UseNpgsql(connectionString));

// Configure Cookie Authentication
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "uniconnect-session";
        options.Cookie.HttpOnly = true;
        options.ExpireTimeSpan = TimeSpan.FromHours(24);
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
    });

// Register services
builder.Services.AddScoped<IStorageService, StorageService>();

var app = builder.Build();

// Ensure uploads folder is served as static files
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run("http://localhost:3003");
