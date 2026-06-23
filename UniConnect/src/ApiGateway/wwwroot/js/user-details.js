let targetUser = null;

async function initPage() {
  currentUser = await checkAuth();
  Sidebar.render(currentUser, 'community');

  const params = new URLSearchParams(window.location.search);
  const userId = params.get('id');
  if (!userId) return window.location.href = '/groups';

  try {
    const data = await API.request('GET', `/api/users/${userId}`);
    targetUser = data.user;
    renderProfile();
  } catch (e) {
    const pc = document.getElementById('profile-container');
    if (pc) {
      pc.innerHTML = '';
      pc.appendChild(new EmptyStateComponent('User not found.').render());
    }
  }
}

async function renderProfile() {
  const container = document.getElementById('profile-container');
  const isSelf = currentUser.id === targetUser.id;
  const isAdmin = currentUser.role === 'admin';

  try {
    const profileTemplate = await fetchTemplate('/templates/user-details/user-profile.html');
    
    // We render layout details
    container.innerHTML = profileTemplate;

    // Populate basic details
    const avatarImg = document.getElementById('user-profile-avatar');
    if (avatarImg && targetUser.avatarUrl && targetUser.avatarStatus === 'approved') {
      avatarImg.src = targetUser.avatarUrl;
    }

    const fullNameEl = document.getElementById('user-full-name');
    if (fullNameEl) fullNameEl.textContent = targetUser.fullName;

    const roleBadgeEl = document.getElementById('user-role-badge');
    if (roleBadgeEl) {
      roleBadgeEl.textContent = targetUser.role.toUpperCase();
      const colors = {
        student: 'blue',
        applicant: 'purple',
        representative: 'purple',
        admin: 'red',
        moderator: 'orange',
        muted: 'yellow'
      };
      const color = colors[targetUser.role] || 'gray';
      roleBadgeEl.className = `badge badge-${color}`;
    }

    const emailEl = document.getElementById('user-email-text');
    if (emailEl) {
      emailEl.textContent = (isAdmin || isSelf) ? targetUser.email : 'Hidden \u2022\u2022\u2022@\u2022\u2022\u2022';
    }

    const statusEl = document.getElementById('user-status-text');
    if (statusEl) {
      statusEl.textContent = targetUser.isVerified ? 'Verified Identity' : 'Pending Verification';
    }

    const createdAtEl = document.getElementById('user-membersince-text');
    if (createdAtEl) {
      createdAtEl.textContent = new Date(targetUser.createdAt).toLocaleDateString();
    }

    const balanceEl = document.getElementById('user-balance-mp-text');
    if (balanceEl) {
      balanceEl.textContent = targetUser.balanceMP || 0;
    }

    // Toggle nationality & university badges
    const nationalityBadge = document.getElementById('user-nationality-badge');
    if (nationalityBadge && targetUser.nationality) {
      nationalityBadge.textContent = targetUser.nationality;
      nationalityBadge.style.display = 'inline-block';
    }

    const universityBadge = document.getElementById('user-university-badge');
    if (universityBadge && targetUser.universityName) {
      universityBadge.textContent = targetUser.universityName;
      universityBadge.style.display = 'inline-block';
    }

    // Toggle verified, muted, banned and graduated badges
    if (targetUser.isVerified) {
      document.getElementById('user-verified-badge').style.display = 'inline-flex';
    }
    if (targetUser.isBanned) {
      document.getElementById('user-banned-badge').style.display = 'inline-block';
    }
    if (targetUser.isMuted) {
      document.getElementById('user-muted-badge').style.display = 'inline-block';
    }

    const isGraduated = (targetUser.role === 'student' || targetUser.role === 'moderator') && targetUser.graduationDate && new Date(targetUser.graduationDate) < new Date();
    if (isGraduated) {
      document.getElementById('user-graduated-badge').style.display = 'inline-flex';
    }

    // Toggle graduation date text
    const gradContainer = document.getElementById('user-graduation-container');
    const gradText = document.getElementById('user-graduation-text');
    if (gradContainer && gradText && (targetUser.role === 'student' || targetUser.role === 'moderator') && targetUser.graduationDate) {
      gradText.textContent = new Date(targetUser.graduationDate).toLocaleDateString();
      gradContainer.style.display = 'block';
    }

    // Render Message button if not self
    const messageBtnContainer = document.getElementById('message-button-container');
    if (messageBtnContainer && !isSelf) {
      const msgBtn = document.createElement('button');
      msgBtn.className = 'btn btn-primary';
      
      const chatIcon = document.createElement('span');
      chatIcon.setAttribute('data-icon', 'chat');
      msgBtn.appendChild(chatIcon);
      msgBtn.appendChild(document.createTextNode(' Message'));
      msgBtn.addEventListener('click', startPrivateChat);
      
      messageBtnContainer.appendChild(msgBtn);
    }

    // Admin/Moderator Moderation Menu
    const isMod = currentUser.role === 'moderator';
    const isModOrAdmin = isAdmin || isMod;
    if (isModOrAdmin && !isSelf) {
      const menuContainer = document.getElementById('admin-actions-menu-container');
      if (menuContainer) {
        menuContainer.style.display = 'block';

        // Mute button
        const muteBtn = document.getElementById('admin-btn-mute');
        if (muteBtn) {
          muteBtn.textContent = targetUser.isMuted ? 'Unmute User' : 'Mute User';
          muteBtn.onclick = () => adminAction(targetUser.isMuted ? 'unmute' : 'mute');
        }

        // Ban button
        const banBtn = document.getElementById('admin-btn-ban');
        if (banBtn) {
          banBtn.textContent = targetUser.isBanned ? 'Unban User' : 'Ban User';
          banBtn.onclick = () => adminAction(targetUser.isBanned ? 'unban' : 'ban');
        }

        // Role promotion/demotion button
        const roleBtn = document.getElementById('admin-btn-role');
        if (roleBtn) {
          if (isMod) {
            roleBtn.style.display = 'none';
          } else {
            roleBtn.style.display = 'inline-block';
            roleBtn.textContent = targetUser.role !== 'moderator' ? 'Make Moderator' : 'Remove Moderator';
            roleBtn.onclick = () => adminAction(targetUser.role !== 'moderator' ? 'promote' : 'demote');
          }
        }

        // MP actions (Deduct / Add)
        const deductBtn = document.getElementById('admin-btn-deduct-mp');
        if (deductBtn) deductBtn.onclick = deductMP;

        const addBtn = document.getElementById('admin-btn-add-mp');
        if (addBtn) addBtn.onclick = addMP;

        const deductMpContainer = document.getElementById('admin-deduct-mp-container');
        const addMpContainer = document.getElementById('admin-add-mp-container');
        if (isMod) {
          if (deductMpContainer) deductMpContainer.style.display = 'none';
          if (addMpContainer) addMpContainer.style.display = 'none';
        } else {
          if (deductMpContainer) deductMpContainer.style.display = 'block';
          if (addMpContainer) addMpContainer.style.display = 'block';
        }
      }
    }

    // Admin Documents list
    if (isAdmin) {
      try {
        const statusData = await API.getVerificationStatus(targetUser.id);
        const docs = statusData.documents || [];
        const docList = document.getElementById('admin-documents-list');
        const docsContainer = document.getElementById('admin-documents-container');

        if (docsContainer && docList) {
          docsContainer.style.display = 'block';
          docList.innerHTML = '';

          if (docs.length === 0) {
            const emptyP = document.createElement('p');
            emptyP.style.color = 'var(--text-muted)';
            emptyP.style.fontSize = '0.85rem';
            emptyP.style.padding = '16px';
            emptyP.textContent = 'No documents uploaded by this user.';
            docList.appendChild(emptyP);
          } else {
            docs.forEach(d => {
              const row = document.createElement('div');
              row.style.display = 'flex';
              row.style.justifyContent = 'space-between';
              row.style.alignItems = 'center';
              row.style.padding = '12px';
              row.style.borderBottom = '1px solid var(--border-subtle)';

              const infoDiv = document.createElement('div');
              const typeStrong = document.createElement('strong');
              const typeDisplayName = d.type === 'passport_id' ? 'ID / Passport' : d.type === 'student_card' ? 'Student Card' : 'Profile Picture';
              typeStrong.textContent = typeDisplayName;
              infoDiv.appendChild(typeStrong);

              const originalNameDiv = document.createElement('div');
              originalNameDiv.style.fontSize = '0.75rem';
              originalNameDiv.style.color = 'var(--text-muted)';
              originalNameDiv.style.marginTop = '2px';
              originalNameDiv.textContent = `Original: ${d.originalName}`;
              infoDiv.appendChild(originalNameDiv);

              const actionsDiv = document.createElement('div');
              actionsDiv.style.display = 'flex';
              actionsDiv.style.alignItems = 'center';
              actionsDiv.style.gap = '12px';

              const badge = document.createElement('span');
              badge.textContent = d.status.charAt(0).toUpperCase() + d.status.slice(1);
              badge.className = `badge badge-${d.status === 'approved' ? 'green' : d.status === 'pending' ? 'yellow' : 'red'}`;
              if (d.status === 'rejected' && d.reviewNote) {
                badge.title = d.reviewNote;
              }
              actionsDiv.appendChild(badge);

              const viewLink = document.createElement('a');
              viewLink.href = `/uploads/${d.filename}`;
              viewLink.target = '_blank';
              viewLink.className = 'btn btn-xs btn-secondary';
              
              const viewIcon = document.createElement('span');
              viewIcon.setAttribute('data-icon', 'eye');
              viewLink.appendChild(viewIcon);
              viewLink.appendChild(document.createTextNode(' View'));
              actionsDiv.appendChild(viewLink);

              row.appendChild(infoDiv);
              row.appendChild(actionsDiv);
              docList.appendChild(row);
            });
          }
        }
      } catch (docErr) {
        console.error('Failed to load user documents', docErr);
      }
    }

  } catch (e) {
    console.error(e);
    container.innerHTML = '';
    container.appendChild(new EmptyStateComponent('Error displaying user profile.').render());
  }

  // Render icons for dynamically inserted HTML elements
  container.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.getAttribute('data-icon');
    el.innerHTML = getIcon(name, 14);
  });

  const cancelConfirmBtn = document.getElementById('btn-confirm-cancel');
  if (cancelConfirmBtn) {
    cancelConfirmBtn.addEventListener('click', closeConfirmModal);
  }
  const submitConfirmBtn = document.getElementById('btn-confirm-submit');
  if (submitConfirmBtn) {
    submitConfirmBtn.addEventListener('click', submitConfirmAction);
  }
}

async function startPrivateChat() {
   try {
     const res = await API.request('POST', '/api/chats', { otherUserId: targetUser.id });
     window.location.href = `/chats.html?id=${res.chatId}`;
   } catch (e) {
     showToast(e.error || 'Failed to start chat.', 'error');
   }
}

let pendingAction = null;

async function adminAction(action) {
  if (action === 'promote' || action === 'demote') {
    pendingAction = action;
    const titleEl = document.getElementById('confirm-modal-title');
    const textEl = document.getElementById('confirm-modal-text');
    if (titleEl && textEl) {
      titleEl.textContent = 'Are you sure?';
      textEl.textContent = action === 'promote'
        ? `Are you sure you want to make ${targetUser.fullName} a moderator?`
        : `Are you sure you want to remove moderator status from ${targetUser.fullName}?`;
    }
    const modal = document.getElementById('confirm-modal');
    if (modal) {
      modal.classList.add('active');
    }
  } else {
    if (!confirm(`Are you sure you want to perform: ${action}?`)) return;
    try {
      await API.moderateUser(targetUser.id, action);
      showToast('Action successful!', 'success');
      initPage(); // Reload
    } catch (e) {
      showToast(e.error || 'Mod action failed.', 'error');
    }
  }
}

function closeConfirmModal() {
  const modal = document.getElementById('confirm-modal');
  if (modal) modal.classList.remove('active');
  pendingAction = null;
}

async function submitConfirmAction() {
  if (!pendingAction) return;
  const action = pendingAction;
  closeConfirmModal();
  try {
    await API.moderateUser(targetUser.id, action);
    showToast('Action successful!', 'success');
    initPage(); // Reload
  } catch (e) {
    showToast(e.error || 'Mod action failed.', 'error');
  }
}

async function deductMP() {
  const amountInput = document.getElementById('deduct-mp-amount');
  const reasonInput = document.getElementById('deduct-mp-reason');
  const amount = parseInt(amountInput.value);
  const reason = reasonInput.value.trim();

  if (!amount || amount <= 0) {
    showToast('Please enter a valid positive amount.', 'error');
    return;
  }
  if (!reason) {
    showToast('Please enter a reason for deduction.', 'error');
    return;
  }

  if (!confirm(`Are you sure you want to deduct ${amount} MP points from ${targetUser.fullName}?`)) return;

  try {
    await API.request('POST', `/api/admin/users/${targetUser.id}/deduct-mp`, { amount, reason });
    showToast('MP points deducted successfully!', 'success');
    initPage(); // Reload
  } catch (e) {
    showToast(e.error || 'Failed to deduct MP points.', 'error');
  }
}

async function addMP() {
  const amountInput = document.getElementById('add-mp-amount');
  const reasonInput = document.getElementById('add-mp-reason');
  const amount = parseInt(amountInput.value);
  const reason = reasonInput.value.trim();

  if (!amount || amount <= 0) {
    showToast('Please enter a valid positive amount.', 'error');
    return;
  }
  if (!reason) {
    showToast('Please enter a reason for addition.', 'error');
    return;
  }

  if (!confirm(`Are you sure you want to add ${amount} MP points to ${targetUser.fullName}?`)) return;

  try {
    await API.request('POST', `/api/admin/users/${targetUser.id}/add-mp`, { amount, reason });
    showToast('MP points added successfully!', 'success');
    initPage(); // Reload
  } catch (e) {
    showToast(e.error || 'Failed to add MP points.', 'error');
  }
}

initPage();
