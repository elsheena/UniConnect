class SubjectItemComponent {
  constructor(name) {
    this.name = name;
  }
  render() {
    const box = document.createElement('div');
    box.className = 'subject-box';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'color-accent-blue';
    iconSpan.setAttribute('data-icon', 'check');
    iconSpan.setAttribute('data-size', '16');

    const nameSpan = document.createElement('span');
    nameSpan.className = 'subject-name';
    nameSpan.textContent = this.name;

    box.appendChild(iconSpan);
    box.appendChild(nameSpan);
    return box;
  }
}

class CareerBadgeComponent {
  constructor(name) {
    this.name = name;
  }
  render() {
    const span = document.createElement('span');
    span.className = 'badge badge-blue badge-large';
    span.textContent = this.name;
    return span;
  }
}

class ProgramPage extends BasePage {
  constructor() {
    super('universities');
    this.currentUni = null;
    this.currentProgram = null;
    this.exchangeRates = { RUB: 1, USD: 0.0108, EUR: 0.01 };
  }

  async onInit() {
    const params = new URLSearchParams(window.location.search);
    const uniId = params.get('uniId');
    const code = params.get('code');

    if (!uniId || !code) {
      window.location.href = '/universities.html';
      return;
    }

    try {
      const responseData = await API.getUniversityById(uniId);
      this.currentUni = responseData.university;
      this.currentProgram = this.currentUni.programs.find(p => p.code === code);

      if (!this.currentProgram) throw new Error('Program not found');

      await this.renderProgram();
      await this.fetchRates();
      this.updateCosts(); // Initialize costs
      this.setupEventListeners();
    } catch (e) {
      const container = document.getElementById('program-container');
      if (container) {
        container.innerHTML = '';
        container.appendChild(new EmptyStateComponent('Program not found.').render());
      }
    }
  }

  setupEventListeners() {
    const currSelect = document.getElementById('display-currency');
    if (currSelect) {
      currSelect.addEventListener('change', () => this.updateCosts());
    }

    const btnApply = document.getElementById('btn-apply-now');
    if (btnApply) {
      btnApply.addEventListener('click', () => this.applyNow());
    }

    const btnCallRep = document.getElementById('btn-call-rep');
    if (btnCallRep) {
      btnCallRep.addEventListener('click', () => this.bookUniService('representative_call', 'University Representative Call'));
    }

    const btnStudentConsult = document.getElementById('btn-student-consult');
    if (btnStudentConsult) {
      btnStudentConsult.addEventListener('click', () => this.bookUniService('student_consultation', 'Student Consultation'));
    }
    
    const verifyModalCancel = document.getElementById('btn-verify-cancel');
    if (verifyModalCancel) {
      verifyModalCancel.addEventListener('click', () => this.closeVerifyModal());
    }

    const verifyModalConfirm = document.getElementById('btn-verify-confirm');
    if (verifyModalConfirm) {
      verifyModalConfirm.addEventListener('click', () => {
        window.location.href = '/verify.html';
      });
    }
  }

  async fetchRates() {
    try {
      const data = await API.getExchangeRates('RUB');
      if (data.result === 'success') {
        this.exchangeRates = data.rates;
      }
    } catch (e) {
      console.error('Rate fetch failed', e);
    }
  }

  updateCosts() {
    const currSelect = document.getElementById('display-currency');
    if (!currSelect) return;
    
    const curr = currSelect.value;
    const rate = this.exchangeRates[curr] || 1;
    
    const currencySymbols = {
      'USD': '$', 'EUR': '€', 'RUB': '₽', 'EGP': 'E£',
      'DZD': 'د.ج', 'INR': '₹', 'CNY': '¥', 'VND': '₫', 'NGN': '₦'
    };
    
    const symbol = currencySymbols[curr] || curr;
    const rub = this.currentProgram.costRUB;
    const converted = Math.round(rub * rate);
    const el = document.getElementById('program-cost-display');
    
    if (el) {
      if (curr === 'USD' || curr === 'EUR') {
        el.textContent = `${symbol}${converted.toLocaleString()}`;
      } else {
        el.textContent = `${converted.toLocaleString()} ${symbol}`;
      }
    }
  }

  async renderProgram() {
    const container = document.getElementById('program-container');
    if (!container) return;

    const detailTemplate = await fetchTemplate('/templates/program/program-detail.html');

    let localCurrencyOption = '';
    if (this.user.localCurrency && this.user.localCurrency !== 'USD' && this.user.localCurrency !== 'EUR' && this.user.localCurrency !== 'RUB') {
      localCurrencyOption = `<option value="${this.user.localCurrency}">Local: ${this.user.nationality} (${this.user.localCurrency})</option>`;
    }

    const costRUBFormatted = `${this.currentProgram.costRUB.toLocaleString()} \u20bd`;
    const langColor = this.currentProgram.language === 'English' ? 'var(--accent-purple)' : 'var(--text-main)';
    const langFontWeight = this.currentProgram.language === 'English' ? '700' : '400';

    container.innerHTML = renderTemplate(detailTemplate, {
      uniId: this.currentUni.id,
      uniName: this.currentUni.name,
      uniCity: this.currentUni.city,
      code: this.currentProgram.code,
      name: this.currentProgram.name,
      description: this.currentProgram.description,
      localCurrencyOption,
      costRUBFormatted,
      duration: this.currentProgram.duration,
      level: this.currentProgram.level,
      langColor,
      langFontWeight,
      language: this.currentProgram.language
    });

    const subjectsContainer = document.getElementById('subjects-container');
    if (subjectsContainer) {
      (this.currentProgram.subjects || []).forEach(s => {
        subjectsContainer.appendChild(new SubjectItemComponent(s).render());
      });
    }

    const careersContainer = document.getElementById('careers-container');
    if (careersContainer) {
      (this.currentProgram.careers || []).forEach(c => {
        careersContainer.appendChild(new CareerBadgeComponent(c).render());
      });
    }

    this.renderIcons(container);
  }

  async bookUniService(serviceTypeId, serviceName) {
    try {
      const payload = {
        serviceTypeId,
        universityId: this.currentUni.id,
        notes: `Booked from ${this.currentProgram.name} (${this.currentProgram.code}) program page.`
      };
      await API.bookService(payload);
      showToast(`${serviceName} booked successfully!`);
    } catch (e) {
      showToast(e.error || `Failed to book ${serviceName}.`, 'error');
    }
  }

  async applyNow() {
    if (this.user.role !== 'applicant' && this.user.role !== 'student') {
      return showToast('Only applicants and students can apply to programs.', 'error');
    }

    if (!this.user.isVerified) {
      const modal = document.getElementById('verify-prompt-modal');
      if (modal) modal.classList.add('active');
      return;
    }

    try {
      const res = await API.applyToProgram(this.currentUni.id, this.currentProgram.code);
      showToast('Application sent! Redirecting to chat...');
      
      setTimeout(() => {
        window.location.href = `/chats.html?id=${res.chatId}`;
      }, 1500);
    } catch (e) {
      showToast(e.error || 'Failed to submit application.', 'error');
    }
  }

  closeVerifyModal() {
    const modal = document.getElementById('verify-prompt-modal');
    if (modal) modal.classList.remove('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ProgramPage().init();
});

