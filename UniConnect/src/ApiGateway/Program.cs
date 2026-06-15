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
builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);

// Configure Ocelot services
builder.Services.AddOcelot(builder.Configuration);

// Configure CORS
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()
    )
);

var app = builder.Build();

app.UseCors();

// Custom Middleware: Clean URLs support (e.g. /profile -> /profile.html)
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value;
    if (app.Environment.WebRootPath != null &&
        !string.IsNullOrEmpty(path) && 
        !path.Contains(".") && 
        !path.StartsWith("/api"))
    {
        var htmlPath = path.TrimEnd('/') + ".html";
        var fullPath = Path.Combine(app.Environment.WebRootPath, htmlPath.TrimStart('/'));
        if (File.Exists(fullPath))
        {
            context.Request.Path = htmlPath;
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

app.Run("http://localhost:3000");
