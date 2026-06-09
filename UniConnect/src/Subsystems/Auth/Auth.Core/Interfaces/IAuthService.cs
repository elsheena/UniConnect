using System;
using System.Threading.Tasks;
using Auth.Core.DTOs;

namespace Auth.Core.Interfaces
{
    public interface IAuthService
    {
        Task<(bool Success, string Error, UserDto? User)> RegisterAsync(RegisterDto dto);
        Task<(bool Success, string Error, UserDto? User)> LoginAsync(LoginDto dto);
        Task<UserDto?> GetUserByIdAsync(Guid id);
    }
}
