function getIconNode(name, size = 14) {
  const svgText = getIcon(name, size);
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  return doc.documentElement;
}

let adminTab = 'docs';

async function loadAdmin() {
  const user = await checkAuth();
  if (!user || (user.role !== 'admin' && user.role !== 'representative' && user.role !== 'moderator')) {
    showToast('Access required.', 'error');
    return window.location.href = '/profile';
  }
  Sidebar.render(user, 'admin');

  // Adjust tabs visibility based on role
  const tabsEl = document.querySelector('.tabs');
  if (user.role === 'representative') {
    tabsEl.textContent = ''; // clear all other tabs
    const docBtn = document.createElement('button');
    docBtn.className = 'tab active';
    docBtn.id = 'tab-docs';
    
    const iconSpan = document.createElement('span');
    iconSpan.setAttribute('data-icon', 'document');
    iconSpan.appendChild(getIconNode('document', 14));
    
    docBtn.appendChild(iconSpan);
    docBtn.appendChild(document.createTextNode(' Pending Documents'));
    docBtn.addEventListener('click', () => switchAdminTab('docs'));
    tabsEl.appendChild(docBtn);

    document.getElementById('admin-stats').style.display = 'none';
  } else if (user.role === 'moderator') {
    tabsEl.textContent = ''; // clear all other tabs
    const chatBtn = document.createElement('button');
    chatBtn.className = 'tab active';
    chatBtn.id = 'tab-chats';
    
    const iconSpan = document.createElement('span');
    iconSpan.setAttribute('data-icon', 'chat');
    iconSpan.appendChild(getIconNode('chat', 14));
    
    chatBtn.appendChild(iconSpan);
    chatBtn.appendChild(document.createTextNode(' Moderation'));
    chatBtn.addEventListener('click', () => switchAdminTab('chats'));
    tabsEl.appendChild(chatBtn);

    document.getElementById('admin-stats').style.display = 'none';
  } else {
    // Bind click event listeners dynamically for admin role
    const tabDocs = document.getElementById('tab-docs');
    if (tabDocs) tabDocs.addEventListener('click', () => switchAdminTab('docs'));
    const tabGroups = document.getElementById('tab-groups');
    if (tabGroups) tabGroups.addEventListener('click', () => switchAdminTab('groups'));
    const tabUsers = document.getElementById('tab-users');
    if (tabUsers) tabUsers.addEventListener('click', () => switchAdminTab('users'));
    const tabChats = document.getElementById('tab-chats');
    if (tabChats) tabChats.addEventListener('click', () => switchAdminTab('chats'));

    // Bind modal actions dynamically
    const btnCancelReject = document.getElementById('btn-cancel-reject');
    if (btnCancelReject) btnCancelReject.addEventListener('click', closeRejectModal);
    const btnSubmitReject = document.getElementById('btn-submit-reject');
    if (btnSubmitReject) btnSubmitReject.addEventListener('click', submitRejection);
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

  if (user.role === 'moderator') {
    switchAdminTab('chats');
  } else {
    switchAdminTab('docs');
  }
}

function switchAdminTab(tab) {
  adminTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const activeTabEl = document.getElementById(`tab-${tab}`);
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
      window.allUsersCache = data.users;
      window.userCurrentPage = 1;

      const listTemplate = await fetchTemplate('/templates/admin/users-list.html');
      container.innerHTML = listTemplate;

      const uniFilter = document.getElementById('user-uni-filter');
      if (uniFilter) {
        const universities = [...new Set(data.users.map(u => u.universityName).filter(Boolean))].sort();
        universities.forEach(uniName => {
          const opt = document.createElement('option');
          opt.value = uniName;
          opt.textContent = uniName;
          uniFilter.appendChild(opt);
        });
      }

      const cardTemplate = await fetchTemplate('/templates/admin/user-card.html');

      const renderUsersList = async () => {
        const query = document.getElementById('user-search-input').value.toLowerCase().trim();
        const role = document.getElementById('user-role-filter').value;
        const uni = document.getElementById('user-uni-filter').value;
        const verified = document.getElementById('user-verified-filter').value;
        const pageSize = parseInt(document.getElementById('user-page-size').value);

        const filtered = window.allUsersCache.filter(u => {
          const matchQuery = !query || u.fullName.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
          const matchRole = !role || u.role === role;
          const matchUni = !uni || u.universityName === uni;
          const matchVerified = !verified || (verified === 'yes' ? u.isVerified : !u.isVerified);

          return matchQuery && matchRole && matchUni && matchVerified;
        });

        const totalPages = Math.ceil(filtered.length / pageSize) || 1;
        if (window.userCurrentPage > totalPages) {
          window.userCurrentPage = totalPages;
        }
        if (window.userCurrentPage < 1) {
          window.userCurrentPage = 1;
        }

        const startIndex = (window.userCurrentPage - 1) * pageSize;
        const paginated = filtered.slice(startIndex, startIndex + pageSize);

        const grid = document.getElementById('users-cards-grid');
        grid.innerHTML = '';

        if (paginated.length === 0) {
          const noMatchDiv = document.createElement('div');
          noMatchDiv.style.textAlign = 'center';
          noMatchDiv.style.padding = '40px 20px';
          noMatchDiv.style.gridColumn = '1 / -1';
          noMatchDiv.style.color = 'var(--text-muted)';
          noMatchDiv.textContent = 'No users match the selected filters.';
          grid.appendChild(noMatchDiv);
        } else {
          for (const u of paginated) {
            const cardWrapper = document.createElement('div');
            cardWrapper.innerHTML = renderTemplate(cardTemplate, { id: u.id, fullName: u.fullName, email: u.email });
            const cardEl = cardWrapper.firstElementChild;

            const roleBadge = cardEl.querySelector('.user-card-role-badge');
            if (roleBadge) {
              const colors = {
                student: 'blue',
                applicant: 'purple',
                representative: 'purple',
                admin: 'red',
                moderator: 'orange',
                muted: 'yellow'
              };
              const color = colors[u.role] || 'gray';
              roleBadge.textContent = u.role.toUpperCase();
              roleBadge.className = `badge badge-${color}`;
            }

            const verifiedBadge = cardEl.querySelector('.user-card-verified-badge');
            if (verifiedBadge) {
              verifiedBadge.textContent = u.isVerified ? 'Verified' : 'Unverified';
              verifiedBadge.className = `badge badge-${u.isVerified ? 'green' : 'gray'}`;
            }

            const uniName = cardEl.querySelector('.user-card-uni-name');
            if (uniName) {
              uniName.textContent = u.universityName || '—';
              uniName.title = u.universityName || '—';
            }

            const gradRow = cardEl.querySelector('.user-card-graduation-row');
            const gradDate = cardEl.querySelector('.user-card-grad-date');
            if (gradRow && gradDate) {
              if (u.graduationDate) {
                gradDate.textContent = new Date(u.graduationDate).toLocaleDateString();
                gradRow.style.display = 'flex';
              } else {
                gradRow.style.display = 'none';
              }
            }

            grid.appendChild(cardEl);
          }
        }

        const info = document.getElementById('pagination-info');
        if (info) {
          info.textContent = `Page ${window.userCurrentPage} of ${totalPages}`;
        }

        const prevBtn = document.getElementById('btn-prev-page');
        if (prevBtn) {
          prevBtn.disabled = window.userCurrentPage === 1;
        }

        const nextBtn = document.getElementById('btn-next-page');
        if (nextBtn) {
          nextBtn.disabled = window.userCurrentPage === totalPages;
        }
      };

      const handlePrevPage = () => {
        if (window.userCurrentPage > 1) {
          window.userCurrentPage--;
          renderUsersList();
        }
      };

      const handleNextPage = () => {
        window.userCurrentPage++;
        renderUsersList();
      };

      document.getElementById('user-search-input').addEventListener('input', () => {
        window.userCurrentPage = 1;
        renderUsersList();
      });
      document.getElementById('user-role-filter').addEventListener('change', () => {
        window.userCurrentPage = 1;
        renderUsersList();
      });
      document.getElementById('user-uni-filter').addEventListener('change', () => {
        window.userCurrentPage = 1;
        renderUsersList();
      });
      document.getElementById('user-verified-filter').addEventListener('change', () => {
        window.userCurrentPage = 1;
        renderUsersList();
      });
      document.getElementById('user-page-size').addEventListener('change', () => {
        window.userCurrentPage = 1;
        renderUsersList();
      });

      document.getElementById('btn-prev-page').addEventListener('click', handlePrevPage);
      document.getElementById('btn-next-page').addEventListener('click', handleNextPage);

      renderUsersList();

    } catch (err) {
      console.error(err);
      container.innerHTML = '<div class="empty-state"><p>Failed to load users.</p></div>';
    }
  } else if (tab === 'chats') {
    try {
      const panelHtml = await fetchTemplate('/templates/admin/moderation-panel.html');
      container.innerHTML = panelHtml;

      container.querySelectorAll('[data-icon]').forEach(el => {
        const name = el.getAttribute('data-icon');
        el.appendChild(getIconNode(name, 18));
      });

      loadReportedMessages();
      loadActiveChats();
    } catch (e) {
      container.textContent = '';
      container.appendChild(new EmptyStateComponent('Failed to load moderation panel.').render());
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

async function loadReportedMessages() {
  const listEl = document.getElementById('reported-messages-list');
  if (!listEl) return;

  try {
    const response = await fetch('/api/admin/reports');
    const data = await response.json();
    
    if (!data.reports || data.reports.length === 0) {
      listEl.textContent = '';
      listEl.appendChild(new EmptyStateComponent('No pending message reports.').render());
      return;
    }

    const template = await fetchTemplate('/templates/admin/report-card.html');
    
    listEl.innerHTML = data.reports.map(r => {
      const dateStr = formatDate(r.reportedAt);
      return renderTemplate(template, {
        id: r.id,
        chatType: r.chatType,
        dateStr,
        reporterName: r.reporterName,
        reason: r.reason,
        senderName: r.senderName,
        messageText: r.messageText
      });
    }).join('');

    // Bind event listeners dynamically
    listEl.querySelectorAll('.btn-dismiss-report').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        resolveReport(id, 'dismiss');
      });
    });
    listEl.querySelectorAll('.btn-delete-message').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        resolveReport(id, 'delete_message');
      });
    });
    listEl.querySelectorAll('.btn-mute-sender').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        resolveReport(id, 'mute_sender');
      });
    });
    listEl.querySelectorAll('.btn-ban-sender').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        resolveReport(id, 'ban_sender');
      });
    });

    listEl.querySelectorAll('[data-icon]').forEach(el => {
      const name = el.getAttribute('data-icon');
      el.textContent = '';
      el.appendChild(getIconNode(name, 12));
    });

  } catch (e) {
    console.error(e);
    listEl.textContent = '';
    listEl.appendChild(new EmptyStateComponent('Failed to load reports.').render());
  }
}

async function resolveReport(reportId, action) {
  if (!confirm(`Are you sure you want to perform action: ${action.replace('_', ' ')}?`)) return;
  try {
    const res = await fetch(`/api/admin/reports/${reportId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    if (!res.ok) throw data;
    showToast('Report updated successfully!', 'success');
    loadAdminContent('chats');
  } catch (e) {
    showToast(e.error || 'Failed to update report.', 'error');
  }
}

async function loadActiveChats() {
  const listEl = document.getElementById('active-chats-list');
  if (!listEl) return;

  try {
    const response = await fetch('/api/admin/chats');
    const data = await response.json();
    if (!data.conversations || data.conversations.length === 0) {
      listEl.textContent = '';
      listEl.appendChild(new EmptyStateComponent('No active chats', 'There are no messages on the platform yet.').render());
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
      
      const grid = document.createElement('div');
      grid.className = 'grid-2';
      grid.innerHTML = cardsHtml;
      listEl.textContent = '';
      listEl.appendChild(grid);
      
      listEl.querySelectorAll('[data-icon]').forEach(el => {
        const name = el.getAttribute('data-icon');
        el.textContent = '';
        el.appendChild(getIconNode(name, 14));
      });
    }
  } catch (e) {
    listEl.textContent = '';
    listEl.appendChild(new EmptyStateComponent('Failed to load active chats.').render());
  }
}

window.loadReportedMessages = loadReportedMessages;
window.resolveReport = resolveReport;
window.loadActiveChats = loadActiveChats;

document.addEventListener('DOMContentLoaded', () => {
  loadAdmin();
});
