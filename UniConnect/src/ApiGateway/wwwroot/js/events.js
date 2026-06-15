class EventsPage extends BasePage {
  constructor() {
    super('events');
  }

  async onInit() {
    if (this.user.role === 'applicant') {
      const accessDeniedTemplate = await fetchTemplate('/templates/events/access-denied.html');
      const iconHtml = getIcon('shield', 64);
      document.querySelector('.page-content').innerHTML = renderTemplate(accessDeniedTemplate, { iconHtml });
      return;
    }

    await this.loadEvents();
  }

  async loadEvents() {
    const container = document.getElementById('events-grid');
    if (!container) return;

    try {
      const response = await fetch('/api/events');
      const data = await response.json();

      if (!data.events || data.events.length === 0) {
        container.innerHTML = '';
        container.appendChild(new EmptyStateComponent('No events found.').render());
        return;
      }

      const cardTemplate = await fetchTemplate('/templates/events/event-card.html');
      container.innerHTML = data.events.map(ev => {
        return renderTemplate(cardTemplate, {
          image: ev.image,
          category: ev.category,
          date: ev.date,
          title: ev.title,
          description: ev.description,
          location: ev.location,
          link: ev.link
        });
      }).join('');

      // Re-render icons
      container.querySelectorAll('[data-icon]').forEach(el => {
        const name = el.getAttribute('data-icon');
        el.innerHTML = getIcon(name, 14);
      });

    } catch (e) {
      console.error(e);
      container.innerHTML = '';
      container.appendChild(new EmptyStateComponent('Failed to load events.').render());
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new EventsPage().init();
});

