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
    document.getElementById('profile-container').innerHTML = '<div class="empty-state"><p>User not found.</p></div>';
  }
}

async function renderProfile() {
  const container = document.getElementById('profile-container');
  const isSelf = currentUser.id === targetUser.id;
  const isAdmin = currentUser.role === 'admin';
  const isMod = currentUser.role === 'moderator';

  try {
    const profileTemplate = await fetchTemplate('/templates/user-details/user-profile.html');
    
    const avatarUrl = targetUser.avatarUrl || '/img/avatar_default.png';
    const verificationBadge = targetUser.isVerified ? '<span style="color:var(--accent-blue);"><span data-icon="verify"></span></span>' : '';
    const bannedBadge = targetUser.isBanned ? '<span class="badge badge-red">BANNED</span>' : '';
    const mutedBadge = targetUser.isMuted ? '<span class="badge badge-yellow">MUTED</span>' : '';
    const roleUpper = targetUser.role.toUpperCase();
    const nationalityBadge = targetUser.nationality ? `<span class="badge badge-gray">${targetUser.nationality}</span>` : '';
    const universityBadge = targetUser.universityName ? `<span class="badge badge-purple">${targetUser.universityName}</span>` : '';
    
    const messageButton = !isSelf ? `
      <button class="btn btn-primary" onclick="startPrivateChat()">
        <span data-icon="chat"></span> Message
      </button>
    ` : '';

    const email = isAdmin || isSelf ? targetUser.email : 'Hidden \u2022\u2022\u2022@\u2022\u2022\u2022';
    const verificationStatus = targetUser.isVerified ? 'Verified Identity' : 'Pending Verification';
    const createdAtDate = new Date(targetUser.createdAt).toLocaleDateString();
    const balanceMP = targetUser.balanceMP || 0;

    const adminActionsMenu = isAdmin && !isSelf ? `
      <div class="admin-menu">
        <h3 style="margin-bottom:20px; color:var(--accent-red); display:flex; align-items:center; gap:10px;">
          <span data-icon="shield"></span> Moderation Actions
        </h3>
        <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom: 20px;">
          ${targetUser.isMuted 
            ? `<button class="btn btn-secondary" onclick="adminAction('unmute')">Unmute User</button>`
            : `<button class="btn btn-secondary" onclick="adminAction('mute')">Mute User</button>`
          }
          
          ${targetUser.isBanned
            ? `<button class="btn btn-secondary" onclick="adminAction('unban')">Unban User</button>`
            : `<button class="btn btn-secondary" onclick="adminAction('ban')">Ban User</button>`
          }

          ${targetUser.role !== 'moderator' 
            ? `<button class="btn btn-secondary" onclick="adminAction('promote')">Make Moderator</button>`
            : `<button class="btn btn-secondary" onclick="adminAction('demote')">Remove Moderator</button>`
          }
        </div>

        <div style="border-top:1px solid var(--border-subtle); padding-top:20px; margin-top:20px;">
          <h4 style="margin-bottom:12px; color:var(--text-primary); font-size: 0.9rem;">Deduct MP Points (Bad Behaviour)</h4>
          <div style="display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap;">
            <div class="form-group" style="flex:1; min-width:120px; margin-bottom:0;">
              <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:4px;">Amount to Deduct</label>
              <input type="number" id="deduct-mp-amount" placeholder="e.g. 100" min="1" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-subtle); background:var(--bg-input); color:var(--text-primary);">
            </div>
            <div class="form-group" style="flex:2; min-width:200px; margin-bottom:0;">
              <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:4px;">Reason for Deduction</label>
              <input type="text" id="deduct-mp-reason" placeholder="e.g. Spammed chat, inappropriate behavior" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-subtle); background:var(--bg-input); color:var(--text-primary);">
            </div>
            <button class="btn btn-secondary" style="background:var(--accent-red); border-color:var(--accent-red); color:white; height:40px;" onclick="deductMP()">Deduct Points</button>
          </div>
        </div>

        <div style="border-top:1px solid var(--border-subtle); padding-top:20px; margin-top:20px;">
          <h4 style="margin-bottom:12px; color:var(--text-primary); font-size: 0.9rem;">Add MP Points (Reward)</h4>
          <div style="display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap;">
            <div class="form-group" style="flex:1; min-width:120px; margin-bottom:0;">
              <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:4px;">Amount to Add</label>
              <input type="number" id="add-mp-amount" placeholder="e.g. 100" min="1" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-subtle); background:var(--bg-input); color:var(--text-primary);">
            </div>
            <div class="form-group" style="flex:2; min-width:200px; margin-bottom:0;">
              <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:4px;">Reason for Addition</label>
              <input type="text" id="add-mp-reason" placeholder="e.g. Active participation, helping others" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-subtle); background:var(--bg-input); color:var(--text-primary);">
            </div>
            <button class="btn btn-primary" style="background:var(--accent-green); border-color:var(--accent-green); color:white; height:40px;" onclick="addMP()">Add Points</button>
          </div>
        </div>
      </div>
    ` : '';

    let adminDocumentsHtml = '';
    if (isAdmin) {
      try {
        const statusData = await API.getVerificationStatus(targetUser.id);
        const docs = statusData.documents || [];
        if (docs.length > 0) {
          const docRows = docs.map(d => {
            const typeDisplayName = d.type === 'passport_id' ? 'ID / Passport' : d.type === 'student_card' ? 'Student Card' : 'Profile Picture';
            const statusBadge = d.status === 'approved' 
              ? '<span class="badge badge-green">Approved</span>' 
              : d.status === 'pending' 
                ? '<span class="badge badge-yellow">Pending</span>' 
                : `<span class="badge badge-red" title="${d.reviewNote || ''}">Rejected</span>`;
            
            return `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--border-subtle);">
                <div>
                  <strong>${typeDisplayName}</strong>
                  <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Original: ${d.originalName}</div>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                  ${statusBadge}
                  <a href="/uploads/${d.filename}" target="_blank" class="btn btn-xs btn-secondary"><span data-icon="eye"></span> View</a>
                </div>
              </div>
            `;
          }).join('');

          adminDocumentsHtml = `
            <div class="info-card" style="margin-top:30px; grid-column: span 2;">
              <h3 style="margin-bottom:15px; color:var(--text-primary); display:flex; align-items:center; gap:10px;">
                <span data-icon="document"></span> Uploaded Documents (Admin View)
              </h3>
              <div style="display:flex; flex-direction:column; border:1px solid var(--border-subtle); border-radius:12px; overflow:hidden; background:var(--bg-body);">
                ${docRows}
              </div>
            </div>
          `;
        } else {
          adminDocumentsHtml = `
            <div class="info-card" style="margin-top:30px; grid-column: span 2;">
              <h3 style="margin-bottom:15px; color:var(--text-primary); display:flex; align-items:center; gap:10px;">
                <span data-icon="document"></span> Uploaded Documents (Admin View)
              </h3>
              <p style="color:var(--text-muted); font-size:0.85rem;">No documents uploaded by this user.</p>
            </div>
          `;
        }
      } catch (docErr) {
        console.error('Failed to load user documents', docErr);
        adminDocumentsHtml = `<div class="info-card" style="margin-top:30px; grid-column: span 2;"><p style="color:var(--accent-red);">Failed to load user documents.</p></div>`;
      }
    }

    container.innerHTML = renderTemplate(profileTemplate, {
      avatarUrl,
      fullName: targetUser.fullName,
      verificationBadge,
      bannedBadge,
      mutedBadge,
      roleUpper,
      nationalityBadge,
      universityBadge,
      messageButton,
      email,
      verificationStatus,
      createdAtDate,
      balanceMP,
      adminActionsMenu,
      adminDocumentsHtml
    });
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><p>Error displaying user profile.</p></div>';
  }

  // Render icons for dynamically inserted HTML elements
  container.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.getAttribute('data-icon');
    el.innerHTML = getIcon(name, 14);
  });
}

async function startPrivateChat() {
   try {
     const res = await API.request('POST', '/api/chats', { otherUserId: targetUser.id });
     window.location.href = `/messages?chatId=${res.chatId}`;
   } catch (e) {
     showToast(e.error || 'Failed to start chat.', 'error');
   }
}

async function adminAction(action) {
  if (!confirm(`Are you sure you want to perform: ${action}?`)) return;
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
