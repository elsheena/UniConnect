async function initPage() {
  const user = await checkAuth();
  Sidebar.render(user, 'notifications');
  loadNotifications();
}

async function loadNotifications() {
  const list = document.getElementById('notif-list');
  try {
    const data = await API.request('GET', '/api/notifications');
    const notifs = data.notifications;

    if (notifs.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <span data-icon="bell-off" data-size="48"></span>
          <h3>No notifications yet</h3>
          <p>When you get messages or updates, they'll appear here.</p>
        </div>
      `;
    } else {
      const cardTemplate = await fetchTemplate('/templates/notification-card.html');
      list.innerHTML = notifs.map(n => {
        const unreadClass = n.read ? '' : 'unread';
        const unreadDot = n.read ? '' : '<div class="unread-dot"></div>';
        const iconName = n.title.toLowerCase().includes('message') ? 'chat' : 'bell';
        const timeStr = formatNotifDate(n.createdAt);
        return renderTemplate(cardTemplate, {
          id: n.id,
          link: n.link,
          unreadClass,
          unreadDot,
          iconName,
          title: n.title,
          text: n.text,
          timeStr
        });
      }).join('');
    }
    
    // Re-render icons
    document.querySelectorAll('[data-icon]').forEach(el => {
      const iconName = el.getAttribute('data-icon');
      const size = el.getAttribute('data-size') || 18;
      el.innerHTML = getIcon(iconName, size);
    });
  } catch (e) {
    list.innerHTML = '<p class="error">Failed to load notifications.</p>';
  }
}

async function handleNotifClick(id, link) {
  try {
    await API.request('POST', `/api/notifications/${id}/read`);
    window.location.href = link;
  } catch (e) {
    window.location.href = link;
  }
}

async function markAllRead() {
  try {
    await API.request('POST', '/api/notifications/read-all');
    loadNotifications();
    showToast('All marked as read');
  } catch (e) {
    showToast('Operation failed', 'error');
  }
}

function formatNotifDate(iso) {
  const date = new Date(iso);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return date.toLocaleDateString();
}

initPage();
