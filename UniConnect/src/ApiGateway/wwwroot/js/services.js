function getServiceIcon(id) {
  if (id === 'airport_pickup') return 'airplane';
  if (id === 'student_consultation') return 'chat';
  if (id === 'representative_call') return 'building';
  if (id === 'scholarship_guidance') return 'clipboard';
  if (id === 'migration_help') return 'document';
  if (id === 'bank_sim') return 'creditcard';
  return 'briefcase';
}

let currentTab = 'browse';
let bookingServiceId = null;
let allServiceTypes = [];

async function loadServicesPage() {
  const user = await checkAuth();
  Sidebar.render(user, 'services');
  if (!user) return window.location.href = '/login';

  try {
    const uData = await API.getUniversities();
    const sel = document.getElementById('modal-university');
    sel.innerHTML = '<option value="">Choose university...</option>';
    uData.universities.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = `${u.name} — ${u.city}`;
      sel.appendChild(opt);
    });

    const sData = await API.getServiceTypes();
    allServiceTypes = sData.services;
  } catch {}

  switchTab('browse');
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

  if (tab === 'browse') {
    try {
      const data = await API.getServiceTypes();
      const cardTemplate = await fetchTemplate('/templates/services/service-card.html');
      
      const cardsHtml = data.services.map(s => {
        const iconHtml = getIcon(s.icon, 32);
        const priceText = s.price > 0 ? s.price + ' MP' : 'Free';
        const firstFreeBadge = s.firstFree ? '<span class="label">(1st free)</span>' : '';
        
        return renderTemplate(cardTemplate, {
          iconHtml,
          name: s.name,
          description: s.description,
          priceText,
          firstFreeBadge,
          id: s.id
        });
      }).join('');
      
      container.innerHTML = `<div class="grid-3">${cardsHtml}</div>`;
    } catch (e) {
      container.innerHTML = '<div class="empty-state"><p>Failed to load services.</p></div>';
    }
    renderIcons();
  } else if (tab === 'bookings') {
    try {
      const data = await API.getMyBookings();
      if (!data.bookings || data.bookings.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon"><span data-icon="list"></span></div><h3>No bookings yet</h3><p>Browse services and book one to get started.</p></div>';
      } else {
        const itemTemplate = await fetchTemplate('/templates/services/booking-item.html');
        
        const itemsHtml = data.bookings.map(b => {
          const iconHtml = getIcon(b.serviceIcon, 24);
          const detailsText = b.universityName || b.cityName || '';
          const timeAgoStr = formatDate(b.createdAt);
          const acceptedByText = b.acceptedByName ? ' • Accepted by ' + b.acceptedByName : '';
          const statusBadgeHtml = statusBadge(b.status);
          
          let actionButtonsHtml = '';
          if (b.status === 'accepted') {
            actionButtonsHtml = `<button class="btn btn-sm btn-success" onclick="completeBooking(${b.id})">Complete</button>`;
          } else if (b.status === 'open') {
            actionButtonsHtml = `<button class="btn btn-sm btn-secondary" onclick="cancelBooking(${b.id})">Cancel</button>`;
          }

          return renderTemplate(itemTemplate, {
            iconHtml,
            serviceName: b.serviceName,
            detailsText,
            timeAgoStr,
            acceptedByText,
            price: b.price,
            statusBadgeHtml,
            actionButtonsHtml
          });
        }).join('');
        
        container.innerHTML = itemsHtml;
      }
    } catch { 
      container.innerHTML = '<div class="empty-state"><p>Error loading bookings.</p></div>'; 
    }
    renderIcons();
  }
}

function openBookModal(serviceId, serviceName) {
  bookingServiceId = serviceId;
  const sType = allServiceTypes.find(s => s.id === serviceId);
  
  document.getElementById('modal-service-name').innerHTML = `<span data-icon="${getServiceIcon(serviceId)}"></span> Book: ${serviceName}`;
  
  const uniGroup = document.getElementById('modal-university-group');
  const cityGroup = document.getElementById('modal-city-group');
  
  uniGroup.style.display = sType && sType.hasUniversity ? 'block' : 'none';
  cityGroup.style.display = sType && sType.hasCity ? 'block' : 'none';

  document.getElementById('book-modal').classList.add('active');
  renderIcons();
}

function closeModal() {
  document.getElementById('book-modal').classList.remove('active');
  bookingServiceId = null;
}

async function confirmBooking() {
  if (!bookingServiceId) return;
  const sType = allServiceTypes.find(s => s.id === bookingServiceId);
  
  const payload = {
    serviceTypeId: bookingServiceId,
    notes: document.getElementById('modal-notes').value
  };

  if (sType.hasUniversity) {
    payload.universityId = document.getElementById('modal-university').value;
    if (!payload.universityId) return showToast('Please select a university.', 'info');
  }
  if (sType.hasCity) {
    const city = document.getElementById('modal-city').value;
    payload.notes = `[City: ${city}] ` + payload.notes; 
    if (!city) return showToast('Please select a city.', 'info');
  }

  try {
    await API.bookService(payload);
    showToast('Service booked!');
    closeModal();
    switchTab('bookings');
  } catch (e) {
    showToast(e.error || 'Failed to book.', 'error');
  }
}

async function acceptOffer(bookingId) {
  try {
    await API.acceptOffer(bookingId);
    showToast('Offer accepted! <span data-icon="money"></span>');
    switchTab('accepted');
  } catch (e) {
    showToast(e.error || 'Failed to accept.', 'error');
  }
}

async function completeBooking(bookingId) {
  try {
    const result = await API.completeService(bookingId);
    showToast(`Service completed! Earned: ${result.studentEarning}`);
    loadTabContent(currentTab);
  } catch (e) {
    showToast(e.error || 'Failed to complete.', 'error');
  }
}

async function cancelBooking(bookingId) {
  try {
    await API.cancelBooking(bookingId);
    showToast('Booking cancelled.');
    loadTabContent(currentTab);
  } catch (e) {
    showToast(e.error || 'Failed to cancel.', 'error');
  }
}

loadServicesPage();
