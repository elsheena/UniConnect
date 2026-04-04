// ===== SHARED APP LOGIC =====

let currentUser = null;

// Dynamically load Floating Chat assets
const fsStyles = document.createElement('link');
fsStyles.rel = 'stylesheet';
fsStyles.href = '/css/floating_chat.css';
document.head.appendChild(fsStyles);

const fsScript = document.createElement('script');
fsScript.src = '/js/floating_chat.js';
document.head.appendChild(fsScript);

// Check auth state on page load and handle redirects
async function checkAuth() {
  try {
    const data = await API.me();
    currentUser = data.user;
    updateNavbar();
    document.dispatchEvent(new Event('authChecked'));
    
    // If on a page that requires auth, and not logged in, redirect
    const publicPages = ['/login.html', '/register.html', '/index.html', '/'];
    if (!publicPages.includes(window.location.pathname) && !data.user) {
      window.location.href = '/login.html';
      return null;
    }

    // If on login/register/index and ALREADY logged in, redirect to profile
    if ((window.location.pathname === '/login.html' || window.location.pathname === '/register.html' || window.location.pathname === '/index.html' || window.location.pathname === '/') && data.user) {
      window.location.href = '/profile.html';
      return null;
    }

    // Redirect legacy dashboard to profile
    if (window.location.pathname === '/dashboard.html') {
      window.location.href = '/profile.html';
      return null;
    }
    
    return currentUser;
  } catch {
    currentUser = null;
    updateNavbar();
    
    // Guest redirect
    const path = window.location.pathname;
    const protectedPaths = ['/dashboard.html', '/groups.html', '/services.html', '/profile.html', '/admin.html', '/earn.html', '/universities.html', '/university.html'];
    if (protectedPaths.includes(path)) {
      window.location.href = '/welcome.html';
    } else if (path === '/' || path === '/index.html') {
      window.location.href = '/welcome.html';
    }
    
    return null;
  }
}

// Update navbar based on auth state
function updateNavbar() {
  // If we are in a sidebar layout, the Sidebar.js component handles navigation
  if (document.body.classList.contains('sidebar-layout')) return;

  const authLinks = document.getElementById('auth-links');
  const userLinks = document.getElementById('user-links');
  const userNameEl = document.getElementById('user-name');
  const adminLink = document.getElementById('admin-link');

  if (!authLinks || !userLinks) return;

  if (currentUser) {
    authLinks.style.display = 'none';
    userLinks.style.display = 'flex';
    userNameEl.innerHTML = `<span data-icon="user"></span> ${currentUser.fullName}`;
    
    // Processing Icons manually since innerHTML was used
    const iconEl = userNameEl.querySelector('[data-icon]');
    if (window.getIcon && iconEl) iconEl.innerHTML = getIcon('user', 18);
    if (adminLink) {
      adminLink.style.display = currentUser.role === 'admin' ? 'inline' : 'none';
    }
  } else {
    authLinks.style.display = 'flex';
    userLinks.style.display = 'none';
  }
}

// Guard: redirect if not logged in
function requireLogin() {
  if (!currentUser) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

// Logout handler
async function handleLogout() {
  try {
    await API.logout();
  } catch {}
  currentUser = null;
  window.location.href = '/welcome.html';
}

// Show toast notification
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Format date
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Format relative time
function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Create status badge
function statusBadge(status) {
  const colors = {
    open: 'blue', accepted: 'orange', completed: 'green',
    cancelled: 'red', pending: 'orange', approved: 'green', rejected: 'red'
  };
  return `<span class="badge badge-${colors[status] || 'gray'}">${status}</span>`;
}
