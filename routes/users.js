const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const store = require('../data/store');
const { requireAuth } = require('../middleware/auth');

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `doc_${req.user.id}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only JPG, PNG, and PDF files are allowed.'));
  }
});

// GET /api/users/:id
router.get('/:id', requireAuth, (req, res) => {
  const user = store.users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const { password: _, ...safeUser } = user;

  // Add group memberships
  safeUser.groups = store.memberships
    .filter(m => m.userId === user.id)
    .map(m => {
      const group = store.groups.find(g => g.id === m.groupId);
      return group ? { id: group.id, name: group.name, flag: group.flag } : null;
    })
    .filter(Boolean);

  res.json({ user: safeUser });
});

// PUT /api/users/:id
router.put('/:id', requireAuth, (req, res) => {
  if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only edit your own profile.' });
  }

  const user = store.users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const { fullName, email, password, phoneNumber, nationality, spokenLanguages } = req.body;
  
  if (fullName) user.fullName = fullName;
  if (email) {
    // Check if new email already exists
    if (store.users.some(u => u.email === email && u.id !== user.id)) {
      return res.status(400).json({ error: 'Email already exists.' });
    }
    user.email = email;
  }
  if (password) user.password = password;
  if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
  
  if (nationality && nationality !== user.nationality) {
    user.nationality = nationality;
    if (user.role === 'student') {
      user.isVerified = false;
    }
  }

  if (spokenLanguages) user.spokenLanguages = spokenLanguages;

  const { password: _, ...safeUser } = user;
  res.json({ message: 'Profile updated.', user: safeUser, verificationReset: user.role === 'student' && !user.isVerified });
});

// POST /api/users/:id/upload-document
router.post('/:id/upload-document', requireAuth, upload.single('document'), (req, res) => {
  if (req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'You can only upload documents for yourself.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const { type = 'passport_id' } = req.body;

  // Check if there's already a pending document of this type
  const existing = store.documents.find(d => d.userId === req.user.id && d.status === 'pending' && d.type === type);
  if (existing) {
    return res.status(409).json({ error: `You already have a ${type.replace('_', ' ')} pending review.` });
  }

  const doc = {
    id: store.nextDocId++,
    userId: req.user.id,
    userName: req.user.fullName,
    userEmail: req.user.email,
    userRole: req.user.role,
    universityName: req.user.universityName || 'N/A',
    filename: req.file.filename,
    originalName: req.file.originalname,
    uploadedAt: new Date().toISOString(),
    status: 'pending', // pending | approved | rejected
    type, // passport_id | student_card | profile_picture
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: ''
  };

  // If it's a profile picture, update user's pending status
  if (type === 'profile_picture') {
    const user = store.users.find(u => u.id === req.user.id);
    if (user) user.avatarStatus = 'pending';
  }

  store.documents.push(doc);
  res.status(201).json({ message: 'Document uploaded. Awaiting verification.', document: doc });
});

// GET /api/users/:id/verification-status
router.get('/:id/verification-status', (req, res) => {
  const user = store.users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const docs = store.documents.filter(d => d.userId === user.id);
  const latestDoc = docs.length > 0 ? docs[docs.length - 1] : null;

  res.json({
    isVerified: user.isVerified,
    documents: docs,
    latestDocument: latestDoc
  });
});

// GET /api/users/dashboard-stats
router.get('/dashboard-stats', requireAuth, (req, res) => {
  const user = req.user;
  
  if (user.role === 'admin') {
    return res.json({
      totalUsers: store.users.length,
      students: store.users.filter(u => u.role === 'student').length,
      pendingDocs: store.documents.filter(d => d.status === 'pending').length,
      totalBookings: store.bookings.length
    });
  }

  if (user.role === 'representative') {
    return res.json({
      activeBookings: store.bookings.filter(b => b.acceptedBy === user.id && b.status === 'accepted').length,
      openCalls: store.bookings.filter(b => b.status === 'open' && b.universityId === user.universityId && b.serviceTypeId === 'representative_call').length,
      completedServices: store.bookings.filter(b => b.acceptedBy === user.id && b.status === 'completed').length,
      uniCount: store.universities.length
    });
  }

  const stats = {
    activeBookings: store.bookings.filter(b => b.bookerId === user.id && b.status === 'accepted').length,
    completedServices: store.bookings.filter(b => b.bookerId === user.id && b.status === 'completed').length,
    pendingRequests: store.groupRequests ? store.groupRequests.filter(r => r.userId === user.id && r.status === 'pending').length : 0,
    uniCount: store.universities.length
  };
  res.json(stats);
});

module.exports = router;
