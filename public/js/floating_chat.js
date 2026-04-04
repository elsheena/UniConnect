/**
 * Floating Chat Bubbles Logic
 * Handles recent chat display and mini-popup interactions
 */

const FloatingChat = {
    recentChats: [],
    activeChatId: null,
    pollingInterval: null,

    init() {
        // Create container if not exists
        if (!document.getElementById('floating-chat-root')) {
            const root = document.createElement('div');
            root.id = 'floating-chat-root';
            root.innerHTML = `
                <div class="floating-chat-container" id="chat-bubbles-container"></div>
                <div class="mini-chat-window" id="mini-chat-window">
                    <div class="mini-chat-header">
                        <h4 id="mini-chat-title">Chat</h4>
                        <div class="mini-chat-controls">
                            <button onclick="FloatingChat.toggleMaximize()"><span data-icon="airplane"></span></button>
                            <button onclick="FloatingChat.closeChat()"><span data-icon="x"></span></button>
                        </div>
                    </div>
                    <div class="mini-chat-body" id="mini-chat-messages"></div>
                    <form class="mini-chat-footer" onsubmit="FloatingChat.sendMessage(event)">
                        <input type="text" class="mini-chat-input" id="mini-chat-input" placeholder="Type a message...">
                        <button type="submit" class="btn btn-primary btn-sm btn-icon"><span data-icon="airplane"></span></button>
                    </form>
                </div>
            `;
            document.body.appendChild(root);
        }

        this.updateBubbles();
        setInterval(() => this.updateBubbles(), 10000); // Update every 10s
    },

    async updateBubbles() {
        try {
            const chats = await API.getChats();
            // Sort by latest message or created date
            this.recentChats = chats.chats.slice(0, 3);
            this.renderBubbles();
        } catch (e) {
            console.warn('Failed to fetch chats for floating bubbles');
        }
    },

    renderBubbles() {
        const container = document.getElementById('chat-bubbles-container');
        container.innerHTML = this.recentChats.map(chat => {
            const otherUser = chat.otherUser || { fullName: 'User' };
            const initials = otherUser.fullName.split(' ').map(n => n[0]).join('').substring(0, 2);
            return `
                <div class="chat-bubble" onclick="FloatingChat.openChat(${chat.id}, '${otherUser.fullName}')" title="${otherUser.fullName}">
                    ${otherUser.avatar ? `<img src="${otherUser.avatar}">` : `<div class="bubble-initials">${initials}</div>`}
                    ${chat.unreadCount > 0 ? `<div class="badge">${chat.unreadCount}</div>` : ''}
                </div>
            `;
        }).join('');

        // Render icons in bubbles if any
        if (window.getIcon) {
            document.querySelectorAll('#floating-chat-root [data-icon]').forEach(el => {
                const name = el.getAttribute('data-icon');
                el.innerHTML = getIcon(name, 16);
            });
        }
    },

    async openChat(chatId, title) {
        this.activeChatId = chatId;
        document.getElementById('mini-chat-title').textContent = title;
        document.getElementById('mini-chat-window').style.display = 'flex';
        this.loadMessages();
        
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        this.pollingInterval = setInterval(() => this.loadMessages(), 3000);
    },

    async loadMessages() {
        if (!this.activeChatId) return;
        try {
            const data = await API.getChat(this.activeChatId);
            const container = document.getElementById('mini-chat-messages');
            const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;

            container.innerHTML = data.messages.map(m => {
                const isMe = m.senderId === currentUser.id;
                return `
                    <div class="message ${isMe ? 'own' : ''}" style="max-width: 85%; align-self: ${isMe ? 'flex-end' : 'flex-start'}; padding: 8px 12px; border-radius: 12px; background: ${isMe ? 'var(--accent-blue-soft)' : 'var(--bg-hover)'}; font-size: 0.82rem; margin-bottom: 4px;">
                        ${m.text}
                        <div style="font-size: 0.65rem; opacity: 0.6; text-align: right; margin-top: 4px;">${new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                `;
            }).join('');

            if (wasAtBottom) {
                container.scrollTop = container.scrollHeight;
            }
        } catch (e) {
            console.error('Failed to load mini-chat messages');
        }
    },

    async sendMessage(e) {
        e.preventDefault();
        const input = document.getElementById('mini-chat-input');
        const text = input.value.trim();
        if (!text || !this.activeChatId) return;

        try {
            await API.sendPrivateMessage(this.activeChatId, text);
            input.value = '';
            this.loadMessages();
        } catch (e) {
            showToast('Failed to send message', 'error');
        }
    },

    closeChat() {
        document.getElementById('mini-chat-window').style.display = 'none';
        this.activeChatId = null;
        if (this.pollingInterval) clearInterval(this.pollingInterval);
    },

    toggleMaximize() {
        if (this.activeChatId) {
            window.location.href = `/chats.html?id=${this.activeChatId}`;
        }
    }
};

// Auto-init for logged in users
document.addEventListener('authChecked', () => {
    if (window.currentUser) {
        FloatingChat.init();
    }
});
