# Spin up UniConnect Microservices concurrently headlessly
Write-Host "Spinning up UniConnect Microservice Ecosystem..." -ForegroundColor Green

Write-Host "Starting Auth.API (Port 3001)..."
Start-Process dotnet -ArgumentList "run --project src/Subsystems/Auth/Auth.API" -NoNewWindow

Write-Host "Starting Chats.API (Port 3002)..."
Start-Process dotnet -ArgumentList "run --project src/Subsystems/Chats/Chats.API" -NoNewWindow

Write-Host "Starting Files.API (Port 3003)..."
Start-Process dotnet -ArgumentList "run --project src/Subsystems/Files/Files.API" -NoNewWindow

Write-Host "Starting Bookings.API (Port 3004)..."
Start-Process dotnet -ArgumentList "run --project src/Subsystems/Bookings/Bookings.API" -NoNewWindow

Write-Host "Starting Admin.API (Port 3005)..."
Start-Process dotnet -ArgumentList "run --project src/Subsystems/Admin/Admin.API" -NoNewWindow

Write-Host "Starting NotificationWorker..."
Start-Process dotnet -ArgumentList "run --project src/NotificationWorker" -NoNewWindow

# Wait a few seconds for downstream services to initialize
Start-Sleep -Seconds 6

Write-Host "Starting ApiGateway (Port 3000)..."
Start-Process dotnet -ArgumentList "run --project src/ApiGateway" -NoNewWindow

Write-Host "--------------------------------------------------------" -ForegroundColor Green
Write-Host "All UniConnect microservices have been launched." -ForegroundColor Green
Write-Host "The platform can be accessed at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "--------------------------------------------------------" -ForegroundColor Green
