// Ensure chevron-down icon is available
if (window.SVG_ICONS && !window.SVG_ICONS['chevron-down']) {
  window.SVG_ICONS['chevron-down'] = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
}

async function init() {
  const user = await checkAuth();
  Sidebar.render(user, 'faq');
}

function toggleFAQ(element) {
  const item = element.parentElement;
  const isActive = item.classList.contains('active');

  // Close all other open items
  document.querySelectorAll('.faq-item').forEach(el => {
    el.classList.remove('active');
  });

  if (!isActive) {
    item.classList.add('active');
  }
}

function filterFAQs() {
  const query = document.getElementById('faq-search').value.toLowerCase();
  const items = document.querySelectorAll('.faq-item');

  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    const category = item.getAttribute('data-category').toLowerCase();

    if (text.includes(query) || category.includes(query)) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}

init();
