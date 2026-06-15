class LoginPage extends BasePage {
  constructor() {
    super('login');
  }

  requiresAuth() {
    return false;
  }

  async onInit() {
    if (this.user) {
      window.location.href = '/profile.html';
      return;
    }

    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleLogin(e));
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
      await API.login(email, password);
      showToast('Login successful!');
      setTimeout(() => window.location.href = '/profile.html', 800);
    } catch (err) {
      showToast(err.error || 'Login failed.', 'error');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LoginPage().init();
});
