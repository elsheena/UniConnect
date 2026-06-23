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
        { id: 'login', label: 'Login', icon: 'user', href: '/login' },
        { id: 'register', label: 'Register', icon: 'usercheck', href: '/register' },
        { id: 'faq', label: 'FAQs', icon: 'document', href: '/faq' }
      ];
    } else if (user.role === 'representative') {
      navItems = [
        { id: 'profile', label: 'My Profile', icon: 'user', href: '/profile' },
        { id: 'notifications', label: 'Notifications', icon: 'bell', href: '/notifications' },
        { id: 'requests', label: 'Requests', icon: 'list', href: '/requests' },
        { id: 'admin', label: 'Verification Panel', icon: 'shield', href: '/admin' },
        { id: 'faq', label: 'FAQs', icon: 'document', href: '/faq' }
      ];
    } else if (user.role === 'applicant') {
      navItems = [
        { id: 'profile', label: 'My Profile', icon: 'user', href: '/profile' },
        { id: 'notifications', label: 'Notifications', icon: 'bell', href: '/notifications' },
        { id: 'wallet', label: 'Wallet', icon: 'wallet', href: '/wallet' },
        { id: 'universities', label: 'Universities', icon: 'building', href: '/universities' },
        { id: 'services', label: 'Services', icon: 'list', href: '/services' },
        { id: 'faq', label: 'FAQs', icon: 'document', href: '/faq' }
      ];
    } else {
      navItems = [
        { id: 'profile', label: 'My Profile', icon: 'user', href: '/profile' },
        { id: 'notifications', label: 'Notifications', icon: 'bell', href: '/notifications' },
        { id: 'wallet', label: 'Wallet', icon: 'wallet', href: '/wallet', hidden: user.role !== 'student' && user.role !== 'moderator' },
        { id: 'opportunities', label: 'Opportunities', icon: 'star', href: '/opportunities', hidden: user.role !== 'student' && user.role !== 'moderator' },
        { id: 'universities', label: 'Universities', icon: 'building', href: '/universities' },
        { id: 'services', label: 'Services', icon: 'list', href: '/services' },
        { id: 'faq', label: 'FAQs', icon: 'document', href: '/faq' }
      ];
      if (isAdmin) {
        navItems.push({ id: 'admin', label: 'Admin', icon: 'shield', href: '/admin' });
        navItems.push({ id: 'add-data', label: 'Add Data', icon: 'plus', href: '/add-data' });
        navItems.push({ id: 'tests', label: 'System Tests', icon: 'star', href: '/tests' });
      } else if (user.role === 'moderator') {
        navItems.push({ id: 'admin', label: 'Moderate', icon: 'shield', href: '/admin' });
      }
    }

    const container = document.getElementById('sidebar-container');
    if (!container) return;

    container.innerHTML = '';

    // Mobile Toggle Button
    const mobileToggle = document.createElement('div');
    mobileToggle.className = 'mobile-toggle';
    mobileToggle.addEventListener('click', Sidebar.toggleMobile);

    const wrapper = document.createElement('div');
    wrapper.className = 'icon-wrapper';

    const logoDiv = document.createElement('div');
    logoDiv.className = 'icon-logo';
    const logoIcon = document.createElement('span');
    logoIcon.setAttribute('data-icon', 'logo');
    logoIcon.setAttribute('data-size', '24');
    logoDiv.appendChild(logoIcon);

    const arrowDiv = document.createElement('div');
    arrowDiv.className = 'icon-arrow';
    const arrowIcon = document.createElement('span');
    arrowIcon.setAttribute('data-icon', 'arrow-left');
    arrowIcon.setAttribute('data-size', '24');
    arrowDiv.appendChild(arrowIcon);

    wrapper.appendChild(logoDiv);
    wrapper.appendChild(arrowDiv);
    mobileToggle.appendChild(wrapper);
    container.appendChild(mobileToggle);

    // Sidebar Container
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';

    // Sidebar Header
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    
    const logoLink = document.createElement('a');
    logoLink.href = '/';
    logoLink.className = 'sidebar-logo';
    
    const headerLogoIcon = document.createElement('span');
    headerLogoIcon.className = 'sidebar-logo-icon';
    const headerLogoSpan = document.createElement('span');
    headerLogoSpan.setAttribute('data-icon', 'logo');
    headerLogoSpan.setAttribute('data-size', '24');
    headerLogoIcon.appendChild(headerLogoSpan);
    
    logoLink.appendChild(headerLogoIcon);
    logoLink.appendChild(document.createTextNode(' UniConnect'));
    header.appendChild(logoLink);
    sidebar.appendChild(header);

    // Sidebar Navigation
    const nav = document.createElement('nav');
    nav.className = 'sidebar-nav';
    
    navItems.filter(i => !i.hidden).forEach(item => {
      const link = document.createElement('a');
      link.href = item.href;
      link.className = `sidebar-link ${activePage === item.id ? 'active' : ''}`;
      
      const itemIcon = document.createElement('span');
      itemIcon.setAttribute('data-icon', item.icon);
      
      link.appendChild(itemIcon);
      link.appendChild(document.createTextNode(` ${item.label}`));
      nav.appendChild(link);
    });
    sidebar.appendChild(nav);

    // Sidebar Footer
    const footer = document.createElement('div');
    footer.className = 'sidebar-footer';

    if (!isGuest) {
      const miniProfile = document.createElement('div');
      miniProfile.className = 'user-profile-mini';

      const miniAvatar = document.createElement('div');
      miniAvatar.className = 'mini-avatar';
      if (user.avatarUrl && user.avatarStatus === 'approved') {
        const avatarImg = document.createElement('img');
        avatarImg.src = user.avatarUrl;
        avatarImg.alt = 'Avatar';
        avatarImg.style.width = '100%';
        avatarImg.style.height = '100%';
        avatarImg.style.objectFit = 'cover';
        avatarImg.style.borderRadius = 'inherit';
        miniAvatar.appendChild(avatarImg);
      } else {
        miniAvatar.textContent = user.fullName.charAt(0);
      }

      const miniInfo = document.createElement('div');
      miniInfo.className = 'mini-info';
      
      const nameHeader = document.createElement('h4');
      nameHeader.textContent = user.fullName;
      miniInfo.appendChild(nameHeader);

      const roleText = document.createElement('p');
      if (user.isVerified) {
        const badge = document.createElement('span');
        badge.className = 'badge badge-green';
        badge.style.padding = '0px 4px';
        badge.style.fontSize = '0.6rem';
        badge.textContent = 'Verified';
        roleText.appendChild(badge);
      } else if (user.avatarStatus === 'pending') {
        const badge = document.createElement('span');
        badge.className = 'badge badge-gray';
        badge.style.padding = '0px 4px';
        badge.style.fontSize = '0.6rem';
        badge.textContent = 'Pending Verification';
        roleText.appendChild(badge);
      } else {
        roleText.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
      }
      miniInfo.appendChild(roleText);

      miniProfile.appendChild(miniAvatar);
      miniProfile.appendChild(miniInfo);
      footer.appendChild(miniProfile);
    }

    // Theme Toggle Button
    const themeBtn = document.createElement('button');
    themeBtn.className = 'theme-toggle-btn';
    themeBtn.addEventListener('click', ThemeManager.toggle);

    const isLight = document.body.classList.contains('light-theme');
    const themeIcon = document.createElement('span');
    themeIcon.id = 'theme-toggle-icon';
    themeIcon.setAttribute('data-icon', isLight ? 'moon' : 'sun');
    
    const themeText = document.createElement('span');
    themeText.id = 'theme-toggle-text';
    themeText.textContent = isLight ? 'Switch Theme' : 'Switch Theme';

    themeBtn.appendChild(themeIcon);
    themeBtn.appendChild(themeText);
    footer.appendChild(themeBtn);

    // Logout Link
    if (!isGuest) {
      const logoutLink = document.createElement('a');
      logoutLink.href = '#';
      logoutLink.className = 'sidebar-link';
      logoutLink.style.color = 'var(--accent-red)';
      logoutLink.style.marginTop = '10px';
      logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
      });

      const logoutIcon = document.createElement('span');
      logoutIcon.setAttribute('data-icon', 'x');
      
      logoutLink.appendChild(logoutIcon);
      logoutLink.appendChild(document.createTextNode(' Logout'));
      footer.appendChild(logoutLink);
    }

    sidebar.appendChild(footer);
    container.appendChild(sidebar);

    document.body.classList.add('sidebar-layout');

    // Initialize icons
    container.querySelectorAll('[data-icon]').forEach(el => {
      const name = el.getAttribute('data-icon');
      const size = el.getAttribute('data-size') || 20;
      if (window.getIcon) {
        el.innerHTML = getIcon(name, size);
      }
    });

    this.updateThemeUI();
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

window.Sidebar = Sidebar;

