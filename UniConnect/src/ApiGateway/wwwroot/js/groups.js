let activeGroupId = null;
let chatInterval = null;

async function loadGroups() {
  const user = await checkAuth();
  if (!user) return window.location.href = '/login';
  if (user.role === 'applicant') {
    const pageContent = document.querySelector('.page-content');
    pageContent.innerHTML = '';
    
    const container = document.createElement('div');
    container.className = 'container';
    container.style.textAlign = 'center';
    container.style.padding = '80px 20px';
    
    const iconDiv = document.createElement('div');
    iconDiv.style.fontSize = '4rem';
    iconDiv.style.marginBottom = '20px';
    iconDiv.innerHTML = getIcon('shield', 64);
    
    const h1 = document.createElement('h1');
    h1.style.marginBottom = '12px';
    h1.textContent = 'Access Denied';
    
    const p = document.createElement('p');
    p.style.color = 'var(--text-muted)';
    p.style.marginBottom = '24px';
    p.textContent = 'Groups are only available for verified students. Applicants do not have access to this section.';
    
    const backLink = document.createElement('a');
    backLink.href = '/profile.html';
    backLink.className = 'btn btn-primary';
    backLink.textContent = 'Back to Profile';
    
    container.appendChild(iconDiv);
    container.appendChild(h1);
    container.appendChild(p);
    container.appendChild(backLink);
    pageContent.appendChild(container);
    
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
      grid.innerHTML = '';
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      const emptyP = document.createElement('p');
      emptyP.textContent = 'No groups available.';
      emptyDiv.appendChild(emptyP);
      grid.appendChild(emptyDiv);
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

    // Attach click event listeners programmatically to avoid inline JS in HTML
    const attachGroupCardListeners = (parentEl) => {
      if (!parentEl) return;
      parentEl.querySelectorAll('.group-card').forEach(card => {
        card.addEventListener('click', () => {
          const groupId = card.getAttribute('data-id');
          openGroup(groupId);
        });
      });
    };

    attachGroupCardListeners(recGrid);
    attachGroupCardListeners(grid);

  } catch (e) {
    document.getElementById('groups-grid').innerHTML = '';
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';
    const emptyP = document.createElement('p');
    emptyP.textContent = 'Failed to load groups.';
    emptyDiv.appendChild(emptyP);
    document.getElementById('groups-grid').appendChild(emptyDiv);
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
    actionsEl.innerHTML = '';
    
    if (data.isMember || currentUser.role === 'admin') {
      if (data.isMember) {
        const badge = document.createElement('span');
        badge.className = 'badge badge-green';
        badge.textContent = '✓ Member';
        
        const leaveBtn = document.createElement('button');
        leaveBtn.className = 'btn btn-sm btn-danger';
        leaveBtn.style.marginLeft = '8px';
        leaveBtn.textContent = 'Leave Group';
        leaveBtn.addEventListener('click', () => leaveGroup(groupId));
        
        actionsEl.appendChild(badge);
        actionsEl.appendChild(leaveBtn);
      } else {
        const badge = document.createElement('span');
        badge.className = 'badge badge-purple';
        badge.textContent = 'Admin Read-Only';
        actionsEl.appendChild(badge);
      }
        
      document.getElementById('chat-input-area').style.display = data.isMember ? 'flex' : 'none';
      loadMessages(groupId);
      if (chatInterval) clearInterval(chatInterval);
      chatInterval = setInterval(() => loadMessages(groupId), 5000);
    } else {
      const joinBtn = document.createElement('button');
      joinBtn.className = 'btn btn-primary btn-sm';
      joinBtn.textContent = 'Join Group';
      joinBtn.addEventListener('click', () => joinGroup(groupId));
      actionsEl.appendChild(joinBtn);
      
      document.getElementById('chat-input-area').style.display = 'none';
      
      const chatMsgs = document.getElementById('chat-messages');
      chatMsgs.innerHTML = '';
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      
      const iconDiv = document.createElement('div');
      iconDiv.className = 'empty-icon';
      const iconSpan = document.createElement('span');
      iconSpan.setAttribute('data-icon', 'lock');
      iconDiv.appendChild(iconSpan);
      
      const h3 = document.createElement('h3');
      h3.textContent = 'Join to see messages';
      
      const p = document.createElement('p');
      p.textContent = 'You need to be an approved member to access the chat.';
      
      emptyState.appendChild(iconDiv);
      emptyState.appendChild(h3);
      emptyState.appendChild(p);
      chatMsgs.appendChild(emptyState);
    }

    // Members
    const membersList = document.getElementById('members-list');
    if (data.members.length === 0) {
      membersList.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No members yet.</p>';
    } else {
      membersList.innerHTML = '';
      data.members.forEach(m => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'member-item';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'member-avatar';
        avatarDiv.textContent = m.fullName.charAt(0);
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'member-info';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'member-name';
        nameDiv.textContent = m.fullName + ' ';
        if (m.isRepresentative) {
          const starSpan = document.createElement('span');
          starSpan.setAttribute('data-icon', 'star');
          nameDiv.appendChild(starSpan);
        }
        
        const uniDiv = document.createElement('div');
        uniDiv.className = 'member-uni';
        uniDiv.textContent = m.universityName || '';
        
        infoDiv.appendChild(nameDiv);
        infoDiv.appendChild(uniDiv);
        itemDiv.appendChild(avatarDiv);
        itemDiv.appendChild(infoDiv);
        membersList.appendChild(itemDiv);
      });
    }

    // Re-render icons for header
    document.getElementById('group-title').querySelectorAll('[data-icon]').forEach(el => {
      el.innerHTML = getIcon(el.getAttribute('data-icon'), 24);
    });
    document.getElementById('chat-header').querySelectorAll('[data-icon]').forEach(el => {
      el.innerHTML = getIcon(el.getAttribute('data-icon'), 14);
    });
    membersList.querySelectorAll('[data-icon]').forEach(el => {
      el.innerHTML = getIcon(el.getAttribute('data-icon'), 12);
    });

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
      container.innerHTML = '';
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      
      const iconDiv = document.createElement('div');
      iconDiv.className = 'empty-icon';
      const iconSpan = document.createElement('span');
      iconSpan.setAttribute('data-icon', 'chat');
      iconDiv.appendChild(iconSpan);
      
      const h3 = document.createElement('h3');
      h3.textContent = 'No messages yet';
      
      const p = document.createElement('p');
      p.textContent = 'Start the conversation!';
      
      emptyState.appendChild(iconDiv);
      emptyState.appendChild(h3);
      emptyState.appendChild(p);
      container.appendChild(emptyState);
      
      container.querySelectorAll('[data-icon]').forEach(el => {
        el.innerHTML = getIcon(el.getAttribute('data-icon'), 20);
      });
      return;
    }

    container.innerHTML = '';
    data.messages.forEach(m => {
      const isOwn = m.senderId === currentUser.id;
      const totalMP = (m.reactions || []).reduce((acc, r) => acc + (r.amount || 0), 0);

      const msgDiv = document.createElement('div');
      msgDiv.className = `chat-msg ${isOwn ? 'own' : ''}`;
      msgDiv.addEventListener('contextmenu', (e) => {
        handleMsgContextMenu(e, m.id, m.senderId, isOwn);
      });

      if (!isOwn) {
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'msg-avatar';
        avatarDiv.style.display = 'flex';
        avatarDiv.style.alignItems = 'center';
        avatarDiv.style.justifyContent = 'center';
        avatarDiv.style.background = 'var(--gradient-primary)';
        avatarDiv.style.color = 'white';
        avatarDiv.style.fontWeight = '700';
        avatarDiv.style.fontSize = '0.75rem';
        avatarDiv.style.borderRadius = '6px';
        avatarDiv.style.width = '24px';
        avatarDiv.style.height = '24px';
        avatarDiv.style.textTransform = 'uppercase';
        avatarDiv.style.overflow = 'hidden';
        avatarDiv.style.flexShrink = '0';
        avatarDiv.addEventListener('click', () => {
          window.location.href = `/user-details.html?id=${m.senderId}`;
        });

        if (m.senderAvatar) {
          const avatarImg = document.createElement('img');
          avatarImg.src = m.senderAvatar;
          avatarImg.style.width = '100%';
          avatarImg.style.height = '100%';
          avatarImg.style.objectFit = 'cover';
          avatarImg.style.borderRadius = 'inherit';
          avatarDiv.appendChild(avatarImg);
        } else {
          avatarDiv.textContent = m.senderName.charAt(0);
        }
        msgDiv.appendChild(avatarDiv);
      }

      const bubbleDiv = document.createElement('div');
      bubbleDiv.className = 'msg-bubble';

      if (!isOwn) {
        const senderNameDiv = document.createElement('div');
        senderNameDiv.className = 'msg-sender';
        senderNameDiv.textContent = m.senderName;
        bubbleDiv.appendChild(senderNameDiv);
      }

      const textDiv = document.createElement('div');
      textDiv.className = 'msg-text';
      textDiv.textContent = m.text + ' ';
      
      if (m.isEdited) {
        const editedSpan = document.createElement('span');
        editedSpan.className = 'msg-status-tag';
        editedSpan.textContent = '(edited)';
        textDiv.appendChild(editedSpan);
      }
      bubbleDiv.appendChild(textDiv);

      if (totalMP > 0) {
        const reactionsDiv = document.createElement('div');
        reactionsDiv.className = 'msg-reactions';
        
        const reactionBadge = document.createElement('div');
        reactionBadge.className = 'reaction-badge';
        
        const logoImg = document.createElement('img');
        logoImg.src = '/img/logo_small.png';
        logoImg.alt = 'MP';
        
        reactionBadge.appendChild(logoImg);
        reactionBadge.appendChild(document.createTextNode(` ${totalMP}`));
        reactionsDiv.appendChild(reactionBadge);
        bubbleDiv.appendChild(reactionsDiv);
      }

      const timeDiv = document.createElement('div');
      timeDiv.className = 'msg-time';
      timeDiv.style.fontSize = '0.65rem';
      timeDiv.style.opacity = '0.6';
      timeDiv.style.marginTop = '4px';
      timeDiv.textContent = timeAgo(m.sentAt);
      
      bubbleDiv.appendChild(timeDiv);
      msgDiv.appendChild(bubbleDiv);
      container.appendChild(msgDiv);
    });
    
    container.scrollTop = container.scrollHeight;
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

  // React item
  if (!isOwn) {
    const reactBtn = document.createElement('div');
    reactBtn.className = 'context-menu-item';
    
    const heartIcon = document.createElement('span');
    heartIcon.setAttribute('data-icon', 'heart');
    reactBtn.appendChild(heartIcon);
    reactBtn.appendChild(document.createTextNode(' React (10 MP)'));
    reactBtn.addEventListener('click', () => reactToMsg(10));
    
    const superReactBtn = document.createElement('div');
    superReactBtn.className = 'context-menu-item';
    
    const starIcon = document.createElement('span');
    starIcon.setAttribute('data-icon', 'star');
    superReactBtn.appendChild(starIcon);
    superReactBtn.appendChild(document.createTextNode(' Super React (50 MP)'));
    superReactBtn.addEventListener('click', () => reactToMsg(50));
    
    menu.appendChild(reactBtn);
    menu.appendChild(superReactBtn);
  }

  // Edit item
  if (isOwn) {
    const editBtn = document.createElement('div');
    editBtn.className = 'context-menu-item';
    
    const editIcon = document.createElement('span');
    editIcon.setAttribute('data-icon', 'edit');
    editBtn.appendChild(editIcon);
    editBtn.appendChild(document.createTextNode(' Edit Message'));
    editBtn.addEventListener('click', editMsg);
    
    menu.appendChild(editBtn);
  }

  // Delete item
  if (isOwn || isAdmin) {
    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'context-menu-item danger';
    
    const trashIcon = document.createElement('span');
    trashIcon.setAttribute('data-icon', 'trash');
    deleteBtn.appendChild(trashIcon);
    deleteBtn.appendChild(document.createTextNode(' Delete Message'));
    deleteBtn.addEventListener('click', deleteMsg);
    
    menu.appendChild(deleteBtn);
  }

  if (menu.children.length === 0) return; // No actions available

  document.body.appendChild(menu);
  
  // Close menu on click elsewhere
  const close = () => { menu.remove(); document.removeEventListener('click', close); };
  setTimeout(() => document.addEventListener('click', close), 10);
  
  menu.querySelectorAll('[data-icon]').forEach(el => {
    el.innerHTML = getIcon(el.getAttribute('data-icon'), 14);
  });
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

document.addEventListener('DOMContentLoaded', () => {
  const backBtn = document.getElementById('btn-back-to-groups');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showGroupsList();
    });
  }

  const sendBtn = document.getElementById('btn-send-msg');
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMsg);
  }

  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMsg();
      }
    });
  }

  const cancelJoinBtn = document.getElementById('btn-cancel-join');
  if (cancelJoinBtn) {
    cancelJoinBtn.addEventListener('click', closeReasonModal);
  }

  const submitJoinBtn = document.getElementById('btn-submit-join');
  if (submitJoinBtn) {
    submitJoinBtn.addEventListener('click', submitJoinReason);
  }
});

loadGroups();
