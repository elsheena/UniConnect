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
          const linkUrl = this.user ? `/university.html?id=${u.id}` : '/register';
          const description = u.description.substring(0, 100);
          return renderTemplate(welcomeCardTemplate, {
            id: u.id,
            logo: u.logo || '/img/universities/default.png',
            name: u.name,
            city: u.city || 'Russia',
            description,
            linkUrl
          });
        }).join('');

        this.renderIcons(container);

        // Add card click listener for navigation
        container.addEventListener('click', (e) => {
          // If clicked inside the anchor link button, let default anchor behavior handle it
          if (e.target.closest('a')) return;
          const card = e.target.closest('.university-card');
          if (card) {
            const link = card.querySelector('a');
            if (link) {
              window.location.href = link.getAttribute('href');
            }
          }
        });
      }
    } catch (e) {
      console.error("Failed to load partner universities on index page:", e);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new IndexPage().init();
});
