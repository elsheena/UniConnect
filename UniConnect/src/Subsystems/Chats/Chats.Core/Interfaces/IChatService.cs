using System;
using System.Threading.Tasks;
using Core.Models;

namespace Chats.Core.Interfaces
{
    public interface IChatService
    {
        Task<(bool Success, string Error, object? Chats)> GetChatsAsync(Guid userId);
        Task<(bool Success, string Error, PrivateChat? Chat)> CreateChatAsync(Guid userId, string currentUserRole, Guid targetId);
        Task<(bool Success, string Error, object? ChatDetails)> GetChatDetailsAsync(Guid chatId, Guid userId, string currentUserRole);
        Task<(bool Success, string Error, object? Message)> SendMessageAsync(Guid chatId, Guid userId, string senderName, string text);
        Task<(bool Success, string Error, PrivateMessage? Message)> EditMessageAsync(Guid chatId, Guid msgId, Guid userId, string currentUserRole, string text);
        Task<(bool Success, string Error)> DeleteMessageAsync(Guid chatId, Guid msgId, Guid userId, string currentUserRole);
        Task<(bool Success, string Error, int NewBalance)> ReactToMessageAsync(Guid chatId, Guid msgId, Guid userId, int amount);
        Task<(bool Success, string Error)> ReportMessageAsync(Guid messageId, Guid reporterId, string reporterName, Guid chatId, string chatType, string reason);
    }
}
