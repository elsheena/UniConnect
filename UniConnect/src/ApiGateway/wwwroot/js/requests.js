let currentTab = 'offers';

async function loadRequestsPage() {
  const user = await checkAuth();
  if (!user) return window.location.href = '/login';
  if (user.role !== 'representative') {
    window.location.href = '/profile';
    return;
  }
  Sidebar.render(user, 'requests');
  switchTab('offers');
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`.tab[onclick="switchTab('${tab}')"]`);
  if (activeTab) activeTab.classList.add('active');
  loadTabContent(tab);
}

async function loadTabContent(tab) {
  const container = document.getElementById('tab-content');
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  if (tab === 'offers') {
    try {
      const data = await API.getOffers();
      if (!data.offers || data.offers.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon"><span data-icon="inbox"></span></div><h3>No open requests</h3><p>There are currently no open requests for your university.</p></div>';
      } else {
        const itemTemplate = await fetchTemplate('/templates/requests/request-item.html');
        
        container.innerHTML = data.offers.map(b => {
          const iconHtml = getIcon(b.serviceIcon, 24);
          const notesText = b.notes ? ' • "' + b.notes + '"' : '';
          const detailsText = `Requested by ${b.bookerName} • ${b.universityName || 'Your university'}${notesText}`;
          const actionButtonsHtml = `<button class="btn btn-sm btn-success" onclick="acceptOffer(${b.id})">Accept</button>`;

          return renderTemplate(itemTemplate, {
            iconHtml,
            serviceName: b.serviceName,
            detailsText,
            price: b.price,
            statusBadgeHtml: '',
            actionButtonsHtml
          });
        }).join('');
      }
    } catch {
      container.innerHTML = '<div class="empty-state"><p>Failed to load requests.</p></div>';
    }
  } else if (tab === 'accepted') {
    try {
      const data = await API.getAcceptedServices();
      if (!data.bookings || data.bookings.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon"><span data-icon="list"></span></div><h3>No accepted requests</h3><p>Accept open requests to support applicants.</p></div>';
      } else {
        const itemTemplate = await fetchTemplate('/templates/requests/request-item.html');
        
        container.innerHTML = data.bookings.map(b => {
          const iconHtml = getIcon(b.serviceIcon, 24);
          const detailsText = `For: ${b.bookerName} • ${b.universityName || ''} • ${formatDate(b.acceptedAt || b.createdAt)}`;
          const statusBadgeHtml = statusBadge(b.status);
          
          let actionButtonsHtml = '';
          if (b.status === 'accepted') {
            actionButtonsHtml = `
              <a href="/chats.html?bookingId=${b.id}" class="btn btn-sm btn-secondary">Chat</a>
              <button class="btn btn-sm btn-success" onclick="completeBooking(${b.id})">Complete</button>
            `;
          }

          return renderTemplate(itemTemplate, {
            iconHtml,
            serviceName: b.serviceName,
            detailsText,
            price: b.price,
            statusBadgeHtml,
            actionButtonsHtml
          });
        }).join('');
      }
    } catch {
      container.innerHTML = '<div class="empty-state"><p>Failed to load accepted requests.</p></div>';
    }
  }

  // Re-render icons for dynamic content
  container.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.getAttribute('data-icon');
    const size = el.getAttribute('data-size') || 16;
    el.innerHTML = getIcon(name, size);
  });
}

async function completeBooking(bookingId) {
  try {
    const result = await API.completeService(bookingId);
    showToast(`Request completed!`);
    loadTabContent(currentTab);
  } catch (e) {
    showToast(e.error || 'Failed to complete.', 'error');
  }
}

async function acceptOffer(id) {
  try {
    const res = await API.acceptOffer(id);
    showToast(res.message);
    if (res.chatId) {
      window.location.href = `/chats.html?id=${res.chatId}`;
    } else {
      switchTab('accepted');
    }
  } catch (e) {
    showToast(e.error || 'Failed to accept request.', 'error');
  }
}

loadRequestsPage();
