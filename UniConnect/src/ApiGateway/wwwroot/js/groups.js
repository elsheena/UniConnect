let activeGroupId = null;
let chatInterval = null;

async function loadGroups() {
  const user = await checkAuth();
  if (!user) return window.location.href = '/login';
  if (user.role === 'applicant') {
    document.querySelector('.page-content').innerHTML = `
      <div class="container" style="text-align:center; padding:80px 20px;">
        <div style="font-size:4rem; margin-bottom:20px;">${getIcon('shield', 64)}</div>
        <h1 style="margin-bottom:12px;">Access Denied</h1>
        <p style="color:var(--text-muted); margin-bottom:24px;">Groups are only available for verified students. Applicants do not have access to this section.</p>
        <a href="/profile" class="btn btn-primary">Back to Profile</a>
      </div>`;
    Sidebar.render(user, 'groups');
    return;
  }
  Sidebar.render(user, 'groups');

  try {
    const data = await API.getGroups();
    const grid = document.getElementById('groups-grid');
    const recGrid = document.getElementById('recommended-grid');
    const recSection = document.getElementById('recommended-section');
    
    if (!data.groups || data.groups.length === 0) {
      grid.innerHTML = '<div class="empty-state"><p>No groups available.</p></div>';
      return;
    }

    let recommended = [];
    let others = [];

    data.groups.forEach(g => {
      let isRec = false;
      // Recommend University group
      if (g.isUniversityGroup && user.universityId === g.universityId) {
        isRec = true;
      }
      // Recommend Nationality group
      else if (g.isCountryGroup && user.nationality && g.name.includes(user.nationality)) {
        isRec = true;
      }

      if (isRec) recommended.push(g);
      else others.push(g);
    });

    // Ensure University group is at the top of recommended
    recommended.sort((a, b) => {
      if (a.isUniversityGroup && !b.isUniversityGroup) return -1;
      if (!a.isUniversityGroup && b.isUniversityGroup) return 1;
      return 0;
    });

    const cardTemplate = await fetchTemplate('/templates/group-card.html');
    const renderGroup = g => {
      const flagHtml = getIcon(g.flag || 'globe', 40);
      return renderTemplate(cardTemplate, {
        id: g.id,
        flagHtml,
        name: g.name,
        description: g.description,
        memberCount: g.memberCount
      });
    };

    if (recommended.length > 0) {
      recSection.style.display = 'block';
      recGrid.innerHTML = recommended.map(renderGroup).join('');
    } else {
      recSection.style.display = 'none';
    }

    grid.innerHTML = others.map(renderGroup).join('');
  } catch (e) {
    document.getElementById('groups-grid').innerHTML = '<div class="empty-state"><p>Failed to load groups.</p></div>';
  }
}

function showGroupsList() {
  document.getElementById('groups-list-view').style.display = 'block';
  document.getElementById('group-detail-view').style.display = 'none';
  activeGroupId = null;
  if (chatInterval) clearInterval(chatInterval);
}

async function openGroup(groupId) {
  activeGroupId = groupId;
  document.getElementById('groups-list-view').style.display = 'none';
  document.getElementById('group-detail-view').style.display = 'block';

  try {
    const data = await API.getGroup(groupId);
    const group = data.group;
    document.getElementById('group-title').innerHTML = `${getIcon(group.flag || 'globe', 24)} ${group.name}`;
    document.getElementById('group-desc').textContent = group.description;
    document.getElementById('chat-header').innerHTML = `<span data-icon="chat"></span> ${group.name} — Chat`;

    // Actions
    const actionsEl = document.getElementById('group-actions');
    if (data.isMember || currentUser.role === 'admin') {
      actionsEl.innerHTML = data.isMember ? 
        `<span class="badge badge-green">✓ Member</span> <button class="btn btn-sm btn-danger" onclick="leaveGroup(${groupId})">Leave Group</button>` :
        `<span class="badge badge-purple">Admin Read-Only</span>`;
        
      document.getElementById('chat-input-area').style.display = data.isMember ? 'flex' : 'none';
      loadMessages(groupId);
      chatInterval = setInterval(() => loadMessages(groupId), 5000);
    } else {
      actionsEl.innerHTML = `<button class="btn btn-primary btn-sm" onclick="joinGroup(${groupId})">Join Group</button>`;
      document.getElementById('chat-input-area').style.display = 'none';
      document.getElementById('chat-messages').innerHTML = '<div class="empty-state"><div class="empty-icon"><span data-icon="lock"></span></div><h3>Join to see messages</h3><p>You need to be an approved member to access the chat.</p></div>';
    }

    // Members
    const membersList = document.getElementById('members-list');
    if (data.members.length === 0) {
      membersList.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No members yet.</p>';
    } else {
      membersList.innerHTML = data.members.map(m => `
        <div class="member-item">
          <div class="member-avatar">${m.fullName.charAt(0)}</div>
          <div class="member-info">
            <div class="member-name">${m.fullName} ${m.isRepresentative ? '<span data-icon="star"></span>' : ''}</div>
            <div class="member-uni">${m.universityName || ''}</div>
          </div>
        </div>
      `).join('');
    }
  } catch (e) {
    showToast(e.error || 'Failed to load group.', 'error');
    showGroupsList();
  }
}

let pendingJoinGroupId = null;

async function joinGroup(groupId) {
  try {
    const res = await API.joinGroup(groupId);
    showToast(res.message || 'You joined the group!');
    openGroup(groupId);
  } catch (e) {
    if (e.requiresReason) {
      pendingJoinGroupId = groupId;
      document.getElementById('reason-modal').classList.add('active');
    } else {
      showToast(e.error || 'Failed to join group.', 'error');
    }
  }
}

function closeReasonModal() {
  document.getElementById('reason-modal').classList.remove('active');
  document.getElementById('join-reason').value = '';
  pendingJoinGroupId = null;
}

async function submitJoinReason() {
  if (!pendingJoinGroupId) return;
  const reason = document.getElementById('join-reason').value.trim();
  if (!reason) return showToast('Please enter a reason.', 'error');

  try {
    const res = await API.joinGroup(pendingJoinGroupId, { reason });
    showToast(res.message || 'Request sent successfully!');
    closeReasonModal();
  } catch (e) {
    showToast(e.error || 'Failed to send request.', 'error');
  }
}

async function leaveGroup(groupId) {
  try {
    await API.leaveGroup(groupId);
    showToast('You left the group.');
    if (chatInterval) clearInterval(chatInterval);
    openGroup(groupId);
  } catch (e) {
    showToast(e.error || 'Failed to leave group.', 'error');
  }
}

async function loadMessages(groupId) {
  try {
    const data = await API.getMessages(groupId);
    const container = document.getElementById('chat-messages');
    if (!data.messages) return;

    if (data.messages.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon"><span data-icon="chat"></span></div><h3>No messages yet</h3><p>Start the conversation!</p></div>';
      return;
    }

    container.innerHTML = data.messages.map(m => {
      const isOwn = m.senderId === currentUser.id;
      const totalMP = (m.reactions || []).reduce((acc, r) => acc + (r.amount || 0), 0);

      return `
        <div class="chat-msg ${isOwn ? 'own' : ''}" oncontextmenu="handleMsgContextMenu(event, ${m.id}, ${m.senderId}, ${isOwn})">
          ${!isOwn ? `
            <div class="msg-avatar" onclick="window.location.href='/user-details?id=${m.senderId}'" style="display: flex; align-items: center; justify-content: center; background: var(--gradient-primary); color: white; font-weight: 700; font-size: 0.75rem; border-radius: 6px; width: 24px; height: 24px; text-transform: uppercase; overflow: hidden; flex-shrink: 0;">
              ${m.senderAvatar 
                ? `<img src="${m.senderAvatar}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;">`
                : m.senderName.charAt(0)
              }
            </div>
          ` : ''}
          <div class="msg-bubble">
            ${!isOwn ? `<div class="msg-sender">${m.senderName}</div>` : ''}
            <div class="msg-text">
              ${m.text}
              ${m.isEdited ? '<span class="msg-status-tag">(edited)</span>' : ''}
            </div>
            ${totalMP > 0 ? `
              <div class="msg-reactions">
                <div class="reaction-badge">
                  <img src="/img/logo_small.png" alt="MP"> ${totalMP}
                </div>
              </div>
            ` : ''}
            <div class="msg-time" style="font-size:0.65rem; opacity:0.6; margin-top:4px;">${timeAgo(m.sentAt)}</div>
          </div>
        </div>
      `;
    }).join('');
    container.scrollTop = container.scrollHeight;
    renderIcons();
  } catch {}
}

// Context Menu Logic
let activeMsgId = null;
function handleMsgContextMenu(e, msgId, senderId, isOwn) {
  e.preventDefault();
  activeMsgId = msgId;
  
  // Remove existing
  const old = document.querySelector('.context-menu');
  if (old) old.remove();

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'moderator';
  
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.top = `${e.pageY}px`;
  menu.style.left = `${e.pageX}px`;

  let items = '';
  
  // Anyone can react (if not self)
  if (!isOwn) {
    items += `
      <div class="context-menu-item" onclick="reactToMsg(10)">
        <span data-icon="heart"></span> React (10 MP)
      </div>
      <div class="context-menu-item" onclick="reactToMsg(50)">
        <span data-icon="star"></span> Super React (50 MP)
      </div>
    `;
  }

  // Own or Admin can edit/delete
  if (isOwn) {
    items += `
      <div class="context-menu-item" onclick="editMsg()">
        <span data-icon="edit"></span> Edit Message
      </div>
    `;
  }

  if (isOwn || isAdmin) {
    items += `
      <div class="context-menu-item danger" onclick="deleteMsg()">
        <span data-icon="trash"></span> Delete Message
      </div>
    `;
  }

  if (!items) return; // No actions available

  menu.innerHTML = items;
  document.body.appendChild(menu);
  
  // Close menu on click elsewhere
  const close = () => { menu.remove(); document.removeEventListener('click', close); };
  setTimeout(() => document.addEventListener('click', close), 10);
  
  renderIcons();
}

async function reactToMsg(amount) {
  try {
    await API.reactGroupMessage(activeGroupId, activeMsgId, amount);
    showToast(`Reacted with ${amount} MP!`, 'success');
    loadMessages(activeGroupId);
  } catch (e) {
    showToast(e.error || 'Reaction failed.', 'error');
  }
}

async function editMsg() {
  const msg = prompt("Edit your message:");
  if (!msg || !msg.trim()) return;
  try {
    await API.editGroupMessage(activeGroupId, activeMsgId, msg.trim());
    loadMessages(activeGroupId);
  } catch (e) {
    showToast(e.error || 'Edit failed.', 'error');
  }
}

async function deleteMsg() {
  if (!confirm("Are you sure you want to delete this message?")) return;
  try {
    await API.deleteGroupMessage(activeGroupId, activeMsgId);
    loadMessages(activeGroupId);
  } catch (e) {
    showToast(e.error || 'Delete failed.', 'error');
  }
}

function timeAgo(iso) {
  const d = new Date(iso);
  return d.getHours() + ":" + d.getMinutes().toString().padStart(2, '0');
}

async function sendMsg() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || !activeGroupId) return;
  input.value = '';
  try {
    await API.sendMessage(activeGroupId, text);
    loadMessages(activeGroupId);
  } catch (e) {
    showToast(e.error || 'Failed to send message.', 'error');
  }
}

loadGroups();
