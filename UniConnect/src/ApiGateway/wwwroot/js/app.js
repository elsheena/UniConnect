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
  const publicPages = [
    '/', '/index', '/index.html',
    '/welcome', '/welcome.html',
    '/login', '/login.html',
    '/register', '/register.html',
    '/faq', '/faq.html'
  ];
  const path = window.location.pathname;

  try {
    const data = await API.me();
    currentUser = data.user;
    window.currentUser = currentUser;
    updateNavbar();
    document.dispatchEvent(new Event('authChecked'));
    
    // If logged in and trying to access login/register, redirect to profile page
    const isLoginOrRegister = ['/login', '/login.html', '/register', '/register.html'].includes(path);
    if (isLoginOrRegister && currentUser) {
      window.location.href = '/profile.html';
      return null;
    }

    return currentUser;
  } catch (e) {
    currentUser = null;
    window.currentUser = null;
    updateNavbar();
    
    // If NOT logged in and on a protected page -> go to login
    if (!publicPages.includes(path)) {
      window.location.href = '/login.html';
      return null;
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
  window.currentUser = null;
  window.location.href = '/index.html';
}

// Show toast notification
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const iconSpan = document.createElement('span');
  iconSpan.className = 'toast-icon';
  iconSpan.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.appendChild(iconSpan);

  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  toast.appendChild(textSpan);

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

// Fetch HTML template
async function fetchTemplate(url) {
  let finalUrl = url;
  if (url.startsWith('/templates/')) {
    finalUrl = '/html' + url;
  }
  const separator = finalUrl.includes('?') ? '&' : '?';
  const response = await fetch(`${finalUrl}${separator}v=2`);
  return await response.text();
}

// Render dynamic content from template
function renderTemplate(templateStr, data) {
  return templateStr.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : '';
  });
}

// ===== OBJECT-ORIENTED PAGE BASE CONTROLLER =====
class BasePage {
  constructor(activeSidebarItem = null) {
    this.activeSidebarItem = activeSidebarItem;
    this.user = null;
  }

  async init() {
    this.user = await checkAuth();
    if (this.requiresAuth() && !this.user) {
      // checkAuth handles redirect, but we stop execution here
      return;
    }
    
    if (this.activeSidebarItem && window.Sidebar) {
      Sidebar.render(this.user, this.activeSidebarItem);
    }

    try {
      await this.onInit();
    } catch (e) {
      console.error("Error during page initialization:", e);
    }

    this.renderIcons();
  }

  requiresAuth() {
    return true; // default to true
  }

  async onInit() {
    // Override in subclass
  }

  renderIcons(container = document) {
    container.querySelectorAll('[data-icon]').forEach(el => {
      const name = el.getAttribute('data-icon');
      const size = el.getAttribute('data-size') || 18;
      if (window.getIcon) {
        el.innerHTML = getIcon(name, size);
      }
    });
  }
}
window.BasePage = BasePage;

class EmptyStateComponent {
  constructor(message, subtitle = '') {
    this.message = message;
    this.subtitle = subtitle;
  }
  render() {
    const root = document.createElement('div');
    root.className = 'empty-state';

    const iconDiv = document.createElement('div');
    iconDiv.className = 'empty-icon';
    const span = document.createElement('span');
    span.setAttribute('data-icon', 'info');
    span.setAttribute('data-size', '36');
    iconDiv.appendChild(span);
    root.appendChild(iconDiv);

    const h3 = document.createElement('h3');
    h3.textContent = this.message;
    root.appendChild(h3);

    if (this.subtitle) {
      const p = document.createElement('p');
      p.textContent = this.subtitle;
      root.appendChild(p);
    }

    if (window.getIcon) {
      span.innerHTML = getIcon('info', 36);
    }
    return root;
  }
}
window.EmptyStateComponent = EmptyStateComponent;

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const toggleBtn = input.nextElementSibling;
  if (!toggleBtn) return;
  
  if (input.type === 'password') {
    input.type = 'text';
    const iconSpan = toggleBtn.querySelector('[data-icon]');
    if (iconSpan) {
      iconSpan.setAttribute('data-icon', 'eye-off');
      if (window.getIcon) iconSpan.innerHTML = getIcon('eye-off', 16);
    }
  } else {
    input.type = 'password';
    const iconSpan = toggleBtn.querySelector('[data-icon]');
    if (iconSpan) {
      iconSpan.setAttribute('data-icon', 'eye');
      if (window.getIcon) iconSpan.innerHTML = getIcon('eye', 16);
    }
  }
}
window.togglePasswordVisibility = togglePasswordVisibility;


