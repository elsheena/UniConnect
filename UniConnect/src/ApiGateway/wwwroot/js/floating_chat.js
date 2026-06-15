/**
 * Floating Chat Widget Logic
 * Displays a single chat button to toggle a popup window containing 
 * all private messages and joined group chats. Supports internal chat routing and expand.
 */

const FloatingChat = {
    activeChatId: null,
    activeChatIsGroup: false,
    pollingInterval: null,
    isOpen: false,

    init() {
        // Create root container if it doesn't exist
        if (!document.getElementById('floating-chat-root')) {
            const root = document.createElement('div');
            root.id = 'floating-chat-root';
            root.innerHTML = `
                <div class="floating-chat-container">
                    <div class="chat-bubble" onclick="FloatingChat.toggleWindow()" id="chat-trigger-bubble" style="background:var(--gradient-primary); border:none; color:white;">
                        <span data-icon="chat" data-size="28"></span>
                    </div>
                </div>
                <div class="mini-chat-window" id="mini-chat-window">
                    <div class="mini-chat-header">
                        <button id="mini-chat-back" style="display:none; background:none; border:none; color:var(--text-secondary); cursor:pointer; padding:4px;" onclick="FloatingChat.showList()"></button>
                        <h4 id="mini-chat-title" style="margin:0; font-size:0.95rem; display:flex; align-items:center; gap:8px;">Messages</h4>
                        <div class="mini-chat-controls">
                            <button id="mini-chat-expand" style="display:none; background:none; border:none; color:var(--text-secondary); cursor:pointer; padding:4px;" onclick="FloatingChat.toggleMaximize()"></button>
                            <button onclick="FloatingChat.closeChat()" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; padding:4px;" class="close-btn"></button>
                        </div>
                    </div>
                    <div class="mini-chat-list" id="mini-chat-list" style="flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:8px;">
                        <div class="loading" style="display:flex; justify-content:center; padding:40px;"><div class="spinner"></div></div>
                    </div>
                    <div class="mini-chat-body" id="mini-chat-messages" style="display:none; flex:1; padding:16px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; background:rgba(0,0,0,0.02);"></div>
                    <form class="mini-chat-footer" id="mini-chat-footer" style="display:none; padding:12px 16px; border-top:1px solid var(--border-subtle); display:flex; gap:8px;" onsubmit="FloatingChat.sendMessage(event)">
                        <input type="text" class="mini-chat-input" id="mini-chat-input" style="flex:1; background:var(--bg-input); border:1px solid var(--border-subtle); color:var(--text-primary); padding:8px 12px; border-radius:20px; font-size:0.85rem;" placeholder="Type a message...">
                        <button type="submit" class="btn btn-primary btn-sm btn-icon" style="border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; padding:0;"><span data-icon="airplane" data-size="14"></span></button>
                    </form>
                </div>
            `;
            document.body.appendChild(root);
        }
        this.renderIcons();
    },

    renderIcons() {
        if (window.getIcon) {
            document.querySelectorAll('#floating-chat-root [data-icon]').forEach(el => {
                const name = el.getAttribute('data-icon');
                const size = el.getAttribute('data-size') || 16;
                el.innerHTML = getIcon(name, size);
            });
            // Attach back and expand icons
            const backBtn = document.getElementById('mini-chat-back');
            if (backBtn) backBtn.innerHTML = getIcon('arrow-left', 16);
            const expandBtn = document.getElementById('mini-chat-expand');
            if (expandBtn) expandBtn.innerHTML = getIcon('expand', 16);
            const closeBtn = document.querySelector('#mini-chat-window .close-btn');
            if (closeBtn) closeBtn.innerHTML = getIcon('x', 16);
        }
    },

    toggleWindow() {
        const win = document.getElementById('mini-chat-window');
        if (this.isOpen) {
            this.closeChat();
        } else {
            win.style.display = 'flex';
            this.isOpen = true;
            this.showList();
        }
    },

    async showList() {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        this.activeChatId = null;

        document.getElementById('mini-chat-back').style.display = 'none';
        document.getElementById('mini-chat-expand').style.display = 'block';
        document.getElementById('mini-chat-title').textContent = 'Messages';
        document.getElementById('mini-chat-list').style.display = 'flex';
        document.getElementById('mini-chat-messages').style.display = 'none';
        document.getElementById('mini-chat-footer').style.display = 'none';

        const listEl = document.getElementById('mini-chat-list');
        listEl.innerHTML = '<div class="loading" style="display:flex; justify-content:center; padding:40px;"><div class="spinner"></div></div>';

        try {
            const privateData = await API.getChats().catch(() => ({ chats: [] }));
            let joinedGroups = [];
            const user = (typeof currentUser !== 'undefined' ? currentUser : null) || window.currentUser;
            if (user && (user.role === 'student' || user.role === 'admin')) {
                const groupsData = await API.getGroups().catch(() => ({ groups: [] }));
                joinedGroups = (groupsData.groups || []).filter(g => g.isMember);
            }

            const allItems = [
                ...joinedGroups.map(g => ({
                    id: g.id,
                    isGroup: true,
                    name: g.name,
                    avatarUrl: g.avatarUrl || null,
                    flag: g.flag,
                    subtitle: g.description || 'Group chat'
                })),
                ...(privateData.chats || []).map(c => ({
                    id: c.id,
                    isGroup: false,
                    name: c.otherUserName,
                    avatarUrl: c.otherUserAvatar,
                    flag: null,
                    subtitle: c.serviceName || 'Private message'
                }))
            ];

            if (allItems.length === 0) {
                listEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:20px;text-align:center;">No messages yet.</p>';
                return;
            }

            listEl.innerHTML = allItems.map(item => {
                let avatarHtml = '';
                if (item.isGroup) {
                    if (item.avatarUrl) {
                        avatarHtml = `
                            <div class="chat-item-avatar" style="width:32px;height:32px;border-radius:8px;background:var(--gradient-primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;overflow:hidden;">
                                <img src="${item.avatarUrl}" style="width:100%;height:100%;object-fit:cover;">
                            </div>
                        `;
                    } else {
                        avatarHtml = `<div class="chat-item-avatar" style="width:32px;height:32px;border-radius:8px;background:var(--gradient-primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;"><span data-icon="${item.flag || 'globe'}" data-size="14"></span></div>`;
                    }
                } else {
                    avatarHtml = `
                        <div class="chat-item-avatar" style="width:32px;height:32px;border-radius:8px;background:var(--gradient-primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;overflow:hidden;">
                            ${item.avatarUrl 
                                ? `<img src="${item.avatarUrl}" style="width:100%;height:100%;object-fit:cover;">`
                                : item.name.charAt(0)
                            }
                        </div>
                    `;
                }

                return `
                    <div class="chat-item" onclick="FloatingChat.selectConversation(${item.id}, ${item.isGroup}, '${item.name.replace(/'/g, "\\'")}')" style="display:flex;align-items:center;gap:10px;padding:8px;cursor:pointer;border-radius:8px;border-bottom:1px solid var(--border-subtle);transition:background 0.2s;">
                        ${avatarHtml}
                        <div style="flex:1;overflow:hidden;">
                            <div style="font-weight:700;font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
                            <div style="font-size:0.75rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.subtitle}</div>
                        </div>
                    </div>
                `;
            }).join('');

            // Render newly generated icons
            listEl.querySelectorAll('[data-icon]').forEach(el => {
                const name = el.getAttribute('data-icon');
                const size = el.getAttribute('data-size') || 14;
                el.innerHTML = getIcon(name, size);
            });

        } catch (e) {
            listEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:20px;text-align:center;">Failed to load messages.</p>';
        }
    },

    selectConversation(id, isGroup, name) {
        this.activeChatId = id;
        this.activeChatIsGroup = isGroup;

        document.getElementById('mini-chat-back').style.display = 'block';
        document.getElementById('mini-chat-expand').style.display = 'block';
        document.getElementById('mini-chat-title').textContent = name;
        document.getElementById('mini-chat-list').style.display = 'none';
        
        const messagesEl = document.getElementById('mini-chat-messages');
        messagesEl.style.display = 'flex';
        messagesEl.innerHTML = '<div class="loading" style="display:flex; justify-content:center; padding:40px;"><div class="spinner"></div></div>';
        document.getElementById('mini-chat-footer').style.display = 'flex';

        this.loadMessages();
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        this.pollingInterval = setInterval(() => this.loadMessages(), 4000);
    },

    async loadMessages() {
        if (!this.activeChatId) return;
        try {
            let messages = [];
            if (this.activeChatIsGroup) {
                const data = await API.getMessages(this.activeChatId);
                messages = data.messages || [];
            } else {
                const data = await API.getChat(this.activeChatId);
                messages = data.messages || [];
            }

            const container = document.getElementById('mini-chat-messages');
            if (messages.length === 0) {
                container.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;text-align:center;padding:20px 0;">No messages yet. Say hello!</p>';
                return;
            }

            const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;

            container.innerHTML = messages.map(m => {
                const user = (typeof currentUser !== 'undefined' ? currentUser : null) || window.currentUser;
                const isMe = user && m.senderId === user.id;
                return `
                    <div style="max-width:85%; align-self:${isMe ? 'flex-end' : 'flex-start'}; padding:8px 12px; border-radius:12px; background:${isMe ? 'rgba(59,130,246,0.15)' : 'var(--bg-input)'}; border:1px solid var(--border-subtle); font-size:0.82rem; margin-bottom:4px;">
                        ${(this.activeChatIsGroup && !isMe) ? `<div style="font-weight:700;font-size:0.7rem;color:var(--accent-blue);margin-bottom:2px;">${m.senderName}</div>` : ''}
                        <div>${m.text}</div>
                        <div style="font-size: 0.6rem; opacity: 0.6; text-align: right; margin-top: 4px;">${new Date(m.sentAt || m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                `;
            }).join('');

            if (wasAtBottom) {
                container.scrollTop = container.scrollHeight;
            }
        } catch (e) {
            console.error('Failed to load messages in popover', e);
        }
    },

    async sendMessage(e) {
        e.preventDefault();
        const input = document.getElementById('mini-chat-input');
        const text = input.value.trim();
        if (!text || !this.activeChatId) return;

        try {
            if (this.activeChatIsGroup) {
                await API.sendMessage(this.activeChatId, text);
            } else {
                await API.sendPrivateMessage(this.activeChatId, text);
            }
            input.value = '';
            this.loadMessages();
        } catch (e) {
            showToast('Failed to send message', 'error');
        }
    },

    closeChat() {
        document.getElementById('mini-chat-window').style.display = 'none';
        this.isOpen = false;
        this.activeChatId = null;
        if (this.pollingInterval) clearInterval(this.pollingInterval);
    },

    toggleMaximize() {
        if (this.activeChatId) {
            if (this.activeChatIsGroup) {
                window.location.href = `/chats.html?groupId=${this.activeChatId}`;
            } else {
                window.location.href = `/chats.html?id=${this.activeChatId}`;
            }
        } else {
            window.location.href = '/chats.html';
        }
    }
};

// Auto-init for logged in users
function tryInitFloatingChat() {
    if (window.location.pathname === '/chats.html') {
        return;
    }
    const user = (typeof currentUser !== 'undefined' ? currentUser : null) || window.currentUser;
    if (user) {
        FloatingChat.init();
    }
}

// Check immediately in case authChecked already fired
tryInitFloatingChat();

// Also listen for authChecked event in case it fires later
document.addEventListener('authChecked', tryInitFloatingChat);
