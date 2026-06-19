let activeTab = 'uni';

async function initPage() {
  const user = await checkAuth();
  if (!user || user.role !== 'admin') {
    showToast('Admin access required.', 'error');
    return window.location.href = '/profile';
  }
  Sidebar.render(user, 'add-data');
  
  // Load initial drop-downs
  await loadUniversitiesDropdowns();
  
  // Make sure group fields match default settings on load
  toggleGroupFields();
}

function switchTab(tab) {
  activeTab = tab;
  
  // Toggle tab buttons
  document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.tab[onclick="switchTab('${tab}')"]`);
  if (activeBtn) activeBtn.classList.add('active');
  
  // Toggle forms
  document.querySelectorAll('.tab-content-pane').forEach(pane => {
    pane.style.display = 'none';
  });
  
  const activePane = document.getElementById(`form-${tab}`);
  if (activePane) activePane.style.display = 'block';
}

async function loadUniversitiesDropdowns() {
  try {
    const unis = await API.getUniversities();
    const progSelect = document.getElementById('prog-uni-id');
    const grpSelect = document.getElementById('grp-uni-id');
    
    if (unis && unis.length > 0) {
      const options = unis.map(u => `<option value="${u.id}">${u.name} (${u.city})</option>`).join('');
      if (progSelect) progSelect.innerHTML = '<option value="">-- Select --</option>' + options;
      if (grpSelect) grpSelect.innerHTML = '<option value="">-- Choose University --</option>' + options;
    } else {
      if (progSelect) progSelect.innerHTML = '<option value="">No universities available</option>';
      if (grpSelect) grpSelect.innerHTML = '<option value="">No universities available</option>';
    }
  } catch (err) {
    showToast('Failed to load universities dropdown list.', 'error');
  }
}

function toggleGroupFields() {
  const isCountrySelect = document.getElementById('grp-is-country');
  const isUniSelect = document.getElementById('grp-is-uni');
  
  if (!isCountrySelect || !isUniSelect) return;

  const isCountry = isCountrySelect.value === 'true';
  const isUni = isUniSelect.value === 'true';
  
  const countryContainer = document.getElementById('grp-country-code-container');
  const uniContainer = document.getElementById('grp-uni-container');
  
  if (countryContainer) countryContainer.style.display = isCountry ? 'block' : 'none';
  if (uniContainer) uniContainer.style.display = isUni ? 'block' : 'none';
}

async function uploadFile(fileInput) {
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    return null;
  }
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/files/upload-university-image', {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to upload image file.');
  }
  return data.url;
}

async function handleAddUniversity(e) {
  e.preventDefault();
  const name = document.getElementById('uni-name').value.trim();
  const city = document.getElementById('uni-city').value.trim();
  const description = document.getElementById('uni-desc').value.trim();
  const logoInput = document.getElementById('uni-logo-file');
  const imageInput = document.getElementById('uni-image-file');
  const btn = document.getElementById('uni-submit-btn');

  const oldText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Uploading files...';

  try {
    let logoUrl = '/img/universities/default.png';
    let imageUrl = '/img/universities/default_building.jpg';

    if (logoInput && logoInput.files.length > 0) {
      logoUrl = await uploadFile(logoInput);
    }
    if (imageInput && imageInput.files.length > 0) {
      imageUrl = await uploadFile(imageInput);
    }

    btn.textContent = 'Saving university...';

    const response = await fetch('/api/admin/universities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, city, logo: logoUrl, image: imageUrl, description })
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to add university.');
    }
    
    showToast('University added successfully!');
    document.getElementById('add-uni-form').reset();
    
    // Refresh universities lists
    await loadUniversitiesDropdowns();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

async function handleAddProgram(e) {
  e.preventDefault();
  const universityId = document.getElementById('prog-uni-id').value;
  const code = document.getElementById('prog-code').value.trim();
  const name = document.getElementById('prog-name').value.trim();
  const costRUB = parseFloat(document.getElementById('prog-cost').value);
  const duration = document.getElementById('prog-duration').value.trim();
  const level = document.getElementById('prog-level').value.trim();
  const language = document.getElementById('prog-lang').value.trim();
  const description = document.getElementById('prog-desc').value.trim();

  try {
    const response = await fetch(`/api/admin/universities/${universityId}/programs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, name, costRUB, duration, level, language, description })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add program');
    
    showToast('Program added successfully!');
    document.getElementById('add-program-form').reset();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleAddGroup(e) {
  e.preventDefault();
  const name = document.getElementById('grp-name').value.trim();
  const flag = document.getElementById('grp-flag').value.trim();
  const description = document.getElementById('grp-desc').value.trim();
  const isCountryGroup = document.getElementById('grp-is-country').value === 'true';
  const countryCode = document.getElementById('grp-country-code').value.trim() || null;
  const isUniversityGroup = document.getElementById('grp-is-uni').value === 'true';
  const universityIdVal = document.getElementById('grp-uni-id').value;
  const universityId = universityIdVal ? parseInt(universityIdVal) : null;

  try {
    const response = await fetch('/api/admin/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, flag, description, isCountryGroup, countryCode, isUniversityGroup, universityId })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add group');
    
    showToast('Chat Group added successfully!');
    document.getElementById('add-group-form').reset();
    toggleGroupFields();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleAddService(e) {
  e.preventDefault();
  const id = document.getElementById('srv-id').value.trim();
  const name = document.getElementById('srv-name').value.trim();
  const icon = document.getElementById('srv-icon').value.trim();
  const price = parseFloat(document.getElementById('srv-price').value);
  const hasCity = document.getElementById('srv-has-city').value === 'true';
  const hasUniversity = document.getElementById('srv-has-uni').value === 'true';
  const firstFree = document.getElementById('srv-first-free').value === 'true';
  const description = document.getElementById('srv-desc').value.trim();

  try {
    const response = await fetch('/api/admin/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, icon, price, hasCity, hasUniversity, firstFree, description })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add service type');
    
    showToast('Service Type added successfully!');
    document.getElementById('add-service-form').reset();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initPage();
});
