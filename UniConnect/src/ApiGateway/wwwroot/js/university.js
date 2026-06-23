let user = null;
let exchangeRates = { RUB: 1, USD: 0.0108, EUR: 0.01 }; // Fallback

async function initPage() {
  user = await checkAuth();
  Sidebar.render(user, 'universities');
  const urlParams = new URLSearchParams(window.location.search);
  const uniId = urlParams.get('id');
  if (!uniId) return window.location.href = '/universities';

  try {
    const data = await API.getUniversityById(uniId);
    const uni = data.university;
    const services = data.services;
    const container = document.getElementById('uni-content');

    const buildingImg = uni.image || '/img/universities/uni_building_default.png';
    const logoImg = uni.logo || '/img/universities/uni_logo_default.png';

    // 1. Fetch Hero Template
    const heroTemplate = await fetchTemplate('/templates/university/university-hero.html');
    let localCurrencyOption = '';
    if (user.localCurrency && user.localCurrency !== 'USD' && user.localCurrency !== 'EUR' && user.localCurrency !== 'RUB') {
      localCurrencyOption = `<option value="${user.localCurrency}" style="color:black;">Local: ${user.nationality} (${user.localCurrency})</option>`;
    }
    
    const heroHtml = renderTemplate(heroTemplate, {
      buildingImg,
      logoImg,
      name: uni.name,
      city: uni.city,
      localCurrencyOption
    });

    // 2. Fetch Program Row Template & Render Program Rows
    let programsHtml = '<p style="color:var(--text-muted);">No programs currently listed for this university.</p>';
    if (uni.programs && uni.programs.length > 0) {
      const progRowTemplate = await fetchTemplate('/templates/university/program-row.html');
      programsHtml = uni.programs.map(p => {
        const costRUBFormatted = `${p.costRUB.toLocaleString()} \u20bd`;
        const langBackground = p.language === 'English' ? 'var(--accent-purple)' : 'var(--bg-input)';
        const langColor = p.language === 'English' ? 'white' : 'var(--text-muted)';
        const langIconHtml = p.language === 'English' ? '<span data-icon="globe" data-size="12"></span>' : '';
        const languageText = p.language === 'English' ? 'Available in English' : 'RU';
        
        return renderTemplate(progRowTemplate, {
          costRUB: p.costRUB,
          costRUBFormatted,
          code: p.code,
          langBackground,
          langColor,
          langIconHtml,
          languageText,
          name: p.name,
          duration: p.duration || '4 years',
          level: p.level || 'Bachelor',
          uniId: uni.id
        });
      }).join('');
    }

    // 3. Fetch Campus Services Template
    const servicesTemplate = await fetchTemplate('/templates/university/campus-services.html');
    const serviceOptions = services.map(s => `<option value="${s.id}">${s.name} (${s.price > 0 ? s.price + ' MP' : 'Free'})</option>`).join('');
    
    // Extract rating, founded year, etc. based on university name
    let foundedYear = 1990;
    let rating = '4.5';
    let globalRank = '800';
    let campusType = 'Urban';

    const uName = uni.name.toLowerCase();
    if (uName.includes('hse') || uName.includes('economics')) {
      foundedYear = 1992;
      rating = '4.9';
      globalRank = '298';
      campusType = 'Multi-Campus';
    } else if (uName.includes('itmo')) {
      foundedYear = 1900;
      rating = '4.8';
      globalRank = '365';
      campusType = 'Urban Tech';
    } else if (uName.includes('lomonosov') || uName.includes('msu') || uName.includes('moscow state')) {
      foundedYear = 1755;
      rating = '5.0';
      globalRank = '75';
      campusType = 'Classic Campus';
    } else if (uName.includes('rudn') || uName.includes('peoples') || uName.includes('friendship')) {
      foundedYear = 1960;
      rating = '4.7';
      globalRank = '435';
      campusType = 'Green Campus';
    } else if (uName.includes('tsu') || uName.includes('tomsk state')) {
      foundedYear = 1878;
      rating = '4.7';
      globalRank = '264';
      campusType = 'Classic Siberian';
    }

    const servicesHtml = renderTemplate(servicesTemplate, {
      description: uni.description,
      serviceOptions,
      uniId: uni.id,
      foundedYear,
      rating,
      globalRank,
      campusType
    });

    // Combine all
    container.innerHTML = `
      ${heroHtml}
      <div style="margin-top:40px;">
        <h2 style="margin-bottom:24px;">Degree Programs & Annual Fees</h2>
        <div id="programs-list">
          ${programsHtml}
        </div>
      </div>
      ${servicesHtml}
    `;

    // Load rates for tuition conversion
    await fetchRates();

    // Re-render icons
    document.querySelectorAll('[data-icon]').forEach(el => {
      const iconName = el.getAttribute('data-icon');
      const size = el.getAttribute('data-size') || 18;
      el.innerHTML = getIcon(iconName, size);
    });
  } catch (e) {
    document.getElementById('uni-content').innerHTML = '<div class="empty-state"><p>University not found or an error occurred.</p></div>';
  }
}

async function fetchRates() {
  try {
    const data = await API.getExchangeRates('RUB');
    if (data.result === 'success') {
      exchangeRates = data.rates;
    }
  } catch (e) { console.error('Rate fetch failed', e); }
}

function updateTuitionCosts() {
  const curr = document.getElementById('tuition-currency').value;
  const rate = exchangeRates[curr] || 1;
  
  const currencySymbols = {
    'USD': '$',
    'EUR': '€',
    'RUB': '₽',
    'EGP': 'E£',
    'DZD': 'د.ج',
    'INR': '₹',
    'CNY': '¥',
    'VND': '₫',
    'NGN': '₦'
  };
  
  const symbol = currencySymbols[curr] || curr;
  
  document.querySelectorAll('.program-cost').forEach(el => {
    const rub = parseFloat(el.getAttribute('data-rub'));
    const converted = Math.round(rub * rate);
    
    if (curr === 'USD' || curr === 'EUR') {
      el.innerHTML = `${symbol}${converted.toLocaleString()}`;
    } else {
      el.innerHTML = `${converted.toLocaleString()} ${symbol}`;
    }
  });
}

async function bookUniService(uniId) {
  const serviceId = document.getElementById('booking-service').value;
  const notes = document.getElementById('booking-notes').value;
  
  try {
    await API.bookService({ universityId: uniId, serviceTypeId: serviceId, notes });
    showToast('Booking request sent successfully!');
    setTimeout(() => window.location.href = '/profile.html', 1500);
  } catch (e) {
    showToast(e.error || 'Failed to send booking.', 'error');
  }
}

initPage();
