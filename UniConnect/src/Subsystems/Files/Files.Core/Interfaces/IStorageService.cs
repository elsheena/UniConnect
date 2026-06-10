using System;
using System.IO;
using System.Threading.Tasks;

namespace Files.Core.Interfaces
{
    public interface IStorageService
    {
        Task<(bool Success, string Error, string Filename)> SaveFileAsync(Stream fileStream, string originalName, Guid userId, string fileType);
    }
}
