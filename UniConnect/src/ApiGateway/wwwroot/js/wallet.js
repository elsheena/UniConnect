class WalletPage extends BasePage {
  constructor() {
    super('wallet');
    this.walletData = null;
    this.exchangeRates = {};
    this.activeCurrency = 'USD';

    this.NATIONALITY_CURRENCY = {
      'Egypt': 'EGP', 'Algeria': 'DZD', 'Morocco': 'MAD', 'India': 'INR',
      'China': 'CNY', 'Turkey': 'TRY', 'Iraq': 'IQD', 'Syria': 'SYP',
      'Nigeria': 'NGN', 'Vietnam': 'VND', 'Tunisia': 'TND', 'Jordan': 'JOD',
      'Pakistan': 'PKR', 'Bangladesh': 'BDT', 'Yemen': 'YER', 'Italy': 'EUR',
      'Germany': 'EUR', 'France': 'EUR', 'Brazil': 'BRL', 'Japan': 'JPY',
      'South Korea': 'KRW', 'Indonesia': 'IDR', 'Iran': 'IRR', 'Mexico': 'MXN'
    };
    
    this.CURRENCY_NAMES = {
      'RUB': 'Russian Ruble', 'EGP': 'Egyptian Pound', 'DZD': 'Algerian Dinar',
      'MAD': 'Moroccan Dirham', 'INR': 'Indian Rupee', 'CNY': 'Chinese Yuan',
      'TRY': 'Turkish Lira', 'IQD': 'Iraqi Dinar', 'SYP': 'Syrian Pound',
      'NGN': 'Nigerian Naira', 'VND': 'Vietnamese Dong', 'TND': 'Tunisian Dinar',
      'JOD': 'Jordanian Dinar', 'PKR': 'Pakistani Rupee', 'BDT': 'Bangladeshi Taka',
      'YER': 'Yemeni Rial', 'EUR': 'Euro', 'BRL': 'Brazilian Real',
      'JPY': 'Japanese Yen', 'KRW': 'South Korean Won', 'IDR': 'Indonesian Rupiah',
      'IRR': 'Iranian Rial', 'MXN': 'Mexican Peso', 'USD': 'US Dollar'
    };
    
    this.CURRENCY_SYMBOLS = {
      'USD': '$', 'RUB': '₽', 'EUR': '€', 'EGP': 'E£', 'INR': '₹',
      'CNY': '¥', 'TRY': '₺', 'JPY': '¥', 'NGN': '₦', 'GBP': '£',
      'PKR': '₨', 'BDT': '৳', 'KRW': '₩', 'VND': '₫'
    };
  }

  async onInit() {
    if (this.user.role !== 'student' && this.user.role !== 'applicant') {
      window.location.href = '/profile.html';
      return;
    }

    const redeemCard = document.getElementById('redeem-card');
    if (redeemCard && this.user.role !== 'student') {
      redeemCard.style.display = 'none';
    }

    // Add user's nationality currency to the display dropdown
    const currSelect = document.getElementById('display-currency');
    if (currSelect && this.user.nationality && this.NATIONALITY_CURRENCY[this.user.nationality]) {
      const code = this.NATIONALITY_CURRENCY[this.user.nationality];
      if (code !== 'RUB') {
        const name = this.CURRENCY_NAMES[code] || code;
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = `${name} (${code})`;
        currSelect.appendChild(opt);
      }
    }

    this.setupEventListeners();
    await this.fetchRates();

    try {
      this.walletData = await API.getWallet();
      this.renderBalances();
      await this.renderTransactions();
    } catch (e) {
      showToast(e.error || 'Failed to load wallet.', 'error');
    }
  }

  setupEventListeners() {
    const currSelect = document.getElementById('display-currency');
    if (currSelect) {
      currSelect.addEventListener('change', () => this.switchDisplayCurrency());
    }

    const btnDeposit = document.getElementById('btn-deposit');
    if (btnDeposit) {
      btnDeposit.addEventListener('click', () => this.doDeposit());
    }

    const btnBuyMP = document.getElementById('btn-buy-mp');
    if (btnBuyMP) {
      btnBuyMP.addEventListener('click', () => this.doBuyMP());
    }

    const btnRedeem = document.getElementById('btn-redeem');
    if (btnRedeem) {
      btnRedeem.addEventListener('click', () => this.doRedeem());
    }

    const btnWithdraw = document.getElementById('btn-withdraw');
    if (btnWithdraw) {
      btnWithdraw.addEventListener('click', () => this.doWithdraw());
    }

    const buyMpInput = document.getElementById('buy-mp-amount');
    if (buyMpInput) {
      buyMpInput.addEventListener('input', () => this.previewBuyMP());
    }

    const redeemInput = document.getElementById('redeem-amount');
    if (redeemInput) {
      redeemInput.addEventListener('input', () => this.previewRedeem());
    }
  }

  async fetchRates() {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await res.json();
      if (data.result === 'success') {
        this.exchangeRates = data.rates;
        this.exchangeRates['USD'] = 1;
      }
    } catch {
      this.exchangeRates = { USD: 1, RUB: 92.5, EGP: 50.5, INR: 83.2, CNY: 7.24, TRY: 32.1, NGN: 1550, EUR: 0.92, VND: 25400, PKR: 278, BDT: 110, JPY: 150 };
    }
    this.renderBalances();
  }

  switchDisplayCurrency() {
    const currSelect = document.getElementById('display-currency');
    if (currSelect) {
      this.activeCurrency = currSelect.value;
      this.renderBalances();
      this.renderTransactions();
    }
  }

  formatInCurrency(usdAmount) {
    const rate = this.exchangeRates[this.activeCurrency] || 1;
    const converted = usdAmount * rate;
    const sym = this.CURRENCY_SYMBOLS[this.activeCurrency] || '';
    return `${sym}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  renderBalances() {
    if (!this.walletData) return;
    const balUsd = document.getElementById('balance-usd');
    const balMp = document.getElementById('balance-mp');
    const rateText = document.getElementById('balance-usd-rate');

    if (balUsd) balUsd.textContent = this.formatInCurrency(this.walletData.balanceUSD || 0);
    if (balMp) balMp.textContent = `${this.walletData.balanceMP || 0} MP`;

    const rate = this.exchangeRates[this.activeCurrency] || 1;
    if (rateText) {
      if (this.activeCurrency !== 'USD') {
        rateText.textContent = `1 USD = ${rate.toLocaleString(undefined, {maximumFractionDigits:2})} ${this.activeCurrency}`;
      } else {
        rateText.textContent = '';
      }
    }
  }

  async renderTransactions() {
    const list = document.getElementById('tx-list');
    if (!list) return;

    if (!this.walletData || !this.walletData.transactions || this.walletData.transactions.length === 0) {
      list.innerHTML = '<p class="no-transactions-label">No transactions yet.</p>';
      return;
    }

    const typeIcons = { deposit: 'creditcard', buy_mp: 'matryoshka', redeem: 'money', withdraw: 'inbox' };
    const typeColors = { deposit: 'var(--accent-green)', buy_mp: 'var(--accent-purple)', redeem: 'var(--accent-blue)', withdraw: 'var(--accent-red)' };

    try {
      const rowTemplate = await fetchTemplate('/templates/wallet-tx-row.html');
      list.innerHTML = this.walletData.transactions.map(tx => {
        const usdDisplay = tx.amountUSD ? this.formatInCurrency(Math.abs(tx.amountUSD)) : '';
        const sign = tx.amountUSD > 0 ? '+' : '-';
        
        const usdValueHtml = tx.amountUSD ? `<div class="${tx.amountUSD > 0 ? 'tx-value-green' : 'tx-value-red'}">${sign}${usdDisplay}</div>` : '';
        const mpValueHtml = tx.amountMP ? `<div class="${tx.amountMP > 0 ? 'tx-value-purple' : 'tx-value-muted'}">${tx.amountMP > 0 ? '+' : ''}${tx.amountMP} MP</div>` : '';
        const iconHtml = getIcon(typeIcons[tx.type] || 'money', 20);
        const typeColor = typeColors[tx.type] || 'var(--text-primary)';
        const timeAgoStr = timeAgo(tx.createdAt);

        return renderTemplate(rowTemplate, {
          typeColor,
          iconHtml,
          description: tx.description,
          timeAgoStr,
          usdValueHtml,
          mpValueHtml
        });
      }).join('');
    } catch (e) {
      console.error('Failed to render transactions', e);
    }
  }

  previewBuyMP() {
    const amountInput = document.getElementById('buy-mp-amount');
    const previewText = document.getElementById('buy-mp-preview');
    if (!amountInput || !previewText) return;

    const usd = parseFloat(amountInput.value) || 0;
    if (usd > 0) {
      const fee = usd * 0.01;
      const mp = Math.floor((usd - fee) * 100);
      previewText.textContent = `You get ${mp} MP (fee: $${fee.toFixed(2)})`;
    } else {
      previewText.textContent = '1% commission applies';
    }
  }

  previewRedeem() {
    const amountInput = document.getElementById('redeem-amount');
    const previewText = document.getElementById('redeem-preview');
    if (!amountInput || !previewText) return;

    const mp = parseInt(amountInput.value) || 0;
    previewText.textContent = mp >= 1000 ? `You will receive ${this.formatInCurrency(mp / 100)}` : 'Min: 1,000 MP';
  }

  async doDeposit() {
    const amountInput = document.getElementById('deposit-amount');
    if (!amountInput) return;

    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) return showToast('Enter a valid amount.', 'error');
    window.location.href = `/deposit.html?amount=${amount}`;
  }

  async doBuyMP() {
    const amountInput = document.getElementById('buy-mp-amount');
    if (!amountInput) return;

    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) return showToast('Enter a valid amount.', 'error');
    try {
      const res = await API.walletBuyMP(amount);
      showToast(res.message);
      amountInput.value = '';
      const previewText = document.getElementById('buy-mp-preview');
      if (previewText) previewText.textContent = '1% commission applies';
      this.walletData = await API.getWallet();
      this.renderBalances();
      this.renderTransactions();
    } catch (e) {
      showToast(e.error || 'Conversion failed.', 'error');
    }
  }

  async doRedeem() {
    const amountInput = document.getElementById('redeem-amount');
    if (!amountInput) return;

    const amount = parseInt(amountInput.value);
    if (!amount || amount < 1000) return showToast('Minimum redemption is 1,000 MP.', 'error');
    try {
      const res = await API.walletRedeem(amount);
      showToast(res.message);
      amountInput.value = '';
      const previewText = document.getElementById('redeem-preview');
      if (previewText) previewText.textContent = 'Min: 1,000 MP';
      this.walletData = await API.getWallet();
      this.renderBalances();
      this.renderTransactions();
    } catch (e) {
      showToast(e.error || 'Redemption failed.', 'error');
    }
  }

  async doWithdraw() {
    const amountInput = document.getElementById('withdraw-amount');
    if (!amountInput) return;

    const amount = parseFloat(amountInput.value);
    if (!amount || amount < 50) return showToast('Minimum withdrawal is $50.', 'error');
    try {
      const res = await API.walletWithdraw(amount);
      showToast(res.message);
      amountInput.value = '';
      this.walletData = await API.getWallet();
      this.renderBalances();
      this.renderTransactions();
    } catch (e) {
      showToast(e.error || 'Withdrawal failed.', 'error');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WalletPage().init();
});
