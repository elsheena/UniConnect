async function loadOpportunities() {
  const user = await checkAuth();
  if (!user) return window.location.href = '/login';
  if (user.role !== 'student' && user.role !== 'moderator' && user.role !== 'admin') {
    window.location.href = '/profile';
    return;
  }
  Sidebar.render(user, 'opportunities');
  
  if (!user.isVerified) {
    const container = document.querySelector('.container');
    try {
      const lockTemplate = await fetchTemplate('/templates/opportunities-lock.html');
      container.innerHTML = lockTemplate;
    } catch (e) {
      console.error('Failed to load lock template', e);
    }
  }

  // Render icons
  document.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.getAttribute('data-icon');
    const size = el.getAttribute('data-size') || 18;
    el.innerHTML = getIcon(name, size);
  });
}
loadOpportunities();
