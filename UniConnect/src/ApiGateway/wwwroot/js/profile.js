// Profile Page Controller for UniConnect

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
      if (shieldIcon && window.getIcon) shieldIcon.innerHTML = getIcon('shield', 20);
    } else {
      banner.style.display = 'none';
    }
  }

  // Profile header
  const statusClass = user.avatarStatus === 'approved' ? 'verified' : user.avatarStatus === 'pending' ? 'pending' : 'unverified';

  try {
    const headerTemplate = await fetchTemplate('/templates/profile/profile-header.html');
    document.getElementById('profile-header').innerHTML = renderTemplate(headerTemplate, {
      statusClass,
      firstName: user.fullName.split(' ')[0]
    });

    // Populate avatar programmatically (no HTML in JS)
    const avatarInner = document.getElementById('profile-avatar-inner');
    if (avatarInner) {
      avatarInner.innerHTML = '';
      if (user.avatarUrl && user.avatarStatus === 'approved') {
        const avatarImg = document.createElement('img');
        avatarImg.src = user.avatarUrl;
        avatarImg.alt = 'Avatar';
        avatarImg.style.width = '100%';
        avatarImg.style.height = '100%';
        avatarImg.style.objectFit = 'cover';
        avatarInner.appendChild(avatarImg);
      } else {
        const avatarSpan = document.createElement('span');
        avatarSpan.textContent = user.fullName.charAt(0);
        avatarInner.appendChild(avatarSpan);
      }
    }

    // Populate role message programmatically
    const roleDescEl = document.getElementById('role-desc-full');
    if (roleDescEl) {
      roleDescEl.innerHTML = '';
      let iconName = '';
      let roleTextStr = '';
      const isGraduated = (user.role === 'student' || user.role === 'moderator') && user.graduationDate && new Date(user.graduationDate) < new Date();

      if (user.role === 'student' || user.role === 'moderator') {
        if (user.verificationStatus === 'pending' && user.pendingUniversityId) {
          iconName = 'logo';
          roleTextStr = user.role === 'moderator' ? 'Verified Moderator (Pending Transfer)' : 'Verified Student (Pending Transfer)';
        } else {
          iconName = isGraduated ? 'award' : (user.role === 'moderator' ? 'shield' : 'logo');
          roleTextStr = isGraduated 
            ? (user.role === 'moderator' ? 'Graduated Moderator' : 'Graduated Student') 
            : `${user.isVerified ? 'Verified' : 'Unverified'} ${user.role === 'moderator' ? 'Moderator' : 'Student'} at ${user.universityName || 'University'}`;
        }
      } else if (user.role === 'representative') {
        iconName = 'building';
        roleTextStr = `Official Representative of ${user.universityName || 'University'}`;
      } else if (user.role === 'applicant') {
        if (user.verificationStatus === 'pending' && user.pendingUniversityId) {
          iconName = 'applicant';
          roleTextStr = 'Applicant (Pending Student Verification)';
        } else {
          iconName = 'applicant';
          roleTextStr = 'Applicant';
        }
      } else {
        iconName = 'shield';
        roleTextStr = 'Administrator';
      }

      const iconSpan = document.createElement('span');
      iconSpan.setAttribute('data-icon', iconName);
      roleDescEl.appendChild(iconSpan);
      roleDescEl.appendChild(document.createTextNode(` ${roleTextStr}`));
    }

    // Populate status badge programmatically
    const badgeContainer = document.querySelector('.status-badge-wrapper');
    if (badgeContainer) {
      badgeContainer.innerHTML = '';
      const badgeSpan = document.createElement('span');
      let badgeClass = 'badge-gray';
      let badgeText = 'Not Verified';
      const isGraduated = (user.role === 'student' || user.role === 'moderator') && user.graduationDate && new Date(user.graduationDate) < new Date();

      if (user.role === 'applicant' && user.verificationStatus === 'pending' && user.pendingUniversityId) {
        badgeClass = 'badge-pending';
        badgeText = 'Pending Student Verification';
      } else if ((user.role === 'student' || user.role === 'moderator') && user.verificationStatus === 'pending' && user.pendingUniversityId) {
        badgeClass = 'badge-pending';
        badgeText = 'Pending Transfer Verification';
      } else if (user.isVerified) {
        badgeClass = 'badge-verified';
        badgeText = 'Verified Account';
      } else if (user.avatarStatus === 'pending' || user.verificationStatus === 'pending') {
        badgeClass = 'badge-pending';
        badgeText = 'Pending Verification';
      }

      badgeSpan.className = `badge ${badgeClass}`;
      badgeSpan.textContent = badgeText;
      badgeContainer.appendChild(badgeSpan);

      if (isGraduated) {
        const gradSpan = document.createElement('span');
        gradSpan.className = 'badge badge-green';
        gradSpan.style.display = 'inline-flex';
        gradSpan.style.alignItems = 'center';
        gradSpan.style.gap = '4px';
        gradSpan.style.marginLeft = '8px';
        
        const iconSpan = document.createElement('span');
        iconSpan.setAttribute('data-icon', 'award');
        gradSpan.appendChild(iconSpan);
        gradSpan.appendChild(document.createTextNode(' Graduated'));
        badgeContainer.appendChild(gradSpan);
      }
    }

    // Bind edit profile button event listener
    const editBtn = document.getElementById('edit-profile-btn');
    if (editBtn) {
      editBtn.addEventListener('click', openEditModal);
    }

  } catch (e) {
    console.error('Error rendering profile header', e);
  }

  // Merged Dashboard Stats
  const verSection = document.getElementById('verification-section');
  const dashData = await API.getDashboardStats().catch(() => ({}));
  
  try {
    const statsTemplate = await fetchTemplate('/templates/profile/profile-stats.html');
    verSection.innerHTML = statsTemplate;

    const cardsContainer = document.getElementById('profile-stat-cards');
    if (cardsContainer) {
      if (user.role === 'representative') {
        const stats = await API.getStats().catch(() => ({}));
        const cards = [
          { icon: 'document', value: stats.pendingDocs || 0, label: 'Pending Documents', href: '/admin' },
          { icon: 'chat', value: dashData.activeBookings || 0, label: 'Active Conversations' },
          { icon: 'clock', value: dashData.openCalls || 0, label: 'Pending Requests', href: '/requests.html' },
          { icon: 'check', value: dashData.completedServices || 0, label: 'Total Handled' }
        ];
        renderStatCards(cardsContainer, cards);
      } else if (user.role === 'student' || user.role === 'moderator') {
        const accepted = await API.getAcceptedServices().catch(() => ({bookings:[]}));
        const totalEarnings = (accepted.bookings || []).filter(b => b.status === 'completed').reduce((sum, b) => sum + b.studentEarning, 0);
        const cards = [
          { icon: 'matryoshka', value: `${totalEarnings} MP`, label: 'Total Earned' },
          { icon: 'list', value: dashData.activeBookings || 0, label: 'Active Services' },
          { icon: 'check', value: dashData.completedServices || 0, label: 'Completed' }
        ];
        renderStatCards(cardsContainer, cards);
      } else if (user.role === 'applicant') {
        const cards = [
          { icon: 'building', value: dashData.appliedUniversities || 0, label: 'Applied Universities', href: '/universities.html' },
          { icon: 'clock', value: dashData.pendingRequests || 0, label: 'Pending Requests' },
          { icon: 'wallet', value: `${dashData.balanceMP || 0} MP`, label: 'My Balance', href: '/wallet.html' }
        ];
        renderStatCards(cardsContainer, cards);
      }
    }
  } catch (e) {
    console.error('Error rendering profile stats', e);
  }

  // Information display
  const isStaffOrApp = user.role === 'admin' || user.role === 'representative' || user.role === 'applicant';

  try {
    const detailsTemplate = await fetchTemplate('/templates/profile/profile-details.html');
    document.getElementById('profile-details').innerHTML = detailsTemplate;

    // Populate email, phone, and memberSince
    const emailEl = document.getElementById('profile-detail-email');
    if (emailEl) emailEl.textContent = user.email;

    const phoneEl = document.getElementById('profile-detail-phone');
    if (phoneEl) phoneEl.textContent = user.phoneNumber || 'Not set';

    const memberSinceEl = document.getElementById('profile-detail-membersince');
    if (memberSinceEl) memberSinceEl.textContent = formatDate(user.createdAt).split(',')[0];

    // Populate nationality
    const nationalityContainer = document.getElementById('profile-detail-nationality-container');
    if (nationalityContainer) {
      nationalityContainer.innerHTML = '';
      if (user.role !== 'admin' && user.role !== 'representative') {
        const labelSpan = document.createElement('span');
        labelSpan.className = 'detail-label';
        labelSpan.textContent = 'Nationality';
        
        const br = document.createElement('br');
        
        const strongVal = document.createElement('strong');
        strongVal.textContent = user.nationality || 'N/A';
        
        nationalityContainer.appendChild(labelSpan);
        nationalityContainer.appendChild(br);
        nationalityContainer.appendChild(strongVal);
      }
    }

    // Populate university
    const universityContainer = document.getElementById('profile-detail-university-container');
    if (universityContainer) {
      universityContainer.innerHTML = '';
      if (user.universityName) {
        const labelSpan = document.createElement('span');
        labelSpan.className = 'detail-label';
        labelSpan.textContent = 'University';
        
        const br = document.createElement('br');
        
        const strongVal = document.createElement('strong');
        strongVal.textContent = user.universityName;
        
        universityContainer.appendChild(labelSpan);
        universityContainer.appendChild(br);
        universityContainer.appendChild(strongVal);
      }
    }

    // Populate graduation date
    const graduationContainer = document.getElementById('profile-detail-graduation-container');
    if (graduationContainer) {
      graduationContainer.innerHTML = '';
      if ((user.role === 'student' || user.role === 'moderator') && user.graduationDate) {
        const labelSpan = document.createElement('span');
        labelSpan.className = 'detail-label';
        labelSpan.textContent = 'Graduation Date';
        
        const br = document.createElement('br');
        
        const strongVal = document.createElement('strong');
        strongVal.textContent = new Date(user.graduationDate).toLocaleDateString();
        
        graduationContainer.appendChild(labelSpan);
        graduationContainer.appendChild(br);
        graduationContainer.appendChild(strongVal);
      }
    }

    // Populate student action
    const studentActionContainer = document.getElementById('student-action-container');
    if (studentActionContainer) {
      studentActionContainer.innerHTML = '';
      if (user.role === 'applicant') {
        if (user.verificationStatus === 'pending' && user.pendingUniversityId) {
          renderPendingStudentRequest(studentActionContainer, 'Student Verification', 'Pending student verification');
        } else if (user.isVerified) {
          renderStudentButton(studentActionContainer, 'Become Student', 'btn-primary', openStudentModal);
        }
      } else if (user.role === 'student' || user.role === 'moderator') {
        if (user.verificationStatus === 'pending' && user.pendingUniversityId) {
          renderPendingStudentRequest(studentActionContainer, 'University Transfer', 'Transfer pending verification');
        } else {
          renderStudentButton(studentActionContainer, 'Change University', 'btn-secondary', openStudentModal);
        }
      }
    }

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
      groupsEl.innerHTML = '';
      if (groups.length === 0) {
        const p = document.createElement('p');
        p.className = 'no-groups-text';
        p.textContent = 'Join some groups to connect with others.';
        groupsEl.appendChild(p);
      } else {
        const groupRowTemplate = await fetchTemplate('/templates/profile/profile-group-row.html');
        for (const g of groups) {
          const rowDiv = document.createElement('div');
          rowDiv.innerHTML = renderTemplate(groupRowTemplate, { name: g.name });
          const rowEl = rowDiv.firstElementChild;
          
          const iconContainer = rowEl.querySelector('#group-icon-container');
          if (iconContainer && window.getIcon) {
            iconContainer.innerHTML = getIcon(g.flag || 'globe', 32);
          }
          groupsEl.appendChild(rowEl);
        }
      }
    } catch { 
      groupsEl.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = 'Unable to load groups.';
      groupsEl.appendChild(p);
    }
  }

  // Activity Feed
  const activityEl = document.getElementById('profile-earnings'); 
  const activityCard = document.getElementById('earnings-card');
  
  if (activityCard) {
    const cardHeaderTitle = activityCard.querySelector('h3');
    if (cardHeaderTitle) {
      cardHeaderTitle.innerHTML = '';
      const iconSpan = document.createElement('span');
      iconSpan.setAttribute('data-icon', 'list');
      cardHeaderTitle.appendChild(iconSpan);
      cardHeaderTitle.appendChild(document.createTextNode(' Recent Activity'));
    }
    activityCard.style.display = 'block';
  }

  try {
    const bookings = await API.getMyBookings();
    activityEl.innerHTML = '';
    if (!bookings.bookings || bookings.bookings.length === 0) {
      const p = document.createElement('p');
      p.className = 'detail-label';
      p.style.padding = '10px 0';
      p.textContent = 'No recent activity found.';
      activityEl.appendChild(p);
    } else {
      const activityRowTemplate = await fetchTemplate('/templates/profile/profile-activity-row.html');
      bookings.bookings.slice(0, 5).forEach(b => {
        const rowDiv = document.createElement('div');
        rowDiv.innerHTML = renderTemplate(activityRowTemplate, {
          serviceName: b.serviceName,
          timeAgoStr: timeAgo(b.createdAt)
        });
        
        const rowEl = rowDiv.firstElementChild;
        
        const iconContainer = rowEl.querySelector('#activity-icon-container');
        if (iconContainer && window.getIcon) {
          iconContainer.innerHTML = getIcon(b.serviceIcon, 20);
        }
        
        const chatContainer = rowEl.querySelector('#activity-chat-container');
        if (chatContainer && b.status === 'accepted') {
          const chatBtn = document.createElement('a');
          chatBtn.href = `/chats.html?chatId=${b.id}`;
          chatBtn.className = 'btn btn-xs btn-secondary';
          chatBtn.textContent = 'Chat';
          chatContainer.appendChild(chatBtn);
        }
        
        const statusContainer = rowEl.querySelector('#activity-status-container');
        if (statusContainer) {
          const colors = {
            open: 'blue', accepted: 'orange', completed: 'green',
            cancelled: 'red', pending: 'orange', approved: 'green', rejected: 'red'
          };
          const badgeColor = colors[b.status] || 'gray';
          const badgeSpan = document.createElement('span');
          badgeSpan.className = `badge badge-${badgeColor}`;
          badgeSpan.textContent = b.status;
          statusContainer.appendChild(badgeSpan);
        }
        
        activityEl.appendChild(rowEl);
      });
    }
  } catch { 
    activityEl.innerHTML = '';
    const p = document.createElement('p');
    p.textContent = 'Unable to load activity.';
    activityEl.appendChild(p);
  }

  // Final icon render
  document.querySelectorAll('.page-content [data-icon]').forEach(el => {
    const iconName = el.getAttribute('data-icon');
    const size = el.getAttribute('data-size') || 18;
    if (window.getIcon) {
      el.innerHTML = getIcon(iconName, size);
    }
  });
}

function renderStatCards(container, cards) {
  container.innerHTML = '';
  cards.forEach(card => {
    const cardEl = document.createElement('div');
    cardEl.className = 'stat-card';
    if (card.href) {
      cardEl.classList.add('clickable');
      cardEl.addEventListener('click', () => {
        window.location.href = card.href;
      });
    }
    
    const iconDiv = document.createElement('div');
    iconDiv.className = 'stat-icon';
    const iconSpan = document.createElement('span');
    iconSpan.setAttribute('data-icon', card.icon);
    iconDiv.appendChild(iconSpan);
    
    const valDiv = document.createElement('div');
    valDiv.className = 'stat-value';
    valDiv.textContent = card.value;
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'stat-label';
    labelDiv.textContent = card.label;
    
    cardEl.appendChild(iconDiv);
    cardEl.appendChild(valDiv);
    cardEl.appendChild(labelDiv);
    container.appendChild(cardEl);
  });
}

function renderPendingStudentRequest(container, titleText, statusText) {
  container.innerHTML = '';
  
  const box = document.createElement('div');
  box.className = 'student-pending-box';
  
  const textDiv = document.createElement('div');
  
  const titleSpan = document.createElement('span');
  titleSpan.className = 'student-pending-title';
  titleSpan.textContent = titleText;
  
  const statusSpan = document.createElement('span');
  statusSpan.className = 'student-pending-status';
  statusSpan.textContent = statusText;
  
  textDiv.appendChild(titleSpan);
  textDiv.appendChild(statusSpan);
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary btn-sm';
  
  const iconSpan = document.createElement('span');
  iconSpan.setAttribute('data-icon', 'x');
  
  cancelBtn.appendChild(iconSpan);
  cancelBtn.appendChild(document.createTextNode(' Cancel Request'));
  cancelBtn.addEventListener('click', cancelStudentRequest);
  
  box.appendChild(textDiv);
  box.appendChild(cancelBtn);
  container.appendChild(box);
}

function renderStudentButton(container, text, btnClass, clickHandler) {
  container.innerHTML = '';
  
  const wrapper = document.createElement('div');
  wrapper.className = 'student-btn-wrapper';
  
  const btn = document.createElement('button');
  btn.className = `btn ${btnClass} btn-sm`;
  
  const iconSpan = document.createElement('span');
  iconSpan.setAttribute('data-icon', 'logo');
  
  btn.appendChild(iconSpan);
  btn.appendChild(document.createTextNode(` ${text}`));
  btn.addEventListener('click', clickHandler);
  
  wrapper.appendChild(btn);
  container.appendChild(wrapper);
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
    if (iconSpan && window.getIcon) iconSpan.innerHTML = getIcon('paperclip', 14);
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
  if (user.role === 'student' || user.role === 'moderator') {
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
  if (iconSpan && window.getIcon) iconSpan.innerHTML = getIcon('paperclip', 14);

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
    if (iconSpan && window.getIcon) iconSpan.innerHTML = getIcon('check', 14);
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

// Bind dynamic event listeners on load
document.addEventListener("DOMContentLoaded", () => {
  // Bind forms
  const editForm = document.getElementById('edit-form');
  if (editForm) editForm.addEventListener('submit', saveProfile);

  const studentForm = document.getElementById('student-form');
  if (studentForm) studentForm.addEventListener('submit', submitStudentRequest);

  // Bind change events
  const editAvatarInput = document.getElementById('edit-avatar-input');
  if (editAvatarInput) {
    editAvatarInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        uploadAvatar(e.target.files[0]);
      }
    });
  }

  const studentCardFile = document.getElementById('student-card-file');
  if (studentCardFile) {
    studentCardFile.addEventListener('change', (e) => {
      updateStudentCardLabel(e.target);
    });
  }

  // Bind cancels
  const editCancelBtn = document.getElementById('edit-cancel-btn');
  if (editCancelBtn) editCancelBtn.addEventListener('click', closeEditModal);

  const studentCancelBtn = document.getElementById('student-cancel-btn');
  if (studentCancelBtn) studentCancelBtn.addEventListener('click', closeStudentModal);
});

loadProfile();
