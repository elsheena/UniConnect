using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using NotificationWorker;
using Shared.Core.Interfaces;
using Admin.DataAccess.Data;
using Admin.BLL.Services;

var builder = Host.CreateApplicationBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Database=uniconnect;Username=postgres;Password=123";

builder.Services.AddDbContext<AdminDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddSingleton<SmtpEmailSender>();
builder.Services.AddSingleton<FileEmailSender>();
builder.Services.AddSingleton<MailtrapEmailSender>();
builder.Services.AddSingleton<FailoverEmailSender>();

builder.Services.AddSingleton<IEmailSender>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var provider = config["EMAIL_PROVIDER"] ?? "FAILOVER";
    return provider.ToUpper() switch
    {
        "SMTP" => sp.GetRequiredService<SmtpEmailSender>(),
        "FILE" => sp.GetRequiredService<FileEmailSender>(),
        "MAILTRAP" => sp.GetRequiredService<MailtrapEmailSender>(),
        "FAILOVER" => sp.GetRequiredService<FailoverEmailSender>(),
        _ => sp.GetRequiredService<FailoverEmailSender>()
    };
});

builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
