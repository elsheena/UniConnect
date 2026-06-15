let selectedRole = '';
let newUserId = null;

async function initRegister() {
  const data = await API.me().catch(() => null);
  if (data && data.user) return window.location.href = '/profile';
  Sidebar.render(null, 'register');
}
initRegister();

function selectRole(role) {
  selectedRole = role;
  document.getElementById('selected-role').value = role;
  document.querySelectorAll('.role-option').forEach(el => el.classList.remove('selected'));
  document.querySelector(`[data-role="${role}"]`).classList.add('selected');
  document.getElementById('student-fields').style.display = role === 'student' ? 'block' : 'none';
  const btn = document.getElementById('register-btn');
  btn.disabled = false;
  btn.textContent = role === 'student' ? 'Register as Student' : 'Register as Applicant';
}

async function loadFormData() {
  try {
    const [uniData, countryData] = await Promise.all([
      API.getUniversities(),
      API.getCountries()
    ]);
    const uniSelect = document.getElementById('university');
    uniData.universities.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = `${u.name} — ${u.city}`;
      uniSelect.appendChild(opt);
    });
    const natSelect = document.getElementById('nationality');
    countryData.countries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name;
      natSelect.appendChild(opt);
    });
  } catch (e) {
    console.error('Failed to load form data:', e);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  if (!selectedRole) return showToast('Please select a role.', 'error');

  const data = {
    fullName: document.getElementById('fullName').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    phoneNumber: document.getElementById('phone').value,
    role: selectedRole
  };

  data.nationality = document.getElementById('nationality').value;
  if (!data.nationality) {
    return showToast('Please select your nationality.', 'error');
  }

  if (selectedRole === 'student') {
    data.universityId = document.getElementById('university').value;
    if (!data.universityId) {
      return showToast('Please select your university.', 'error');
    }
  }

  try {
    const res = await API.register(data);
    newUserId = res.user.id;
    showToast('Account created! Redirecting to verification...');
    // Store role so verify.html knows which docs to request
    sessionStorage.setItem('verifyRole', selectedRole);
    setTimeout(() => window.location.href = '/verify.html', 1200);
  } catch (err) {
    showToast(err.error || 'Registration failed.', 'error');
  }
}

function updateFileName(input, labelId) {
  if (input.files.length > 0) {
    document.getElementById(labelId).innerHTML = `<span data-icon="check"></span> ${input.files[0].name}`;
    // Re-render check icon
    const el = document.getElementById(labelId).querySelector('[data-icon]');
    el.innerHTML = getIcon('check', 18);
  }
}

async function handleUpload(e) {
  e.preventDefault();
  const idFile = document.getElementById('id-file').files[0];
  const studentFile = document.getElementById('student-file').files[0];
  const avatarFile = document.getElementById('avatar-file').files[0];

  if (!idFile) return showToast('Please upload your ID/Passport.', 'error');
  if (selectedRole === 'student' && !studentFile) {
    return showToast('Please upload your Student Card.', 'error');
  }
  if (!avatarFile) return showToast('Please upload a Profile Picture.', 'error');

  const btn = document.getElementById('upload-submit-btn');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Uploading...`;

  try {
    // Upload ID
    await API.uploadDocument(newUserId, idFile, 'passport_id');
    
    // Upload Student Card if applicable
    if (selectedRole === 'student' && studentFile) {
      await API.uploadDocument(newUserId, studentFile, 'student_card');
    }

    // Upload Profile Picture
    await API.uploadDocument(newUserId, avatarFile, 'profile_picture');

    showToast('Documents uploaded successfully! Waiting for admin review.');
    setTimeout(() => window.location.href = '/profile', 1500);
  } catch (err) {
    console.error('Upload error:', err);
    btn.disabled = false;
    btn.textContent = 'Upload & Complete';
    showToast(err.error || err.message || 'Upload failed.', 'error');
  }
}

loadFormData();
