class VerifyPage extends BasePage {
  constructor() {
    super('verify');
    this.selectedRole = sessionStorage.getItem('verifyRole') || '';
    this.currentUserId = null;
  }

  async onInit() {
    // If already verified, redirect
    if (this.user.isVerified) {
      window.location.href = '/profile.html';
      return;
    }

    this.currentUserId = this.user.id;
    this.selectedRole = this.user.role;
    sessionStorage.removeItem('verifyRole');

    // Render page-level icons
    const bannerIcon = document.getElementById('banner-icon');
    const docIcon = document.getElementById('doc-icon');
    if (bannerIcon) bannerIcon.innerHTML = getIcon('shield', 20);
    if (docIcon) docIcon.innerHTML = getIcon('document', 40);

    const uploadSubtitle = document.getElementById('upload-subtitle');
    if (uploadSubtitle) {
      if (this.selectedRole === 'student') {
        uploadSubtitle.textContent = 'Please upload your Passport, Student Card, and Profile Picture to become a verified student.';
      } else {
        uploadSubtitle.textContent = 'Please upload your ID or Passport and a Profile Picture.';
      }
    }

    // Fetch existing documents
    const statusData = await API.getVerificationStatus(this.user.id).catch(() => ({ documents: [] }));
    const docMap = {};
    (statusData.documents || []).forEach(d => {
      if (!docMap[d.type] || new Date(d.uploadedAt) > new Date(docMap[d.type].uploadedAt)) {
        docMap[d.type] = d;
      }
    });

    const requiredTypes = this.selectedRole === 'student'
      ? ['passport_id', 'student_card', 'profile_picture']
      : ['passport_id', 'profile_picture'];

    let hasUploadFields = false;
    const fieldsContainer = document.getElementById('upload-fields-container');
    if (fieldsContainer) {
      fieldsContainer.innerHTML = '';

      try {
        const fieldTemplate = await fetchTemplate('/templates/verify-field.html');

        requiredTypes.forEach(type => {
          const doc = docMap[type];
          const status = doc ? doc.status : 'missing';
          const displayName = type === 'passport_id' ? 'ID / Passport' :
                              type === 'student_card' ? 'Student Card' : 'Profile Picture';

          if (status === 'approved' || status === 'pending') {
            return;
          } else {
            hasUploadFields = true;
            const acceptTypes = type === 'profile_picture' ? 'image/*' : '.jpg,.jpeg,.png,.pdf';
            const rejectionNoticeHtml = status === 'rejected' ? `
              <div class="rejection-notice">
                <strong>Rejected:</strong> ${doc.reviewNote || 'Please upload a clearer document.'}
              </div>` : '';
            const iconHtml = getIcon('paperclip', 18);

            fieldsContainer.innerHTML += renderTemplate(fieldTemplate, {
              displayName,
              rejectionNoticeHtml,
              type,
              iconHtml,
              acceptTypes
            });
          }
        });
      } catch (e) {
        console.error('Failed to render verification fields', e);
      }
    }

    const submitBtn = document.getElementById('upload-submit-btn');
    if (submitBtn) {
      if (hasUploadFields) {
        submitBtn.classList.remove('hidden-initially');
        submitBtn.style.display = 'block';
      } else {
        if (uploadSubtitle) {
          uploadSubtitle.textContent = 'All your documents have been submitted and are currently under review.';
        }
        submitBtn.classList.add('hidden-initially');
        submitBtn.style.display = 'none';
      }
    }

    this.setupEventListeners();
  }

  setupEventListeners() {
    const form = document.getElementById('upload-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleUpload(e));
    }

    const fieldsContainer = document.getElementById('upload-fields-container');
    if (fieldsContainer) {
      // Use event delegation for input file change
      fieldsContainer.addEventListener('change', (e) => {
        if (e.target && e.target.type === 'file') {
          const type = e.target.getAttribute('data-type');
          this.updateFileName(e.target, `label-${type}`, `icon-${type}`);
        }
      });
    }
  }

  updateFileName(input, labelId, iconId) {
    if (input.files.length > 0) {
      const label = document.getElementById(labelId);
      if (label) {
        label.innerHTML = `<span id="${iconId}"></span> ${input.files[0].name}`;
        const icon = document.getElementById(iconId);
        if (icon) icon.innerHTML = getIcon('check', 18);
      }
    }
  }

  async handleUpload(e) {
    e.preventDefault();

    const fileInputs = Array.from(document.querySelectorAll('#upload-fields-container input[type="file"]'));
    const missingFiles = [];
    const uploadsToMake = [];

    for (const input of fileInputs) {
      const type = input.getAttribute('data-type');
      const file = input.files[0];
      const displayName = type === 'passport_id' ? 'ID / Passport' :
                          type === 'student_card' ? 'Student Card' : 'Profile Picture';
      if (!file) {
        missingFiles.push(displayName);
      } else {
        uploadsToMake.push({ file, type });
      }
    }

    if (missingFiles.length > 0) {
      return showToast(`Please select files for: ${missingFiles.join(', ')}`, 'error');
    }

    if (uploadsToMake.length === 0) {
      return showToast('No new files to upload.', 'info');
    }

    const btn = document.getElementById('upload-submit-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> Uploading...`;
    }

    try {
      for (const upload of uploadsToMake) {
        await API.uploadDocument(this.currentUserId, upload.file, upload.type);
      }

      // Mark as pending in DB
      await API.updateVerificationStatus(this.currentUserId, 'pending');

      // Clear stored role
      sessionStorage.removeItem('verifyRole');

      showToast('Documents uploaded! Awaiting admin review.', 'success');
      setTimeout(() => window.location.href = '/profile.html', 1500);
    } catch (err) {
      console.error('Upload error:', err);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Upload &amp; Complete';
      }
      showToast(err.error || err.message || 'Upload failed. Please try again.', 'error');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new VerifyPage().init();
});
