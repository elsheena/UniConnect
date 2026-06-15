let adminTab = 'docs';

async function loadAdmin() {
  const user = await checkAuth();
  if (!user || (user.role !== 'admin' && user.role !== 'representative')) {
    showToast('Access required.', 'error');
    return window.location.href = '/profile';
  }
  Sidebar.render(user, 'admin');

  // Adjust tabs visibility based on role
  const tabsEl = document.querySelector('.tabs');
  if (user.role === 'representative') {
    tabsEl.innerHTML = `<button class="tab active" onclick="switchAdminTab('docs')"><span data-icon="document"></span> Pending Documents</button>`;
    document.getElementById('admin-stats').style.display = 'none';
  }

  // Stats
  if (user.role === 'admin') {
    try {
      const s = await API.getStats();
      const statsTemplate = await fetchTemplate('/templates/admin/admin-stats.html');
      document.getElementById('admin-stats').innerHTML = renderTemplate(statsTemplate, {
        totalUsers: s.totalUsers,
        verified: s.verified,
        pendingDocs: s.pendingDocs,
        totalBookings: s.totalBookings
      });
    } catch {}
  }

  switchAdminTab('docs');
}

function switchAdminTab(tab) {
  adminTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const activeTabEl = document.querySelector(`.tab[onclick="switchAdminTab('${tab}')"]`);
  if (activeTabEl) {
    activeTabEl.classList.add('active');
  }
  loadAdminContent(tab);
}

async function loadAdminContent(tab) {
  const container = document.getElementById('admin-content');
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  if (tab === 'docs') {
    try {
      const data = await API.getPendingDocs();
      if (!data.documents || data.documents.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon"><span data-icon="check"></span></div><h3>No pending documents</h3><p>All documents have been reviewed.</p></div>';
      } else {
        const docTemplate = await fetchTemplate('/templates/admin/doc-card.html');
        container.innerHTML = data.documents.map(d => {
          const userRoleClass = d.userRole === 'student' ? 'blue' : 'purple';
          const typeUpper = d.type.replace('_', ' ').toUpperCase();
          const typeDisplayName = d.type === 'passport_id' ? 'ID / Passport' : d.type === 'student_card' ? 'Student Card' : 'Profile Picture';
          const uploadedAtFormatted = formatDate(d.uploadedAt);
          const mediaContent = d.type === 'profile_picture' 
            ? `<img src="/uploads/${d.filename}" style="max-width:200px; max-height:200px; border-radius:12px; border:2px solid var(--border-subtle); display:block;">`
            : `<a href="/uploads/${d.filename}" target="_blank" class="btn btn-sm btn-secondary"><span data-icon="document"></span> View Document</a>`;
          const gradDateInput = (d.userRole === 'student' && d.type === 'student_card')
            ? `<div class="form-group" style="margin-bottom:10px;">
                <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:4px;">Graduation Date (Automatic Graduate status):</label>
                <input type="date" id="grad-date-${d.id}">
              </div>`
            : '';

          const showIdButton = (d.type === 'student_card' && d.hasVerifiedId)
            ? `<a href="/uploads/${d.verifiedIdFilename}" target="_blank" class="btn btn-sm btn-info" style="margin-left: 8px;"><span data-icon="eye"></span> Show ID</a>`
            : '';

          return renderTemplate(docTemplate, {
            id: d.id,
            userId: d.userId,
            userFullName: d.userFullName || 'Unknown User',
            userRole: d.userRole,
            userRoleClass,
            typeUpper,
            typeDisplayName,
            uploadedAtFormatted,
            mediaContent,
            gradDateInput,
            showIdButton
          });
        }).join('');
        
        // Re-render icons for dynamic content
        container.querySelectorAll('[data-icon]').forEach(el => {
          const name = el.getAttribute('data-icon');
          el.innerHTML = getIcon(name, 14);
        });
      }
    } catch (e) {
      container.innerHTML = '<div class="empty-state"><p>Failed to load documents.</p></div>';
    }
  } else if (tab === 'groups') {
    try {
      const data = await API.getGroupRequests();
      if (!data.requests || data.requests.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon"><span data-icon="globe"></span></div><h3>No pending group requests</h3><p>All group join requests have been resolved.</p></div>';
      } else {
        const reqTemplate = await fetchTemplate('/templates/admin/group-req.html');
        container.innerHTML = data.requests.map(r => {
          return renderTemplate(reqTemplate, {
            id: r.id,
            userId: r.userId,
            userName: r.userName,
            groupName: r.groupName,
            requestedAtFormatted: formatDate(r.requestedAt),
            reason: r.reason
          });
        }).join('');

        // Re-render icons
        container.querySelectorAll('[data-icon]').forEach(el => {
          const name = el.getAttribute('data-icon');
          el.innerHTML = getIcon(name, 14);
        });
      }
    } catch (e) {
      container.innerHTML = '<div class="empty-state"><p>Failed to load group requests.</p></div>';
    }
  } else if (tab === 'users') {
    try {
      const data = await API.getAllUsers();
      const tableTemplate = await fetchTemplate('/templates/admin/users-table.html');
      const rowTemplate = await fetchTemplate('/templates/admin/users-row.html');
      
      const rowsHtml = data.users.map(u => {
        return renderTemplate(rowTemplate, {
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          roleBadgeHtml: statusBadge(u.role),
          verifiedBadgeHtml: u.isVerified ? '<span class="badge badge-green">Yes</span>' : '<span class="badge badge-gray">No</span>',
          universityName: u.universityName || '—'
        });
      }).join('');

      container.innerHTML = renderTemplate(tableTemplate, { rowsHtml });
    } catch {
      container.innerHTML = '<div class="empty-state"><p>Failed to load users.</p></div>';
    }
  } else if (tab === 'chats') {
    try {
      const response = await fetch('/api/admin/chats');
      const data = await response.json();
      if (!data.conversations || data.conversations.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No active chats</h3><p>There are no messages on the platform yet.</p></div>';
      } else {
        const chatCardTemplate = await fetchTemplate('/templates/admin/chat-card.html');
        const cardsHtml = data.conversations.map(c => {
          return renderTemplate(chatCardTemplate, {
            id: c.id,
            title: c.title,
            type: c.type,
            badgeClass: c.badgeClass,
            lastMessage: c.lastMessage,
            timestampFormatted: formatDate(c.timestamp)
          });
        }).join('');
        container.innerHTML = `<div class="grid-2">${cardsHtml}</div>`;
        
        // Re-render icons
        container.querySelectorAll('[data-icon]').forEach(el => {
          const name = el.getAttribute('data-icon');
          el.innerHTML = getIcon(name, 14);
        });
      }
    } catch (e) {
      container.innerHTML = '<div class="empty-state"><p>Failed to load chat conversations.</p></div>';
    }
  }
}

async function openChatModeration(chatId, title) {
  const container = document.getElementById('admin-content');
  try {
    const historyTemplate = await fetchTemplate('/templates/admin/chat-history.html');
    container.innerHTML = renderTemplate(historyTemplate, { title });
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><p>Error displaying chat moderation.</p></div>';
    return;
  }
  try {
    const response = await fetch(`/api/admin/chats/${chatId}`);
    const data = await response.json();
    const history = document.getElementById('chat-history-content');
    
    if (!data.messages || data.messages.length === 0) {
      history.innerHTML = '<p>No messages found.</p>';
    } else {
      const msgTemplate = await fetchTemplate('/templates/admin/chat-msg.html');
      history.innerHTML = data.messages.map(m => {
        const isFirst = m.senderId === data.messages[0].senderId;
        const alignItems = isFirst ? 'flex-start' : 'flex-end';
        const bg = isFirst ? 'rgba(59,130,246,0.15)' : 'rgba(139,92,246,0.15)';
        const border = isFirst ? 'rgba(59,130,246,0.2)' : 'rgba(139,92,246,0.2)';
        const color = isFirst ? 'var(--accent-blue)' : 'var(--accent-purple)';
        const senderLabel = m.senderName || (isFirst ? 'Sender A' : 'Sender B');
        
        return renderTemplate(msgTemplate, {
          alignItems,
          bg,
          border,
          color,
          senderLabel,
          senderId: m.senderId,
          text: m.text,
          timestampFormatted: formatDate(m.timestamp)
        });
      }).join('');
      history.scrollTop = history.scrollHeight;
    }
  } catch (e) {
    document.getElementById('chat-history-content').innerHTML = '<p>Error loading messages.</p>';
  }
}

let currentRejectId = null;

function openRejectModal(id) {
  currentRejectId = id;
  document.getElementById('reject-note').value = '';
  document.getElementById('reject-modal').classList.add('active');
}

function closeRejectModal() {
  document.getElementById('reject-modal').classList.remove('active');
  currentRejectId = null;
}

async function submitRejection() {
  const note = document.getElementById('reject-note').value.trim();
  if (!note) {
    showToast('Please enter a rejection reason.', 'error');
    return;
  }
  try {
    await API.verifyDocument(currentRejectId, 'reject', note, null);
    showToast('Document rejected!');
    closeRejectModal();
    loadAdmin();
  } catch (e) {
    showToast(e.error || 'Failed to reject document.', 'error');
  }
}

async function verifyDocApprove(id) {
  const gradDateEl = document.getElementById(`grad-date-${id}`);
  const gradDate = gradDateEl ? gradDateEl.value : null;

  if (gradDateEl && !gradDate) {
    showToast('Please select the graduation date.', 'error');
    return;
  }

  try {
    await API.verifyDocument(id, 'approve', 'Approved by administrator.', gradDate);
    showToast('Document approved!');
    loadAdmin();
  } catch (e) {
    showToast(e.error || 'Failed to approve document.', 'error');
  }
}

async function verifyGroupReq(reqId, action) {
  if (!confirm(`Are you sure you want to ${action} this request?`)) return;
  try {
    await API.verifyGroupRequest(reqId, action);
    showToast(`Request ${action === 'approve' ? 'approved' : 'rejected'}.`);
    loadAdmin();
  } catch (e) {
    showToast(e.error || 'Failed to process request.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadAdmin();
});
