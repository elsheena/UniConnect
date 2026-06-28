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
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter(System.Text.Json.JsonNamingPolicy.CamelCase));
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Files API v1");
    c.RoutePrefix = "swagger";
});

// Ensure uploads folder is served as static files
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
    try
    {
        await context.Database.EnsureCreatedAsync();
    }
    catch (Exception ex)
    {
        Console.WriteLine("Database initialization note: " + ex.Message);
    }
    await context.Database.OpenConnectionAsync();
    using (var cmd = context.Database.GetDbConnection().CreateCommand())
    {
        cmd.CommandText = @"
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT FALSE;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS graduation_date TIMESTAMP WITH TIME ZONE;
            CREATE TABLE IF NOT EXISTS reported_messages (
                id UUID PRIMARY KEY,
                message_id UUID NOT NULL,
                chat_id UUID NOT NULL,
                chat_type VARCHAR(50) NOT NULL,
                reporter_id UUID NOT NULL,
                reporter_name VARCHAR(255) NOT NULL,
                sender_id UUID NOT NULL,
                sender_name VARCHAR(255) NOT NULL,
                message_text TEXT NOT NULL,
                reason TEXT NOT NULL,
                reported_at TIMESTAMP WITH TIME ZONE NOT NULL,
                status VARCHAR(50) NOT NULL
            );";
        await cmd.ExecuteNonQueryAsync();
    }
}

app.Run("http://0.0.0.0:3003");
