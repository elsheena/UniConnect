const express = require('express');
const router = express.Router();
const store = require('../data/store');

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { fullName, email, password, role, phoneNumber, nationality, universityId, spokenLanguages } = req.body;

  // Validation
  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ error: 'fullName, email, password, and role are required.' });
  }
  if (!['student', 'applicant'].includes(role)) {
    return res.status(400).json({ error: 'Role must be "student" or "applicant".' });
  }
  if (store.users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'Email already registered.' });
  }
  if (role === 'student' && !universityId) {
    return res.status(400).json({ error: 'Students must provide universityId.' });
  }
  if (!nationality) {
    return res.status(400).json({ error: 'Nationality is required for all users.' });
  }

  const university = universityId ? store.universities.find(u => u.id === parseInt(universityId)) : null;

  const user = {
    id: store.nextUserId++,
    fullName,
    email,
    password, // In production: hash this
    role,
    phoneNumber: phoneNumber || '',
    nationality: nationality || '',
    universityId: university ? university.id : null,
    universityName: university ? university.name : null,
    spokenLanguages: spokenLanguages || [],
    isVerified: false,
    verificationDocuments: [], // Array of { type, path, status, uploadedAt }
    isRepresentative: false,
    hasSubscription: false,
    createdAt: new Date().toISOString()
  };

  store.users.push(user);

  // Automatically log in the user
  req.session.userId = user.id;

  // Don't send password back
  const { password: _, ...safeUser } = user;
  res.status(201).json({ message: 'Registration successful!', user: safeUser });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = store.users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  req.session.userId = user.id;

  const { password: _, ...safeUser } = user;
  res.json({ message: 'Login successful!', user: safeUser });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  const user = store.users.find(u => u.id === req.session.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found.' });
  }

  // Auto-graduate if date passed
  if (user.role === 'student' && user.graduationDate && !user.isGraduated) {
    if (new Date(user.graduationDate) <= new Date()) {
      user.isGraduated = true;
      user.isVerified = true;
    }
  }

  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

module.exports = router;
