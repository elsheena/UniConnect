/**
 * UniConnect Sidebar & Theme Utility
 * Injects the left navigation sidebar and handles Light/Dark themes.
 */

const Sidebar = {
  render: function(user, activePage) {
    const isGuest = !user;
    const isAdmin = user && user.role === 'admin';
    
    let navItems = [];
    
    if (isGuest) {
      navItems = [
        { id: 'index', label: 'Home', icon: 'logo', href: '/index.html' },
        { id: 'login', label: 'Login', icon: 'user', href: '/login.html' },
        { id: 'register', label: 'Register', icon: 'usercheck', href: '/register.html' }
      ];
    } else if (user.role === 'representative') {
      navItems = [
        { id: 'profile', label: 'My Profile', icon: 'user', href: '/profile.html' },
        { id: 'chats', label: 'Messages', icon: 'chat', href: '/chats.html' }
      ];
    } else {
      navItems = [
        { id: 'profile', label: 'My Profile', icon: 'user', href: '/profile.html' },
        { id: 'universities', label: 'Universities', icon: 'building', href: '/universities.html' },
        { id: 'groups', label: 'Groups', icon: 'globe', href: '/groups.html', hidden: user.role === 'applicant' },
        { id: 'services', label: 'Services', icon: 'list', href: '/services.html' },
        { id: 'events', label: 'Events Hub', icon: 'calendar', href: '/events.html' },
        { id: 'earn', label: 'Earn Matryoshka', icon: 'matryoshka', href: '/earn.html', hidden: user.role !== 'student' },
        { id: 'chats', label: 'Messages', icon: 'chat', href: '/chats.html' }
      ];
      if (isAdmin) navItems.push({ id: 'admin', label: 'Admin', icon: 'shield', href: '/admin.html' });
    }

    const html = `
      <div class="mobile-toggle" onclick="Sidebar.toggleMobile()">
        <div class="icon-wrapper">
          <div class="icon-logo"><span data-icon="logo" data-size="24"></span></div>
          <div class="icon-arrow"><span data-icon="arrow-left" data-size="24"></span></div>
        </div>
      </div>

      <aside class="sidebar">
        <div class="sidebar-header">
          <a href="/profile.html" class="sidebar-logo">
            <div class="sidebar-logo-icon"><span data-icon="logo" data-size="24"></span></div>
            UniConnect
          </a>
        </div>

        <nav class="sidebar-nav">
          ${navItems.filter(i => !i.hidden).map(item => `
            <a href="${item.href}" class="sidebar-link ${activePage === item.id ? 'active' : ''}">
              <span data-icon="${item.icon}"></span>
              ${item.label}
            </a>
          `).join('')}
        </nav>

        <div class="sidebar-footer">
          ${!isGuest ? `
          <div class="user-profile-mini">
            <div class="mini-avatar">
              ${user.avatarUrl && user.avatarStatus === 'approved' 
                ? `<img src="${user.avatarUrl}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;">`
                : user.fullName.charAt(0)
              }
            </div>
            <div class="mini-info">
              <h4>${user.fullName}</h4>
              <p>${user.avatarStatus === 'approved' ? '<span class="badge badge-green" style="padding:0px 4px;font-size:0.6rem;">Verified</span>' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
            </div>
          </div>
          ` : ''}

          <button class="theme-toggle-btn" onclick="ThemeManager.toggle()">
            <span id="theme-toggle-icon" data-icon="${document.body.classList.contains('light-theme') ? 'moon' : 'sun'}"></span>
            <span id="theme-toggle-text">Switch Theme</span>
          </button>

          ${!isGuest ? `
          <a href="#" onclick="handleLogout(); return false;" class="sidebar-link" style="color:var(--accent-red); margin-top:10px;">
            <span data-icon="x"></span> Logout
          </a>
          ` : ''}
        </div>
      </aside>
    `;

    const container = document.getElementById('sidebar-container');
    if (container) {
      container.innerHTML = html;
      document.body.classList.add('sidebar-layout');
      
      // Initialize icons
      container.querySelectorAll('[data-icon]').forEach(el => {
        const name = el.getAttribute('data-icon');
        const size = el.getAttribute('data-size') || 20;
        el.innerHTML = getIcon(name, size);
      });

      this.updateThemeUI();
    }
  },

  updateThemeUI: function() {
    const isLight = document.body.classList.contains('light-theme');
    const iconEl = document.getElementById('theme-toggle-icon');
    const textEl = document.getElementById('theme-toggle-text');
    if (iconEl && textEl) {
      iconEl.innerHTML = getIcon(isLight ? 'moon' : 'sun', 18);
      textEl.textContent = isLight ? 'Dark Mode' : 'Light Mode';
    }
  },
  
  toggleMobile: function() {
    const sidebar = document.querySelector('.sidebar');
    const isActive = sidebar.classList.toggle('active');
    document.body.classList.toggle('sidebar-active', isActive);
  },
};

const ThemeManager = {
  init: function() {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.body.classList.add('light-theme');
    }
  },
  toggle: function() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    Sidebar.updateThemeUI();
  }
};

// Auto-init theme
ThemeManager.init();
