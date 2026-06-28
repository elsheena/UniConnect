FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Build argument for the project path to publish
ARG PROJECT_PATH

# Copy projects
COPY src/Shared/Shared.Core/Shared.Core.csproj src/Shared/Shared.Core/
COPY src/Shared/Shared.DataAccess/Shared.DataAccess.csproj src/Shared/Shared.DataAccess/
COPY src/ApiGateway/ApiGateway.csproj src/ApiGateway/
COPY src/NotificationWorker/NotificationWorker.csproj src/NotificationWorker/
COPY src/Subsystems/Auth/Auth.Core/Auth.Core.csproj src/Subsystems/Auth/Auth.Core/
COPY src/Subsystems/Auth/Auth.DataAccess/Auth.DataAccess.csproj src/Subsystems/Auth/Auth.DataAccess/
COPY src/Subsystems/Auth/Auth.BLL/Auth.BLL.csproj src/Subsystems/Auth/Auth.BLL/
COPY src/Subsystems/Auth/Auth.API/Auth.API.csproj src/Subsystems/Auth/Auth.API/
COPY src/Subsystems/Chats/Chats.Core/Chats.Core.csproj src/Subsystems/Chats/Chats.Core/
COPY src/Subsystems/Chats/Chats.DataAccess/Chats.DataAccess.csproj src/Subsystems/Chats/Chats.DataAccess/
COPY src/Subsystems/Chats/Chats.BLL/Chats.BLL.csproj src/Subsystems/Chats/Chats.BLL/
COPY src/Subsystems/Chats/Chats.API/Chats.API.csproj src/Subsystems/Chats/Chats.API/
COPY src/Subsystems/Files/Files.Core/Files.Core.csproj src/Subsystems/Files/Files.Core/
COPY src/Subsystems/Files/Files.DataAccess/Files.DataAccess.csproj src/Subsystems/Files/Files.DataAccess/
COPY src/Subsystems/Files/Files.BLL/Files.BLL.csproj src/Subsystems/Files/Files.BLL/
COPY src/Subsystems/Files/Files.API/Files.API.csproj src/Subsystems/Files/Files.API/
COPY src/Subsystems/Bookings/Bookings.Core/Bookings.Core.csproj src/Subsystems/Bookings/Bookings.Core/
COPY src/Subsystems/Bookings/Bookings.DataAccess/Bookings.DataAccess.csproj src/Subsystems/Bookings/Bookings.DataAccess/
COPY src/Subsystems/Bookings/Bookings.BLL/Bookings.BLL.csproj src/Subsystems/Bookings/Bookings.BLL/
COPY src/Subsystems/Bookings/Bookings.API/Bookings.API.csproj src/Subsystems/Bookings/Bookings.API/
COPY src/Subsystems/Admin/Admin.Core/Admin.Core.csproj src/Subsystems/Admin/Admin.Core/
COPY src/Subsystems/Admin/Admin.DataAccess/Admin.DataAccess.csproj src/Subsystems/Admin/Admin.DataAccess/
COPY src/Subsystems/Admin/Admin.BLL/Admin.BLL.csproj src/Subsystems/Admin/Admin.BLL/
COPY src/Subsystems/Admin/Admin.API/Admin.API.csproj src/Subsystems/Admin/Admin.API/

# Restore dependencies for target project specifically
RUN dotnet restore ${PROJECT_PATH}

# Copy everything else
COPY src/ src/

# Publish target project
RUN dotnet publish ${PROJECT_PATH} -c Release -o /app/publish --no-restore

# Final image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Environment variable to indicate container running environment
ENV DOTNET_RUNNING_IN_CONTAINER=true
