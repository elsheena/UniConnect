class RegisterPage extends BasePage {
  constructor() {
    super('register');
    this.selectedRole = '';
    this.newUserId = null;
  }

  requiresAuth() {
    return false;
  }

  async onInit() {
    if (this.user) {
      window.location.href = '/profile.html';
      return;
    }

    // Bind event listeners programmatically
    const studentBtn = document.getElementById('role-student-btn');
    if (studentBtn) {
      studentBtn.addEventListener('click', () => this.selectRole('student'));
    }
    const applicantBtn = document.getElementById('role-applicant-btn');
    if (applicantBtn) {
      applicantBtn.addEventListener('click', () => this.selectRole('applicant'));
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }

    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
      uploadForm.addEventListener('submit', (e) => this.handleUpload(e));
    }

    const idFile = document.getElementById('id-file');
    if (idFile) {
      idFile.addEventListener('change', (e) => this.updateFileName(e.target, 'label-id'));
    }
    const studentFile = document.getElementById('student-file');
    if (studentFile) {
      studentFile.addEventListener('change', (e) => this.updateFileName(e.target, 'label-student'));
    }
    const avatarFile = document.getElementById('avatar-file');
    if (avatarFile) {
      avatarFile.addEventListener('change', (e) => this.updateFileName(e.target, 'label-avatar'));
    }

    await this.loadFormData();
  }

  selectRole(role) {
    this.selectedRole = role;
    document.getElementById('selected-role').value = role;
    document.querySelectorAll('.role-option').forEach(el => el.classList.remove('selected'));
    const roleOpt = document.querySelector(`[data-role="${role}"]`);
    if (roleOpt) roleOpt.classList.add('selected');
    document.getElementById('student-fields').style.display = role === 'student' ? 'block' : 'none';
    
    // Toggle student doc upload field visibility if on upload step
    const studentDocLabel = document.getElementById('label-student');
    if (studentDocLabel) {
      studentDocLabel.style.display = role === 'student' ? 'block' : 'none';
    }

    const btn = document.getElementById('register-btn');
    if (btn) {
      btn.disabled = false;
      btn.textContent = role === 'student' ? 'Register as Student' : 'Register as Applicant';
    }
  }

  async loadFormData() {
    try {
      const [uniData, countryData] = await Promise.all([
        API.getUniversities(),
        API.getCountries()
      ]);
      const uniSelect = document.getElementById('university');
      if (uniSelect) {
        uniSelect.innerHTML = '<option value="">Select your university...</option>';
        uniData.universities.forEach(u => {
          const opt = document.createElement('option');
          opt.value = u.id;
          opt.textContent = `${u.name} — ${u.city}`;
          uniSelect.appendChild(opt);
        });
      }
      const natSelect = document.getElementById('nationality');
      if (natSelect) {
        natSelect.innerHTML = '<option value="">Select your country...</option>';
        countryData.countries.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.name;
          opt.textContent = c.name;
          natSelect.appendChild(opt);
        });
      }
    } catch (e) {
      console.error('Failed to load form data:', e);
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    if (!this.selectedRole) return showToast('Please select a role.', 'error');

    const data = {
      fullName: document.getElementById('fullName').value,
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
      phoneNumber: document.getElementById('phone').value,
      role: this.selectedRole
    };

    data.nationality = document.getElementById('nationality').value;
    if (!data.nationality) {
      return showToast('Please select your nationality.', 'error');
    }

    if (this.selectedRole === 'student') {
      data.universityId = document.getElementById('university').value;
      if (!data.universityId) {
        return showToast('Please select your university.', 'error');
      }
    }

    try {
      const res = await API.register(data);
      this.newUserId = res.user.id;
      showToast('Account created! Redirecting to verification...');
      
      // Store role so verify.html knows which docs to request
      sessionStorage.setItem('verifyRole', this.selectedRole);
      
      setTimeout(() => window.location.href = '/verify.html', 1200);
    } catch (err) {
      showToast(err.error || 'Registration failed.', 'error');
    }
  }

  updateFileName(input, labelId) {
    if (input.files.length > 0) {
      const label = document.getElementById(labelId);
      if (label) {
        label.innerHTML = `<span id="icon-${labelId}"></span> ${input.files[0].name}`;
        const iconEl = document.getElementById(`icon-${labelId}`);
        if (iconEl && window.getIcon) {
          iconEl.innerHTML = getIcon('check', 18);
        }
      }
    }
  }

  async handleUpload(e) {
    e.preventDefault();
    const idFile = document.getElementById('id-file').files[0];
    const studentFile = document.getElementById('student-file').files[0];
    const avatarFile = document.getElementById('avatar-file').files[0];

    if (!idFile) return showToast('Please upload your ID/Passport.', 'error');
    if (this.selectedRole === 'student' && !studentFile) {
      return showToast('Please upload your Student Card.', 'error');
    }
    if (!avatarFile) return showToast('Please upload a Profile Picture.', 'error');

    const btn = document.getElementById('upload-submit-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> Uploading...`;
    }

    try {
      // Upload ID
      await API.uploadDocument(this.newUserId, idFile, 'passport_id');
      
      // Upload Student Card if applicable
      if (this.selectedRole === 'student' && studentFile) {
        await API.uploadDocument(this.newUserId, studentFile, 'student_card');
      }

      // Upload Profile Picture
      await API.uploadDocument(this.newUserId, avatarFile, 'profile_picture');

      showToast('Documents uploaded successfully! Waiting for admin review.');
      setTimeout(() => window.location.href = '/profile', 1500);
    } catch (err) {
      console.error('Upload error:', err);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Upload & Complete';
      }
      showToast(err.error || err.message || 'Upload failed.', 'error');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new RegisterPage().init();
});
