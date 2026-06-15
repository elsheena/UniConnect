async function loadProfile() {
  const user = await checkAuth();
  if (!user) return window.location.href = '/login';
  Sidebar.render(user, 'profile');

  // Show unverified banner when user is not verified yet (and not pending review)
  const banner = document.getElementById('unverified-banner');
  if (banner) {
    if (!user.isVerified && user.verificationStatus !== 'pending' && user.avatarStatus !== 'pending') {
      banner.style.display = 'flex';
      const shieldIcon = document.getElementById('profile-shield-icon');
      if (shieldIcon) shieldIcon.innerHTML = getIcon('shield', 20);
    } else {
      banner.style.display = 'none';
    }
  }

  // Profile header
  const avatarHtml = user.avatarUrl && user.avatarStatus === 'approved'
    ? `<img src="${user.avatarUrl}" alt="Avatar" style="width:100%; height:100%; object-fit:cover;">`
    : `<span>${user.fullName.charAt(0)}</span>`;
  
  const statusClass = user.avatarStatus === 'approved' ? 'verified' : user.avatarStatus === 'pending' ? 'pending' : 'unverified';

  let roleMsg = '';
  if (user.role === 'student') {
    if (user.verificationStatus === 'pending' && user.pendingUniversityId) {
      roleMsg = `<span data-icon="logo"></span> Verified Student (Pending Transfer)`;
    } else {
      roleMsg = user.isGraduated ? '<span data-icon="shield"></span> Graduated Student' : `<span data-icon="logo"></span> ${user.isVerified ? 'Verified' : 'Unverified'} Student at ${user.universityName || 'University'}`;
    }
  } else if (user.role === 'representative') {
    roleMsg = `<span data-icon="building"></span> Official Representative of ${user.universityName || 'University'}`;
  } else if (user.role === 'applicant') {
    if (user.verificationStatus === 'pending' && user.pendingUniversityId) {
      roleMsg = '<span data-icon="applicant"></span> Applicant (Pending Student Verification)';
    } else {
      roleMsg = '<span data-icon="applicant"></span> Applicant';
    }
  } else {
    roleMsg = '<span data-icon="shield"></span> Administrator';
  }

  const statusBadgeStr = (user.role === 'applicant' && user.verificationStatus === 'pending' && user.pendingUniversityId)
    ? '<span class="badge badge-pending">Pending Student Verification</span>'
    : (user.role === 'student' && user.verificationStatus === 'pending' && user.pendingUniversityId)
      ? '<span class="badge badge-pending">Pending Transfer Verification</span>'
      : user.isVerified
        ? '<span class="badge badge-verified">Verified Account</span>'
        : user.avatarStatus === 'pending' || user.verificationStatus === 'pending'
          ? '<span class="badge badge-pending">Pending Verification</span>'
          : '<span class="badge badge-gray">Not Verified</span>';

  try {
    const headerTemplate = await fetchTemplate('/templates/profile/profile-header.html');
    document.getElementById('profile-header').innerHTML = renderTemplate(headerTemplate, {
      statusClass,
      avatarHtml,
      firstName: user.fullName.split(' ')[0],
      roleMsg,
      statusBadge: statusBadgeStr
    });
  } catch (e) {
    console.error('Error rendering profile header', e);
  }

  // Merged Dashboard Stats
  const verSection = document.getElementById('verification-section');
  const dashData = await API.getDashboardStats().catch(() => ({}));
  
  let cardsHtml = '';
  if (user.role === 'representative') {
    const stats = await API.getStats().catch(() => ({}));
    cardsHtml = `
      <div class="stat-cards">
        <div class="stat-card clickable" onclick="window.location.href='/admin'"><div class="stat-icon"><span data-icon="document"></span></div><div class="stat-value">${stats.pendingDocs || 0}</div><div class="stat-label">Pending Documents</div></div>
        <div class="stat-card"><div class="stat-icon"><span data-icon="chat"></span></div><div class="stat-value">${dashData.activeBookings || 0}</div><div class="stat-label">Active Conversations</div></div>
        <div class="stat-card clickable" onclick="window.location.href='/requests.html'"><div class="stat-icon"><span data-icon="clock"></span></div><div class="stat-value">${dashData.openCalls || 0}</div><div class="stat-label">Pending Requests</div></div>
        <div class="stat-card"><div class="stat-icon"><span data-icon="check"></span></div><div class="stat-value">${dashData.completedServices || 0}</div><div class="stat-label">Total Handled</div></div>
      </div>
    `;
  } else if (user.role === 'student') {
    const accepted = await API.getAcceptedServices().catch(() => ({bookings:[]}));
    const totalEarnings = (accepted.bookings || []).filter(b => b.status === 'completed').reduce((sum, b) => sum + b.studentEarning, 0);
    cardsHtml = `
      <div class="stat-cards">
        <div class="stat-card"><div class="stat-icon"><span data-icon="matryoshka"></span></div><div class="stat-value">${totalEarnings} MP</div><div class="stat-label">Total Earned</div></div>
        <div class="stat-card"><div class="stat-icon"><span data-icon="list"></span></div><div class="stat-value">${dashData.activeBookings || 0}</div><div class="stat-label">Active Services</div></div>
        <div class="stat-card"><div class="stat-icon"><span data-icon="check"></span></div><div class="stat-value">${dashData.completedServices || 0}</div><div class="stat-label">Completed</div></div>
      </div>
    `;
  } else if (user.role === 'applicant') {
    cardsHtml = `
      <div class="stat-cards">
        <div class="stat-card clickable" onclick="window.location.href='/universities'"><div class="stat-icon"><span data-icon="building"></span></div><div class="stat-value">${dashData.appliedUniversities || 0}</div><div class="stat-label">Applied Universities</div></div>
        <div class="stat-card"><div class="stat-icon"><span data-icon="clock"></span></div><div class="stat-value">${dashData.pendingRequests || 0}</div><div class="stat-label">Pending Requests</div></div>
        <div class="stat-card clickable" onclick="window.location.href='/wallet'"><div class="stat-icon"><span data-icon="wallet"></span></div><div class="stat-value">${dashData.balanceMP || 0} MP</div><div class="stat-label">My Balance</div></div>
      </div>
    `;
  }

  try {
    const statsTemplate = await fetchTemplate('/templates/profile/profile-stats.html');
    verSection.innerHTML = renderTemplate(statsTemplate, { cardsHtml });
  } catch (e) {
    console.error('Error rendering profile stats', e);
  }

  // Information display
  const isStaffOrApp = user.role === 'admin' || user.role === 'representative' || user.role === 'applicant';
  const nationalityHtml = user.role !== 'admin' && user.role !== 'representative' ? `<div><span style="font-size:0.82rem;color:var(--text-muted);">Nationality</span><br><strong>${user.nationality || 'N/A'}</strong></div>` : '';
  const universityHtml = user.universityName ? `<div><span style="font-size:0.82rem;color:var(--text-muted);">University</span><br><strong>${user.universityName}</strong></div>` : '';

  let studentActionHtml = '';
  if (user.role === 'applicant') {
    if (user.verificationStatus === 'pending' && user.pendingUniversityId) {
      studentActionHtml = `
      <div style="margin-top:20px; padding:15px; border-radius:12px; background:var(--bg-input); border:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block;">Student Verification</span>
          <span style="font-size:0.9rem; font-weight:700; color:var(--accent-purple);">Pending student verification</span>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="cancelStudentRequest()"><span data-icon="x"></span> Cancel Request</button>
      </div>
      `;
    } else if (user.isVerified) {
      studentActionHtml = `
      <div style="margin-top:20px; text-align:right;">
        <button class="btn btn-primary btn-sm" onclick="openStudentModal()"><span data-icon="logo"></span> Become Student</button>
      </div>
      `;
    }
  } else if (user.role === 'student') {
    if (user.verificationStatus === 'pending' && user.pendingUniversityId) {
      studentActionHtml = `
      <div style="margin-top:20px; padding:15px; border-radius:12px; background:var(--bg-input); border:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block;">University Transfer</span>
          <span style="font-size:0.9rem; font-weight:700; color:var(--accent-purple);">Transfer pending verification</span>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="cancelStudentRequest()"><span data-icon="x"></span> Cancel Request</button>
      </div>
      `;
    } else {
      studentActionHtml = `
      <div style="margin-top:20px; text-align:right;">
        <button class="btn btn-secondary btn-sm" onclick="openStudentModal()"><span data-icon="logo"></span> Change University</button>
      </div>
      `;
    }
  }

  try {
    const detailsTemplate = await fetchTemplate('/templates/profile/profile-details.html');
    document.getElementById('profile-details').innerHTML = renderTemplate(detailsTemplate, {
      email: user.email,
      phone: user.phoneNumber || 'Not set',
      nationalityHtml,
      universityHtml,
      memberSince: formatDate(user.createdAt).split(',')[0],
      studentActionHtml
    });
  } catch (e) {
    console.error('Error rendering profile details', e);
  }

  // Groups
  const groupsCard = document.getElementById('groups-card');
  const groupsEl = document.getElementById('profile-groups');
  if (isStaffOrApp) {
    groupsCard.style.display = 'none';
  } else {
    groupsCard.style.display = 'block';
    try {
      const userData = await API.getUser(user.id);
      const groups = userData.user.groups || [];
      if (groups.length === 0) {
        groupsEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem;padding:10px 0;">Join some groups to connect with others.</p>';
      } else {
        const groupRowTemplate = await fetchTemplate('/templates/profile/profile-group-row.html');
        groupsEl.innerHTML = groups.map(g => {
          return renderTemplate(groupRowTemplate, {
            iconHtml: getIcon(g.flag || 'globe', 32),
            name: g.name
          });
        }).join('');
      }
    } catch { groupsEl.innerHTML = '<p>Unable to load groups.</p>'; }
  }

  // Activity Feed (Merged from Dashboard)
  const activityEl = document.getElementById('profile-earnings'); 
  document.getElementById('earnings-card').querySelector('h3').innerHTML = '<span data-icon="list"></span> Recent Activity';
  document.getElementById('earnings-card').style.display = 'block';

  try {
    const bookings = await API.getMyBookings();
    if (!bookings.bookings || bookings.bookings.length === 0) {
      activityEl.innerHTML = '<p style="color:var(--text-muted);padding:10px 0;">No recent activity found.</p>';
    } else {
      const activityRowTemplate = await fetchTemplate('/templates/profile/profile-activity-row.html');
      activityEl.innerHTML = bookings.bookings.slice(0, 5).map(b => {
        const iconHtml = getIcon(b.serviceIcon, 20);
        const timeAgoStr = timeAgo(b.createdAt);
        const chatButtonHtml = b.status === 'accepted' ? `<a href="/chats.html?chatId=${b.id}" class="btn btn-xs btn-secondary">Chat</a>` : '';
        const statusBadgeHtml = statusBadge(b.status);

        return renderTemplate(activityRowTemplate, {
          iconHtml,
          serviceName: b.serviceName,
          timeAgoStr,
          chatButtonHtml,
          statusBadgeHtml
        });
      }).join('');
    }
  } catch { activityEl.innerHTML = '<p>Unable to load activity.</p>'; }

  // Final icon render
  document.querySelectorAll('.page-content [data-icon]').forEach(el => {
    const iconName = el.getAttribute('data-icon');
    const size = el.getAttribute('data-size') || 18;
    el.innerHTML = getIcon(iconName, size);
  });
}

async function uploadAvatar(file) {
  if (!file) return;
  showToast('Uploading profile picture...', 'info');
  try {
    await API.uploadDocument(currentUser.id, file, 'profile_picture');
    showToast('Photo uploaded! Waiting for admin verification.');
    closeEditModal();
    loadProfile();
  } catch (e) {
    showToast(e.error || 'Upload failed.', 'error');
  }
}

async function openEditModal() {
  const user = currentUser;
  document.getElementById('edit-email').value = user.email;
  document.getElementById('edit-phone').value = user.phoneNumber || '';
  
  const natGroup = document.getElementById('edit-nationality').closest('.form-group');
  const isStaffOrApp = user.role === 'admin' || user.role === 'representative' || user.role === 'applicant';
  if (isStaffOrApp && user.role !== 'applicant') {
    natGroup.style.display = 'none';
  } else {
    natGroup.style.display = 'block';
    const natSelect = document.getElementById('edit-nationality');
    if (natSelect.options.length <= 1) {
      try {
        const res = await API.getCountries();
        res.countries.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.name;
          opt.textContent = `${c.name}`;
          if (c.name === user.nationality) opt.selected = true;
          natSelect.appendChild(opt);
        });
      } catch (e) {}
    } else {
      natSelect.value = user.nationality || '';
    }
  }

  document.getElementById('edit-name').value = user.fullName;

  // Re-render paperclip icon
  const upArea = document.getElementById('modal-upload-area');
  if (upArea) {
    const iconSpan = upArea.querySelector('[data-icon]');
    if (iconSpan) iconSpan.innerHTML = getIcon('paperclip', 14);
  }
  
  document.getElementById('edit-modal').classList.add('active');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('active');
  document.getElementById('edit-password').value = '';
}

async function saveProfile(e) {
  e.preventDefault();
  try {
    const payload = {
      email: document.getElementById('edit-email').value,
      phoneNumber: document.getElementById('edit-phone').value
    };
    const isStaffOrApp = currentUser.role === 'admin' || currentUser.role === 'representative' || currentUser.role === 'applicant';
    if (!isStaffOrApp || currentUser.role === 'applicant') {
      payload.nationality = document.getElementById('edit-nationality').value;
    }

    const pwd = document.getElementById('edit-password').value;
    if (pwd) payload.password = pwd;

    await API.updateUser(currentUser.id, payload);
    showToast('Profile updated!');
    closeEditModal();
    loadProfile();
  } catch (err) {
    showToast(err.error || 'Failed to update profile.', 'error');
  }
}

async function openStudentModal() {
  const user = currentUser;
  const titleEl = document.getElementById('student-modal-title');
  const subEl = document.getElementById('student-modal-subtitle');
  if (user.role === 'student') {
    titleEl.textContent = 'Change University';
    subEl.textContent = 'Please select the new university you want to transfer to and upload your new student card.';
  } else {
    titleEl.textContent = 'Become a Verified Student';
    subEl.textContent = 'Please select the university you are enrolled in and upload your student card.';
  }

  // Populate university list
  const uniSelect = document.getElementById('student-university');
  uniSelect.innerHTML = '<option value="">Choose university...</option>';
  try {
    const res = await API.getUniversities();
    res.universities.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.name;
      if (u.id === user.universityId) opt.selected = true;
      uniSelect.appendChild(opt);
    });
  } catch (e) {
    showToast('Failed to load universities.', 'error');
  }

  document.getElementById('student-card-file').value = '';
  document.getElementById('student-card-label-text').textContent = 'Choose File';
  const label = document.getElementById('student-card-file').closest('label');
  const iconSpan = label.querySelector('[data-icon]');
  if (iconSpan) iconSpan.innerHTML = getIcon('paperclip', 14);

  document.getElementById('student-modal').classList.add('active');
}

function closeStudentModal() {
  document.getElementById('student-modal').classList.remove('active');
}

function updateStudentCardLabel(input) {
  if (input.files.length > 0) {
    document.getElementById('student-card-label-text').textContent = input.files[0].name;
    const label = input.closest('label');
    const iconSpan = label.querySelector('[data-icon]');
    if (iconSpan) iconSpan.innerHTML = getIcon('check', 14);
  }
}

async function submitStudentRequest(e) {
  e.preventDefault();
  const uniId = parseInt(document.getElementById('student-university').value);
  const fileInput = document.getElementById('student-card-file');
  const file = fileInput.files[0];

  if (!uniId) {
    showToast('Please select a university.', 'error');
    return;
  }
  if (!file) {
    showToast('Please select a file to upload.', 'error');
    return;
  }

  const btn = document.getElementById('student-submit-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Uploading...`;
  }

  try {
    await API.uploadDocument(currentUser.id, file, 'student_card');
    await API.updateVerificationStatus(currentUser.id, 'pending', uniId);
    showToast('Verification request submitted successfully!', 'success');
    closeStudentModal();
    loadProfile();
  } catch (err) {
    showToast(err.error || 'Failed to submit verification request.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Submit Verification';
    }
  }
}

async function cancelStudentRequest() {
  if (!confirm('Are you sure you want to cancel your verification request?')) return;
  try {
    await API.updateVerificationStatus(currentUser.id, 'cancel');
    showToast('Verification request cancelled.');
    loadProfile();
  } catch (err) {
    showToast(err.error || 'Failed to cancel request.', 'error');
  }
}

loadProfile();

