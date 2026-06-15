class DepositPage extends BasePage {
  constructor() {
    super('wallet');
    const params = new URLSearchParams(window.location.search);
    this.depositAmount = parseFloat(params.get('amount')) || 0;
  }

  async onInit() {
    this.depositDisplay = document.getElementById('deposit-display');
    this.payBtnAmount = document.getElementById('pay-btn-amount');
    this.cardNameInput = document.getElementById('card-name');
    this.cardNumberInput = document.getElementById('card-number');
    this.cardExpiryInput = document.getElementById('card-expiry');
    this.cardCvvInput = document.getElementById('card-cvv');
    this.payButton = document.getElementById('pay-btn');

    if (this.depositDisplay) {
      this.depositDisplay.textContent = `$${this.depositAmount.toFixed(2)}`;
    }
    if (this.payBtnAmount) {
      this.payBtnAmount.textContent = `$${this.depositAmount.toFixed(2)}`;
    }

    if (this.depositAmount <= 0) {
      showToast('No deposit amount specified. Returning to wallet.', 'error');
      setTimeout(() => window.location.href = '/wallet.html', 1500);
      return;
    }

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.cardNumberInput) {
      this.cardNumberInput.addEventListener('input', (e) => this.formatCardNumber(e.target));
    }
    if (this.cardExpiryInput) {
      this.cardExpiryInput.addEventListener('input', (e) => this.formatExpiry(e.target));
    }
    if (this.payButton) {
      this.payButton.addEventListener('click', () => this.processPayment());
    }
  }

  formatCardNumber(input) {
    let v = input.value.replace(/\D/g, '').substring(0, 16);
    input.value = v.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  formatExpiry(input) {
    let v = input.value.replace(/\D/g, '').substring(0, 4);
    if (v.length >= 3) v = v.substring(0, 2) + '/' + v.substring(2);
    input.value = v;
  }

  async processPayment() {
    const name = this.cardNameInput.value.trim();
    const number = this.cardNumberInput.value.replace(/\s/g, '');
    const expiry = this.cardExpiryInput.value.trim();
    const cvv = this.cardCvvInput.value.trim();

    if (!name) return showToast('Enter cardholder name.', 'error');
    if (number.length < 13) return showToast('Enter a valid card number.', 'error');
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return showToast('Enter a valid expiry date (MM/YY).', 'error');
    if (cvv.length < 3) return showToast('Enter a valid CVV.', 'error');

    // Simulate processing
    const btn = this.payButton;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0 auto;"></div>';

    // Fake processing delay
    await new Promise(r => setTimeout(r, 1800));

    try {
      const res = await API.walletDeposit(this.depositAmount);
      btn.innerHTML = '<span data-icon="check"></span> Payment Successful!';
      btn.style.background = 'var(--accent-green)';
      showToast(res.message);
      setTimeout(() => window.location.href = '/wallet.html', 2000);
    } catch (e) {
      btn.disabled = false;
      btn.innerHTML = `<span data-icon="lock"></span> Pay $${this.depositAmount.toFixed(2)}`;
      this.renderIcons(btn);
      showToast(e.error || 'Payment failed.', 'error');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new DepositPage().init();
});
