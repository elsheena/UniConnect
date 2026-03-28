const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/admin/pending-documents — List documents awaiting verification
router.get('/pending-documents', requireAuth, requireAdmin, (req, res) => {
  const pending = store.documents.filter(d => d.status === 'pending');
  res.json({ documents: pending });
});

// GET /api/admin/all-documents — List all documents
router.get('/all-documents', requireAuth, requireAdmin, (req, res) => {
  res.json({ documents: store.documents });
});

// POST /api/admin/verify/:docId — Approve or reject a document
router.post('/verify/:docId', requireAuth, requireAdmin, (req, res) => {
  const doc = store.documents.find(d => d.id === parseInt(req.params.docId));
  if (!doc) return res.status(404).json({ error: 'Document not found.' });

  const { action, note, graduationDate } = req.body; // action: "approve" | "reject"

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be "approve" or "reject".' });
  }

  doc.status = action === 'approve' ? 'approved' : 'rejected';
  doc.reviewedBy = req.user.id;
  doc.reviewedAt = new Date().toISOString();
  doc.reviewNote = note || '';

  // If approved, check if user should be verified or avatar updated
  if (action === 'approve') {
    const user = store.users.find(u => u.id === doc.userId);
    if (user) {
      if (doc.type === 'profile_picture') {
        user.avatarUrl = `/uploads/${doc.filename}`;
        user.avatarStatus = 'approved';
      } else {
        const userDocs = store.documents.filter(d => d.userId === user.id && d.status === 'approved');
        const hasId = userDocs.some(d => d.type === 'passport_id' || d.type === 'identity_document');
        const hasStudentCard = userDocs.some(d => d.type === 'student_card');
        
        if (user.role === 'applicant' && hasId) {
          user.isVerified = true;
        } else if (user.role === 'student' && hasId && hasStudentCard) {
          user.isVerified = true;
          if (graduationDate) {
            user.graduationDate = graduationDate;
            if (new Date(graduationDate) <= new Date()) {
              user.isGraduated = true;
            }
          }
        }
      }
    }
  } else if (action === 'reject' && doc.type === 'profile_picture') {
    const user = store.users.find(u => u.id === doc.userId);
    if (user) user.avatarStatus = 'rejected';
  }

  res.json({ message: `Document ${doc.status}.`, document: doc });
});

// GET /api/admin/group-requests — List non-native group join requests
router.get('/group-requests', requireAuth, requireAdmin, (req, res) => {
  const pending = store.groupRequests.filter(r => r.status === 'pending');
  res.json({ requests: pending });
});

// POST /api/admin/group-requests/:id — Approve or reject a group join request
router.post('/group-requests/:id', requireAuth, requireAdmin, (req, res) => {
  const request = store.groupRequests.find(r => r.id === parseInt(req.params.id));
  if (!request) return res.status(404).json({ error: 'Request not found.' });

  const { action } = req.body; // action: "approve" | "reject"

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be "approve" or "reject".' });
  }

  request.status = action === 'approve' ? 'approved' : 'rejected';

  // If approved, add to memberships
  if (action === 'approve') {
    store.memberships.push({
      userId: request.userId,
      groupId: request.groupId,
      joinedAt: new Date().toISOString()
    });
  }

  res.json({ message: `Group request ${request.status}.`, request });
});

// GET /api/admin/users — List all users
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  const users = store.users.map(u => {
    const { password: _, ...safeUser } = u;
    return safeUser;
  });
  res.json({ users });
});

// GET /api/admin/stats — Dashboard stats
router.get('/stats', requireAuth, requireAdmin, (req, res) => {
  const totalUsers = store.users.length;
  const students = store.users.filter(u => u.role === 'student').length;
  const applicants = store.users.filter(u => u.role === 'applicant').length;
  const verified = store.users.filter(u => u.isVerified && u.role !== 'admin').length;
  const pendingDocs = store.documents.filter(d => d.status === 'pending').length;
  const totalBookings = store.bookings.length;
  const openBookings = store.bookings.filter(b => b.status === 'open').length;
  const completedBookings = store.bookings.filter(b => b.status === 'completed').length;

  res.json({
    totalUsers, students, applicants, verified,
    pendingDocs, totalBookings, openBookings, completedBookings
  });
});

// GET /api/admin/universities — List universities
router.get('/universities', requireAuth, requireAdmin, (req, res) => {
  res.json({ universities: store.universities });
});

// GET /api/admin/chats — List all unique user-to-user chat conversations
router.get('/chats', requireAuth, requireAdmin, (req, res) => {
  const conversations = [];
  const seen = new Set();

  store.messages.forEach(m => {
    const ids = [m.senderId, m.receiverId].sort((a, b) => a - b);
    const key = ids.join('-');
    if (!seen.has(key)) {
      seen.add(key);
      const userA = store.users.find(u => u.id === ids[0]);
      const userB = store.users.find(u => u.id === ids[1]);
      if (userA && userB) {
        conversations.push({
          id: key,
          user1: { id: userA.id, name: userA.fullName },
          user2: { id: userB.id, name: userB.fullName },
          lastMessage: m.text,
          timestamp: m.timestamp
        });
      }
    }
  });

  res.json({ conversations });
});

// GET /api/admin/chats/:id — Get full history for a conversation ID (e.g. "1-2")
router.get('/chats/:id', requireAuth, requireAdmin, (req, res) => {
  const ids = req.params.id.split('-').map(Number);
  const messages = store.messages.filter(m => 
    (m.senderId === ids[0] && m.receiverId === ids[1]) || 
    (m.senderId === ids[1] && m.receiverId === ids[0])
  ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  res.json({ messages });
});

module.exports = router;
