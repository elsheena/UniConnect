using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Load Ocelot configuration
var ocelotConfigFile = Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true" 
    ? "ocelot.docker.json" 
    : "ocelot.json";
builder.Configuration.AddJsonFile(ocelotConfigFile, optional: false, reloadOnChange: true);

// Configure Ocelot services
builder.Services.AddOcelot(builder.Configuration);

// Add Swagger services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()
    )
);

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/api/auth-swagger/v1/swagger.json", "Auth & Users API");
    c.SwaggerEndpoint("/api/chats-swagger/v1/swagger.json", "Chats & Groups API");
    c.SwaggerEndpoint("/api/files-swagger/v1/swagger.json", "Files & Uploads API");
    c.SwaggerEndpoint("/api/bookings-swagger/v1/swagger.json", "Bookings & Universities API");
    c.SwaggerEndpoint("/api/admin-swagger/v1/swagger.json", "Admin & Wallet API");
    c.RoutePrefix = "swagger";
});

app.UseCors();

// Custom Middleware: Clean URLs support (e.g. /profile -> /html/profile.html)
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value;
    if (path == "/" || string.IsNullOrEmpty(path))
    {
        context.Request.Path = "/html/index.html";
    }
    else if (app.Environment.WebRootPath != null && !string.IsNullOrEmpty(path) && !path.StartsWith("/api"))
    {
        // Check if clean URL (e.g. /profile)
        if (!path.Contains("."))
        {
            var htmlPath = "/html" + path.TrimEnd('/') + ".html";
            var fullPath = Path.Combine(app.Environment.WebRootPath, "html", path.TrimEnd('/').TrimStart('/') + ".html");
            if (File.Exists(fullPath))
            {
                context.Request.Path = htmlPath;
            }
        }
        // Check if explicit .html URL (e.g. /profile.html)
        else if (path.EndsWith(".html") && !path.StartsWith("/html/"))
        {
            var fullPath = Path.Combine(app.Environment.WebRootPath, "html", path.TrimStart('/'));
            if (File.Exists(fullPath))
            {
                context.Request.Path = "/html/" + path.TrimStart('/');
            }
        }
    }
    await next();
});

// Serve static frontend files
app.UseDefaultFiles();
app.UseStaticFiles();

// Route all api endpoints using Ocelot Gateway
app.UseRouting();
app.UseEndpoints(endpoints => {
    endpoints.MapGet("/api/run-tests", async context =>
    {
        // Verify user is authenticated and is an admin
        var isAdmin = false;
        try
        {
            var cookieHeader = context.Request.Headers["Cookie"].ToString();
            if (!string.IsNullOrEmpty(cookieHeader))
            {
                using var client = new System.Net.Http.HttpClient();
                var request = new System.Net.Http.HttpRequestMessage(System.Net.Http.HttpMethod.Get, "http://localhost:3001/api/auth/me");
                request.Headers.Add("Cookie", cookieHeader);
                
                var response = await client.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var jsonDoc = System.Text.Json.JsonDocument.Parse(json);
                    if (jsonDoc.RootElement.TryGetProperty("user", out var userEl) && 
                        userEl.TryGetProperty("role", out var roleEl) && 
                        roleEl.GetString() == "admin")
                    {
                        isAdmin = true;
                    }
                }
            }
        }
        catch
        {
            // Fail safe
        }

        if (!isAdmin)
        {
            context.Response.StatusCode = 403;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync("{\"error\": \"Forbidden: Only administrators can run integration tests.\"}");
            return;
        }

        context.Response.ContentType = "text/event-stream";
        context.Response.Headers.Append("Cache-Control", "no-cache");
        context.Response.Headers.Append("Connection", "keep-alive");

        var projectPath = Path.Combine("tests", "IntegrationTests", "IntegrationTests.csproj");
        var workingDir = Directory.GetCurrentDirectory();
        
        if (!File.Exists(Path.Combine(workingDir, projectPath)))
        {
            var parent = Directory.GetParent(workingDir);
            while (parent != null)
            {
                if (File.Exists(Path.Combine(parent.FullName, projectPath)))
                {
                    workingDir = parent.FullName;
                    break;
                }
                parent = parent.Parent;
            }
        }

        var process = new System.Diagnostics.Process();
        process.StartInfo.FileName = "dotnet";
        process.StartInfo.Arguments = $"run --project \"{projectPath}\"";
        process.StartInfo.WorkingDirectory = workingDir;
        process.StartInfo.RedirectStandardOutput = true;
        process.StartInfo.RedirectStandardError = true;
        process.StartInfo.UseShellExecute = false;
        process.StartInfo.CreateNoWindow = true;

        var semaphore = new System.Threading.SemaphoreSlim(1, 1);
        Func<string, Task> sendMsg = async (msg) => {
            await semaphore.WaitAsync();
            try {
                await context.Response.WriteAsync($"data: {msg}\n\n");
                await context.Response.Body.FlushAsync();
            }
            catch {
                // Ignore client disconnect
            }
            finally {
                semaphore.Release();
            }
        };

        try
        {
            process.Start();

            var outputTask = Task.Run(async () =>
            {
                string? line;
                while ((line = await process.StandardOutput.ReadLineAsync()) != null)
                {
                    await sendMsg(line);
                }
            });

            var errorTask = Task.Run(async () =>
            {
                string? line;
                while ((line = await process.StandardError.ReadLineAsync()) != null)
                {
                    await sendMsg($"ERROR: {line}");
                }
            });

            await Task.WhenAll(outputTask, errorTask);
            await process.WaitForExitAsync();
            await sendMsg($"[EXIT] {process.ExitCode}");
        }
        catch (Exception ex)
        {
            await sendMsg($"ERROR: {ex.Message}");
        }
    });
});

await app.UseOcelot();

app.Run("http://0.0.0.0:3000");
