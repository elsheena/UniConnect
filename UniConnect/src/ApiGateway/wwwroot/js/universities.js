class UniversitiesPage extends BasePage {
  constructor() {
    super('universities');
  }

  requiresAuth() {
    return false;
  }

  async onInit() {
    const container = document.getElementById('universities-grid');
    if (!container) return;

    try {
      const data = await API.getUniversities();
      if (!data.universities || data.universities.length === 0) {
        container.innerHTML = '';
        container.appendChild(new EmptyStateComponent('No universities found.').render());
      } else {
        const cardTemplate = await fetchTemplate('/templates/university/university-card.html');

        const cardsHtml = data.universities.map(u => {
          const descriptionTruncated = u.description.substring(0, 80);
          return renderTemplate(cardTemplate, {
            id: u.id,
            logo: u.logo,
            name: u.name,
            city: u.city,
            descriptionTruncated
          });
        }).join('');

        container.innerHTML = cardsHtml;
        this.renderIcons(container);
      }
    } catch (e) {
      container.innerHTML = '';
      container.appendChild(new EmptyStateComponent('Failed to load universities.').render());
    }

    this.setupEventListeners();
  }

  setupEventListeners() {
    const grid = document.getElementById('universities-grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const card = e.target.closest('.university-card');
        if (card) {
          const id = card.getAttribute('data-id');
          if (id) {
            window.location.href = `/university.html?id=${id}`;
          }
        }
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new UniversitiesPage().init();
});
