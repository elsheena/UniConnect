function getIconNode(name, size = 14) {
  const svgText = getIcon(name, size);
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  return doc.documentElement;
}

class ChatItemComponent {
  constructor(item, isActive, onClick) {
    this.item = item;
    this.isActive = isActive;
    this.onClick = onClick;
  }

  render() {
    const root = document.createElement('div');
    root.className = `chat-item${this.isActive ? ' active' : ''}`;
    root.addEventListener('click', () => this.onClick(this.item.id, this.item.isGroup));

    const avatar = document.createElement('div');
    avatar.className = 'chat-item-avatar';

    if (this.item.isGroup) {
      if (this.item.avatarUrl) {
        avatar.style.overflow = 'hidden';
        const img = document.createElement('img');
        img.src = this.item.avatarUrl;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = 'inherit';
        avatar.appendChild(img);
      } else {
        avatar.style.background = 'var(--gradient-primary)';
        avatar.style.color = 'white';
        const span = document.createElement('span');
        span.setAttribute('data-icon', this.item.flag || 'globe');
        span.setAttribute('data-size', '16');
        avatar.appendChild(span);
      }
    } else {
      if (this.item.avatarUrl) {
        avatar.style.overflow = 'hidden';
        const img = document.createElement('img');
        img.src = this.item.avatarUrl;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = 'inherit';
        avatar.appendChild(img);
      } else {
        avatar.textContent = this.item.name.charAt(0);
      }
    }

    const info = document.createElement('div');
    info.className = 'chat-item-info';

    const name = document.createElement('div');
    name.className = 'chat-item-name';
    name.textContent = this.item.name;

    const subtitle = document.createElement('div');
    subtitle.className = 'chat-item-last';
    subtitle.textContent = this.item.subtitle;

    info.appendChild(name);
    info.appendChild(subtitle);

    root.appendChild(avatar);
    root.appendChild(info);

    return root;
  }
}

class MemberItemComponent {
  constructor(member, isModOrAdmin = false, currentUserId = null) {
    this.member = member;
    this.isModOrAdmin = isModOrAdmin;
    this.currentUserId = currentUserId;
  }

  render() {
    const root = document.createElement('div');
    root.className = 'member-item';

    const leftContainer = document.createElement('div');
    leftContainer.className = 'member-item-left';

    const avatar = document.createElement('div');
    avatar.className = 'member-avatar';
    avatar.textContent = this.member.fullName.charAt(0);

    const info = document.createElement('div');
    info.className = 'member-info';

    const name = document.createElement('div');
    name.className = 'member-name';
    name.textContent = this.member.fullName;

    if (this.member.role === 'admin' || this.member.role === 'moderator') {
      const roleSpan = document.createElement('span');
      roleSpan.className = `badge badge-${this.member.role === 'admin' ? 'red' : 'purple'} member-status-badge`;
      roleSpan.textContent = this.member.role.toUpperCase();
      name.appendChild(roleSpan);
    }
    if (this.member.isMuted) {
      const muteSpan = document.createElement('span');
      muteSpan.className = 'badge badge-gray member-status-badge';
      muteSpan.textContent = 'MUTED';
      name.appendChild(muteSpan);
    }
    if (this.member.isBanned) {
      const banSpan = document.createElement('span');
      banSpan.className = 'badge badge-red member-status-badge';
      banSpan.textContent = 'BANNED';
      name.appendChild(banSpan);
    }

    const uni = document.createElement('div');
    uni.className = 'member-uni';
    uni.textContent = this.member.universityName || '';

    info.appendChild(name);
    info.appendChild(uni);

    leftContainer.appendChild(avatar);
    leftContainer.appendChild(info);
    root.appendChild(leftContainer);

    if (this.isModOrAdmin && this.member.id !== this.currentUserId && this.member.role !== 'admin') {
      const actions = document.createElement('div');
      actions.className = 'member-actions';

      const muteBtn = document.createElement('button');
      muteBtn.className = 'btn btn-icon btn-sm member-action-btn';
      muteBtn.style.color = this.member.isMuted ? 'var(--accent-green)' : 'var(--text-muted)';
      muteBtn.title = this.member.isMuted ? 'Unmute User' : 'Mute User';
      muteBtn.appendChild(getIconNode(this.member.isMuted ? 'volume-2' : 'volume-x', 14));
      muteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const nextAction = this.member.isMuted ? 'unmute' : 'mute';
        if (confirm(`Are you sure you want to ${nextAction} ${this.member.fullName}?`)) {
          try {
            await API.moderateUser(this.member.id, nextAction);
            showToast(`User ${nextAction}d successfully!`);
            if (window.currentPageInstance && window.currentPageInstance.refreshMessages) {
              window.currentPageInstance.refreshMessages();
            }
          } catch (err) {
            showToast(err.error || 'Action failed.', 'error');
          }
        }
      });
      actions.appendChild(muteBtn);

      const banBtn = document.createElement('button');
      banBtn.className = 'btn btn-icon btn-sm member-action-btn';
      banBtn.style.color = this.member.isBanned ? 'var(--accent-green)' : 'var(--accent-red)';
      banBtn.title = this.member.isBanned ? 'Unban User' : 'Ban User';
      banBtn.appendChild(getIconNode('shield', 14));
      banBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const nextAction = this.member.isBanned ? 'unban' : 'ban';
        if (confirm(`Are you sure you want to ${nextAction} ${this.member.fullName}?`)) {
          try {
            await API.moderateUser(this.member.id, nextAction);
            showToast(`User ${nextAction}d successfully!`);
            if (window.currentPageInstance && window.currentPageInstance.refreshMessages) {
              window.currentPageInstance.refreshMessages();
            }
          } catch (err) {
            showToast(err.error || 'Action failed.', 'error');
          }
        }
      });
      actions.appendChild(banBtn);

      root.appendChild(actions);
    }

    return root;
  }
}

class MessageBubbleComponent {
  constructor(msg, currentUser, isGroup, otherUserAvatar, otherUserName, onContextMenu) {
    this.msg = msg;
    this.currentUser = currentUser;
    this.isGroup = isGroup;
    this.otherUserAvatar = otherUserAvatar;
    this.otherUserName = otherUserName;
    this.onContextMenu = onContextMenu;
  }

  render() {
    const isOwn = this.msg.senderId === this.currentUser.id;
    const totalMP = (this.msg.reactions || []).reduce((acc, r) => acc + (r.amount || 0), 0);

    const root = document.createElement('div');
    root.className = `chat-msg${isOwn ? ' own' : ''}`;
    root.addEventListener('contextmenu', (e) => this.onContextMenu(e, this.msg.id, this.msg.senderId, isOwn));

    if (!isOwn) {
      const avatar = document.createElement('div');
      avatar.className = 'msg-avatar';
      avatar.style.display = 'flex';
      avatar.style.alignItems = 'center';
      avatar.style.justifyContent = 'center';
      avatar.style.background = 'var(--gradient-primary)';
      avatar.style.color = 'white';
      avatar.style.fontWeight = '700';
      avatar.style.fontSize = '0.75rem';
      avatar.style.borderRadius = '6px';
      avatar.style.width = '24px';
      avatar.style.height = '24px';
      avatar.style.textTransform = 'uppercase';
      avatar.style.overflow = 'hidden';
      avatar.style.flexShrink = '0';
      avatar.style.cursor = 'pointer';
      avatar.addEventListener('click', () => {
        window.location.href = `/user-details?id=${this.msg.senderId}`;
      });

      const avatarSrc = this.isGroup ? this.msg.senderAvatar : this.otherUserAvatar;
      if (avatarSrc) {
        const img = document.createElement('img');
        img.src = avatarSrc;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = 'inherit';
        avatar.appendChild(img);
      } else {
        const charName = this.isGroup ? this.msg.senderName : this.otherUserName;
        avatar.textContent = charName ? charName.charAt(0) : '';
      }
      root.appendChild(avatar);
    }

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    if (this.isGroup && !isOwn) {
      const senderName = document.createElement('div');
      senderName.className = 'msg-sender';
      senderName.textContent = this.msg.senderName;
      bubble.appendChild(senderName);
    }

    const text = document.createElement('div');
    text.className = 'msg-text';
    text.textContent = this.msg.text;

    if (this.msg.isEdited) {
      const editedSpan = document.createElement('span');
      editedSpan.className = 'msg-status-tag';
      editedSpan.textContent = ' (edited)';
      text.appendChild(editedSpan);
    }
    bubble.appendChild(text);

    if (totalMP > 0) {
      const reactions = document.createElement('div');
      reactions.className = 'msg-reactions';
      const badge = document.createElement('div');
      badge.className = 'reaction-badge';
      
      const iconImg = document.createElement('img');
      iconImg.src = '/img/logo_small.png';
      iconImg.alt = 'MP';
      iconImg.style.width = '14px';

      const mpText = document.createTextNode(` ${totalMP}`);
      
      badge.appendChild(iconImg);
      badge.appendChild(mpText);
      reactions.appendChild(badge);
      bubble.appendChild(reactions);
    }

    const timeDiv = document.createElement('div');
    timeDiv.className = 'msg-time';
    timeDiv.style.fontSize = '0.65rem';
    timeDiv.style.opacity = '0.6';
    timeDiv.style.marginTop = '4px';

    const timeAgoStr = window.timeAgo ? timeAgo(this.msg.sentAt) : this.msg.sentAt;
    timeDiv.textContent = timeAgoStr;
    bubble.appendChild(timeDiv);

    root.appendChild(bubble);
    return root;
  }
}

class ChatsPage extends BasePage {
  constructor() {
    super('chats');
    this.activeChatId = null;
    this.activeChatIsGroup = false;
    this.chatInterval = null;
    this.activeMsgId = null;
  }

  async onInit() {
    window.currentPageInstance = this;
    // Hide chat windows initially
    const header = document.getElementById('chat-header-area');
    const inputArea = document.getElementById('chat-input-area');
    if (header) header.style.display = 'none';
    if (inputArea) inputArea.style.display = 'none';

    await this.loadChats();
    this.setupEventListeners();
  }

  setupEventListeners() {
    const input = document.getElementById('msg-input');
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendMsg();
        }
      });
    }

    const sendBtn = document.getElementById('btn-send-message');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMsg());
    }
  }

  async loadChats() {
    try {
      const privateData = await API.getChats().catch(() => ({ chats: [] }));
      
      let joinedGroups = [];
      if (this.user.role === 'student' || this.user.role === 'moderator' || this.user.role === 'admin') {
        const groupsData = await API.getGroups().catch(() => ({ groups: [] }));
        joinedGroups = (groupsData.groups || []).filter(g => g.isMember);
      }

      const list = document.getElementById('chats-list');
      if (!list) return;
      
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
        list.innerHTML = '';
        list.appendChild(new EmptyStateComponent('No messages yet.').render());
        return;
      }
      
      list.innerHTML = '';
      allItems.forEach(item => {
        const isActive = (this.activeChatId == item.id && this.activeChatIsGroup === item.isGroup);
        const comp = new ChatItemComponent(item, isActive, (id, isGroup) => this.selectChat(id, isGroup));
        list.appendChild(comp.render());
      });

      this.renderIcons(list);

      // URL parameters checking
      const urlParams = new URLSearchParams(window.location.search);
      const reqChatId = urlParams.get('id');
      const reqGroupId = urlParams.get('groupId');
      const reqBookingId = urlParams.get('bookingId');
      
      if (reqGroupId && !this.activeChatId) {
        this.selectChat(parseInt(reqGroupId), true);
      } else if (reqChatId && !this.activeChatId) {
        this.selectChat(reqChatId, false);
      } else if (reqBookingId && !this.activeChatId) {
        const target = (privateData.chats || []).find(c => c.bookingId == reqBookingId);
        if (target) this.selectChat(target.id, false);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async selectChat(id, isGroup) {
    if (this.chatInterval) clearInterval(this.chatInterval);
    this.activeChatId = id;
    this.activeChatIsGroup = isGroup;
    
    // Manage active state classes in UI list
    const list = document.getElementById('chats-list');
    if (list) {
      list.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    }
    
    // We render layout details
    const header = document.getElementById('chat-header-area');
    const inputArea = document.getElementById('chat-input-area');
    if (header) header.style.display = 'flex';
    if (inputArea) inputArea.style.display = 'flex';

    await this.refreshMessages();
    this.chatInterval = setInterval(() => this.refreshMessages(), 4000);
    this.loadChats(); // Refresh left sidebar list to show active highlight
  }

  async refreshMessages() {
    if (!this.activeChatId) return;
    try {
      let messages = [];
      let title = '';
      let subtitle = '';
      let otherUserAvatar = null;
      let otherUserName = '';
      
      const detailsContent = document.getElementById('details-content');
      if (!detailsContent) return;

      if (this.activeChatIsGroup) {
        const groupData = await API.getGroup(this.activeChatId);
        title = groupData.group.name;
        subtitle = groupData.group.description;
        
        const msgsData = await API.getMessages(this.activeChatId);
        messages = msgsData.messages || [];

        // Build Group details pane programmatically
        detailsContent.innerHTML = '';

        const mainDiv = document.createElement('div');
        mainDiv.style.textAlign = 'center';
        mainDiv.style.marginBottom = '20px';
        mainDiv.style.paddingBottom = '20px';
        mainDiv.style.borderBottom = '1px solid var(--border-subtle)';

        const avatarG = document.createElement('div');
        avatarG.style.fontSize = '3rem';
        avatarG.style.marginBottom = '12px';
        avatarG.style.display = 'inline-flex';
        avatarG.style.alignItems = 'center';
        avatarG.style.justifyContent = 'center';
        avatarG.style.width = '70px';
        avatarG.style.height = '70px';
        avatarG.style.borderRadius = '50%';
        avatarG.style.background = 'hsla(217, 91%, 60%, 0.1)';
        avatarG.style.color = 'var(--accent-blue)';
        
        const spanG = document.createElement('span');
        spanG.setAttribute('data-icon', groupData.group.flag || 'globe');
        spanG.setAttribute('data-size', '36');
        avatarG.appendChild(spanG);

        const h4G = document.createElement('h4');
        h4G.style.fontSize = '1.1rem';
        h4G.style.fontWeight = '700';
        h4G.style.marginBottom = '4px';
        h4G.textContent = groupData.group.name;

        const pG = document.createElement('p');
        pG.style.fontSize = '0.78rem';
        pG.style.color = 'var(--text-muted)';
        pG.style.lineHeight = '1.4';
        pG.textContent = groupData.group.description || '';

        mainDiv.appendChild(avatarG);
        mainDiv.appendChild(h4G);
        mainDiv.appendChild(pG);

        const membersDiv = document.createElement('div');
        membersDiv.style.flex = '1';
        membersDiv.style.display = 'flex';
        membersDiv.style.flexDirection = 'column';
        membersDiv.style.minHeight = '0';

        const h5M = document.createElement('h5');
        h5M.style.fontSize = '0.85rem';
        h5M.style.fontWeight = '700';
        h5M.style.textTransform = 'uppercase';
        h5M.style.color = 'var(--text-secondary)';
        h5M.style.marginBottom = '12px';
        h5M.style.letterSpacing = '0.5px';
        
        const members = groupData.members || [];
        h5M.textContent = `Members (${members.length})`;

        const listDiv = document.createElement('div');
        listDiv.style.flex = '1';
        listDiv.style.overflowY = 'auto';
        listDiv.style.paddingRight = '4px';

        const isModOrAdmin = this.user.role === 'admin' || this.user.role === 'moderator';
        if (members.length === 0) {
          const noMembers = document.createElement('p');
          noMembers.style.color = 'var(--text-muted)';
          noMembers.style.fontSize = '0.78rem';
          noMembers.textContent = 'No members yet.';
          listDiv.appendChild(noMembers);
        } else {
          members.forEach(m => {
            listDiv.appendChild(new MemberItemComponent(m, isModOrAdmin, this.user.id).render());
          });
        }

        membersDiv.appendChild(h5M);
        membersDiv.appendChild(listDiv);

        detailsContent.appendChild(mainDiv);
        detailsContent.appendChild(membersDiv);

      } else {
        const chatData = await API.getChat(this.activeChatId);
        title = chatData.otherUserName;
        subtitle = chatData.serviceName;
        messages = chatData.messages || [];
        otherUserAvatar = chatData.otherUserAvatar;
        otherUserName = chatData.otherUserName;

        // Fetch other user profile details
        const otherId = chatData.chat.studentId === this.user.id ? chatData.chat.applicantId : chatData.chat.studentId;
        const otherProfile = await API.getUser(otherId).catch(() => null);

        detailsContent.innerHTML = '';

        if (otherProfile && otherProfile.user) {
          const u = otherProfile.user;
          const initials = u.fullName.split(' ').map(n => n[0]).join('').substring(0, 2);

          const mainDiv = document.createElement('div');
          mainDiv.style.textAlign = 'center';
          mainDiv.style.marginBottom = '20px';
          mainDiv.style.paddingBottom = '20px';
          mainDiv.style.borderBottom = '1px solid var(--border-subtle)';

          const avatarU = document.createElement('div');
          avatarU.style.width = '70px';
          avatarU.style.height = '70px';
          avatarU.style.borderRadius = '50%';
          avatarU.style.background = 'var(--gradient-primary)';
          avatarU.style.margin = '0 auto 12px';
          avatarU.style.display = 'flex';
          avatarU.style.alignItems = 'center';
          avatarU.style.justifyContent = 'center';
          avatarU.style.fontWeight = '700';
          avatarU.style.fontSize = '1.5rem';
          avatarU.style.color = 'white';
          avatarU.style.overflow = 'hidden';

          if (u.avatarUrl && u.avatarStatus === 'approved') {
            const imgU = document.createElement('img');
            imgU.src = u.avatarUrl;
            imgU.style.width = '100%';
            imgU.style.height = '100%';
            imgU.style.objectFit = 'cover';
            avatarU.appendChild(imgU);
          } else {
            avatarU.textContent = initials;
          }

          const h4U = document.createElement('h4');
          h4U.style.fontSize = '1.1rem';
          h4U.style.fontWeight = '700';
          h4U.style.marginBottom = '4px';
          h4U.textContent = u.fullName;

          const roleP = document.createElement('p');
          roleP.style.fontSize = '0.8rem';
          roleP.style.color = 'var(--accent-blue)';
          roleP.style.textTransform = 'capitalize';
          roleP.style.fontWeight = '600';
          roleP.textContent = u.role;

          mainDiv.appendChild(avatarU);
          mainDiv.appendChild(h4U);
          mainDiv.appendChild(roleP);

          const infoList = document.createElement('div');
          infoList.style.display = 'flex';
          infoList.style.flexDirection = 'column';
          infoList.style.gap = '16px';
          infoList.style.fontSize = '0.82rem';

          const addInfoRow = (label, val) => {
            if (!val) return;
            const row = document.createElement('div');
            const lSpan = document.createElement('span');
            lSpan.style.color = 'var(--text-muted)';
            lSpan.style.fontSize = '0.75rem';
            lSpan.style.textTransform = 'uppercase';
            lSpan.textContent = label;
            row.appendChild(lSpan);
            row.appendChild(document.createElement('br'));
            const strongVal = document.createElement('strong');
            strongVal.textContent = val;
            row.appendChild(strongVal);
            infoList.appendChild(row);
          };

          addInfoRow('Email', u.email);
          addInfoRow('Phone', u.phoneNumber);
          addInfoRow('Nationality', u.nationality);
          addInfoRow('University', u.universityName);

          detailsContent.appendChild(mainDiv);
          detailsContent.appendChild(infoList);
        } else {
          detailsContent.appendChild(new EmptyStateComponent('No user details available.').render());
        }
      }

      this.renderIcons(detailsContent);

      const nameHeader = document.getElementById('chat-with-name');
      const serviceHeader = document.getElementById('chat-service-info');
      if (nameHeader) nameHeader.textContent = title;
      if (serviceHeader) serviceHeader.textContent = subtitle;
      
      const container = document.getElementById('chat-messages-area');
      if (!container) return;

      if (messages.length === 0) {
        container.innerHTML = '';
        container.appendChild(new EmptyStateComponent('No messages yet. Say hello!').render());
        return;
      }

      container.innerHTML = '';
      messages.forEach(m => {
        const bubbleComp = new MessageBubbleComponent(
          m,
          this.user,
          this.activeChatIsGroup,
          otherUserAvatar,
          otherUserName,
          (e, msgId, senderId, isOwn) => this.handleMsgContextMenu(e, msgId, senderId, isOwn)
        );
        container.appendChild(bubbleComp.render());
      });

      container.scrollTop = container.scrollHeight;
      this.renderIcons(container);
    } catch (e) {
      console.error(e);
    }
  }

  handleMsgContextMenu(e, msgId, senderId, isOwn) {
    e.preventDefault();
    this.activeMsgId = msgId;
    
    const old = document.querySelector('.context-menu');
    if (old) old.remove();

    const isAdmin = this.user.role === 'admin' || this.user.role === 'moderator';
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.top = `${e.pageY}px`;
    menu.style.left = `${e.pageX}px`;

    let itemAdded = false;

    if (!isOwn) {
      const react10 = document.createElement('div');
      react10.className = 'context-menu-item';
      const react10Icon = document.createElement('span');
      react10Icon.setAttribute('data-icon', 'heart');
      react10Icon.appendChild(getIconNode('heart', 14));
      react10.appendChild(react10Icon);
      react10.appendChild(document.createTextNode(' React (10 MP)'));
      react10.addEventListener('click', () => this.reactToMsg(10));
      menu.appendChild(react10);

      const react50 = document.createElement('div');
      react50.className = 'context-menu-item';
      const react50Icon = document.createElement('span');
      react50Icon.setAttribute('data-icon', 'star');
      react50Icon.appendChild(getIconNode('star', 14));
      react50.appendChild(react50Icon);
      react50.appendChild(document.createTextNode(' Super React (50 MP)'));
      react50.addEventListener('click', () => this.reactToMsg(50));
      menu.appendChild(react50);

      const reportItem = document.createElement('div');
      reportItem.className = 'context-menu-item danger';
      const reportIcon = document.createElement('span');
      reportIcon.setAttribute('data-icon', 'alert');
      reportIcon.appendChild(getIconNode('alert', 14));
      reportItem.appendChild(reportIcon);
      reportItem.appendChild(document.createTextNode(' Report Message'));
      reportItem.addEventListener('click', () => this.reportMsg());
      menu.appendChild(reportItem);

      itemAdded = true;
    }

    if (isOwn) {
      const editItem = document.createElement('div');
      editItem.className = 'context-menu-item';
      const editIcon = document.createElement('span');
      editIcon.setAttribute('data-icon', 'edit');
      editIcon.appendChild(getIconNode('edit', 14));
      editItem.appendChild(editIcon);
      editItem.appendChild(document.createTextNode(' Edit'));
      editItem.addEventListener('click', () => this.editMsg());
      menu.appendChild(editItem);
      itemAdded = true;
    }

    if (isOwn || isAdmin) {
      const deleteItem = document.createElement('div');
      deleteItem.className = 'context-menu-item danger';
      const deleteIcon = document.createElement('span');
      deleteIcon.setAttribute('data-icon', 'trash');
      deleteIcon.appendChild(getIconNode('trash', 14));
      deleteItem.appendChild(deleteIcon);
      deleteItem.appendChild(document.createTextNode(' Delete'));
      deleteItem.addEventListener('click', () => this.deleteMsg());
      menu.appendChild(deleteItem);
      itemAdded = true;
    }

    if (!itemAdded) return;

    document.body.appendChild(menu);
    const close = () => { menu.remove(); document.removeEventListener('click', close); };
    setTimeout(() => document.addEventListener('click', close), 10);
    this.renderIcons(menu);
  }

  async reactToMsg(amount) {
    try {
      if (this.activeChatIsGroup) {
        await API.reactGroupMessage(this.activeChatId, this.activeMsgId, amount);
      } else {
        await API.reactPrivateMessage(this.activeChatId, this.activeMsgId, amount);
      }
      showToast('Reacted!');
      this.refreshMessages();
    } catch (e) { showToast(e.error || 'Reaction failed.', 'error'); }
  }

  async reportMsg() {
    const reason = prompt("Enter the reason for reporting this message:");
    if (!reason || !reason.trim()) return;
    try {
      const chatType = this.activeChatIsGroup ? "group" : "private";
      await API.reportMessage(this.activeChatId, this.activeMsgId, chatType, reason.trim());
      showToast('Message reported successfully.', 'success');
    } catch (e) {
      showToast(e.error || 'Failed to report message.', 'error');
    }
  }

  async editMsg() {
    const msg = prompt("Edit message:");
    if (!msg || !msg.trim()) return;
    try {
      if (this.activeChatIsGroup) {
        await API.editGroupMessage(this.activeChatId, this.activeMsgId, msg.trim());
      } else {
        await API.editPrivateMessage(this.activeChatId, this.activeMsgId, msg.trim());
      }
      this.refreshMessages();
    } catch (e) { showToast(e.error || 'Edit failed.', 'error'); }
  }

  async deleteMsg() {
    if (!confirm("Delete message?")) return;
    try {
      if (this.activeChatIsGroup) {
        await API.deleteGroupMessage(this.activeChatId, this.activeMsgId);
      } else {
        await API.deletePrivateMessage(this.activeChatId, this.activeMsgId);
      }
      this.refreshMessages();
    } catch (e) { showToast(e.error || 'Delete failed.', 'error'); }
  }

  async sendMsg() {
    const input = document.getElementById('msg-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text || !this.activeChatId) return;
    input.value = '';
    try {
      if (this.activeChatIsGroup) {
        await API.sendMessage(this.activeChatId, text);
      } else {
        await API.sendPrivateMessage(this.activeChatId, text);
      }
      this.refreshMessages();
    } catch (e) {
      showToast('Failed to send message.', 'error');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ChatsPage().init();
});
