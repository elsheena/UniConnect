let currentTab = 'offers';

async function loadEarnPage() {
  const user = await checkAuth();
  if (!user) return window.location.href = '/login';
  if ((user.role !== 'student' && user.role !== 'moderator') || !user.isVerified) {
    window.location.href = '/profile';
    return;
  }
  Sidebar.render(user, 'earn');
  switchTab('offers');
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const activeTabBtn = document.querySelector(`.tab[onclick="switchTab('${tab}')"]`);
  if (activeTabBtn) activeTabBtn.classList.add('active');
  loadTabContent(tab);
}

async function loadTabContent(tab) {
  const container = document.getElementById('tab-content');
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  if (tab === 'offers') {
    try {
      const data = await API.getOffers();
      if (!data.offers || data.offers.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon"><span data-icon="inbox" data-size="48"></span></div><h3>No open offers</h3><p>Check back later for new service requests from applicants.</p></div>';
      } else {
        const cardTemplate = await fetchTemplate('/templates/earn-opportunity-card.html');
        container.innerHTML = data.offers.map(b => {
          const iconHtml = getIcon(b.serviceIcon, 24);
          const detailsText = `Requested by ${b.bookerName} • ${b.universityName || 'Any university'}${b.notes ? ' • "' + b.notes + '"' : ''}`;
          const actionsHtml = `<button class="btn btn-sm btn-success" onclick="acceptOffer('${b.id}')">Accept</button>`;
          
          return renderTemplate(cardTemplate, {
            iconHtml,
            serviceName: b.serviceName,
            detailsText,
            studentEarning: b.studentEarning,
            actionsHtml
          });
        }).join('');
      }
    } catch {
      container.innerHTML = '<div class="empty-state"><p>Failed to load offers.</p></div>';
    }
  } else if (tab === 'accepted') {
    try {
      const data = await API.getAcceptedServices();
      if (!data.bookings || data.bookings.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon"><span data-icon="list" data-size="48"></span></div><h3>No accepted services</h3><p>Accept offers to start earning.</p></div>';
      } else {
        const cardTemplate = await fetchTemplate('/templates/earn-opportunity-card.html');
        container.innerHTML = data.bookings.map(b => {
          const iconHtml = getIcon(b.serviceIcon, 24);
          const detailsText = `For: ${b.bookerName} • ${b.universityName || ''} • ${formatDate(b.acceptedAt || b.createdAt)}`;
          
          let actionsHtml = statusBadge(b.status);
          if (b.status === 'accepted') {
            actionsHtml += ` <a href="/chats.html?bookingId=${b.id}" class="btn btn-sm btn-secondary">Chat</a>`;
            actionsHtml += ` <button class="btn btn-sm btn-success" onclick="completeBooking('${b.id}')">Complete</button>`;
          }

          return renderTemplate(cardTemplate, {
            iconHtml,
            serviceName: b.serviceName,
            detailsText,
            studentEarning: b.studentEarning,
            actionsHtml
          });
        }).join('');
      }
    } catch {
      container.innerHTML = '<div class="empty-state"><p>Failed to load.</p></div>';
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
    showToast(`Service completed! Earned: ${result.studentEarning} MP`);
    loadTabContent(currentTab);
  } catch (e) {
    showToast(e.error || 'Failed to complete.', 'error');
  }
}

async function acceptOffer(id) {
  try {
    const res = await API.acceptOffer(id);
    showToast(res.message);
    // Redirect to chat
    if (res.chatId) {
      window.location.href = `/chats.html?id=${res.chatId}`;
    } else {
      switchTab('accepted');
    }
  } catch (e) {
    showToast(e.error || 'Failed to accept offer.', 'error');
  }
}

loadEarnPage();
