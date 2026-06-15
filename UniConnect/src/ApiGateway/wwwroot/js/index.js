class IndexPage extends BasePage {
  constructor() {
    super('home');
  }

  requiresAuth() {
    return false;
  }

  async onInit() {
    if (this.user) {
      const btnStart = document.getElementById('btn-start-app');
      const btnAccess = document.getElementById('btn-access-acc');
      if (btnStart) {
        btnStart.href = '/profile.html';
        btnStart.textContent = 'Go to My Profile →';
      }
      if (btnAccess) {
        btnAccess.classList.add('hidden-initially');
      }
    }

    try {
      const data = await API.getUniversities();
      const container = document.getElementById('welcome-universities');
      if (container) {
        // Show first 3 universities
        const sample = data.universities.slice(0, 3);
        const welcomeCardTemplate = await fetchTemplate('/templates/welcome-uni-card.html');
        
        container.innerHTML = sample.map(u => {
          const linkUrl = this.user ? '/universities.html' : '/register.html';
          const description = u.description.substring(0, 100);
          return renderTemplate(welcomeCardTemplate, {
            name: u.name,
            description,
            linkUrl
          });
        }).join('');

        this.renderIcons(container);
      }
    } catch (e) {
      console.error("Failed to load partner universities on index page:", e);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new IndexPage().init();
});
