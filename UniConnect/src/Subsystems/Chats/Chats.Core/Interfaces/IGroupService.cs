using System;
using System.Threading.Tasks;
using Chats.Core.DTOs;
using Core.Models;

namespace Chats.Core.Interfaces
{
    public interface IGroupService
    {
        Task<(bool Success, string Error, object? Groups)> GetGroupsAsync(Guid userId);
        Task<(bool Success, string Error, object? GroupDetails)> GetGroupDetailsAsync(Guid groupId, Guid userId);
        Task<(bool Success, string Error, string Message)> JoinGroupAsync(Guid groupId, Guid userId, GroupJoinDto dto);
        Task<(bool Success, string Error)> LeaveGroupAsync(Guid groupId, Guid userId);
        Task<(bool Success, string Error, object? Messages)> GetGroupMessagesAsync(Guid groupId, Guid userId, string currentUserRole);
        Task<(bool Success, string Error, GroupMessage? Message)> SendGroupMessageAsync(Guid groupId, Guid userId, string text);
        Task<(bool Success, string Error, GroupMessage? Message)> EditGroupMessageAsync(Guid groupId, Guid msgId, Guid userId, string currentUserRole, string text);
        Task<(bool Success, string Error)> DeleteGroupMessageAsync(Guid groupId, Guid msgId, Guid userId, string currentUserRole);
        Task<(bool Success, string Error, int NewBalance)> ReactToGroupMessageAsync(Guid groupId, Guid msgId, Guid userId, int amount);
    }
}
