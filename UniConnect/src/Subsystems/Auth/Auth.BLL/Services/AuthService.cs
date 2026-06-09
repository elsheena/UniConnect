using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Auth.Core.DTOs;
using Auth.Core.Interfaces;
using Auth.DataAccess;
using Core.Models;
using Core.Enums.Document;
using Core.Enums.User;

namespace Auth.BLL.Services
{
    public class AuthService : IAuthService
    {
        private readonly AuthDbContext _db;

        public AuthService(AuthDbContext db)
        {
            _db = db;
        }

        public async Task<(bool Success, string Error, UserDto? User)> RegisterAsync(RegisterDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FullName) ||
                string.IsNullOrWhiteSpace(dto.Email) ||
                string.IsNullOrWhiteSpace(dto.Password) ||
                string.IsNullOrWhiteSpace(dto.Role))
            {
                return (false, "fullName, email, password, and role are required.", null);
            }

            if (!Enum.TryParse<UserRole>(dto.Role, true, out var roleEnum) || 
                (roleEnum != UserRole.Student && roleEnum != UserRole.Applicant))
            {
                return (false, "Role must be 'student' or 'applicant'.", null);
            }

            var existing = await _db.Users.AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower());
            if (existing)
            {
                return (false, "Email already registered.", null);
            }

            if (roleEnum == UserRole.Student && dto.UniversityId == null)
            {
                return (false, "Students must provide universityId.", null);
            }

            if (string.IsNullOrWhiteSpace(dto.Nationality))
            {
                return (false, "Nationality is required for all users.", null);
            }

            string? universityName = null;
            if (dto.UniversityId != null)
            {
                var uni = await _db.Universities.FindAsync(dto.UniversityId);
                if (uni != null) universityName = uni.Name;
            }

            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            var user = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                Password = hashedPassword,
                Role = roleEnum,
                PhoneNumber = dto.PhoneNumber,
                Nationality = dto.Nationality,
                UniversityId = dto.UniversityId,
                UniversityName = universityName,
                IsVerified = false,
                AvatarStatus = DocumentStatus.None,
                VerificationStatus = UserVerificationStatus.None,
                CreatedAt = DateTime.UtcNow
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            var userDto = MapToUserDto(user);
            return (true, string.Empty, userDto);
        }

        public async Task<(bool Success, string Error, UserDto? User)> LoginAsync(LoginDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return (false, "Email and password are required.", null);
            }

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower());
            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.Password))
            {
                return (false, "Invalid email or password.", null);
            }

            var userDto = MapToUserDto(user);
            return (true, string.Empty, userDto);
        }

        public async Task<UserDto?> GetUserByIdAsync(Guid id)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return null;
            return MapToUserDto(user);
        }

        private UserDto MapToUserDto(User user)
        {
            return new UserDto(
                user.Id,
                user.FullName,
                user.Email,
                user.Role.ToString().ToLower(),
                user.PhoneNumber,
                user.Nationality,
                user.UniversityId,
                user.UniversityName,
                user.AvatarUrl,
                user.AvatarStatus.ToString().ToLower(),
                user.CreatedAt,
                user.BalanceUSD,
                user.BalanceMP,
                user.VerificationStatus.ToString().ToLower(),
                user.IsVerified
            );
        }
    }
}
