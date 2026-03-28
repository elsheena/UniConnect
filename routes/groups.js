const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { requireAuth, requireVerified } = require('../middleware/auth');

// GET /api/groups — List all country groups and applicable university groups
router.get('/', requireAuth, (req, res) => {
  let visibleGroups = store.groups.filter(g => {
    if (!g.isUniversityGroup) return true;
    // Only student of that university can see the group
    if (req.user.role === 'student' && g.universityId === req.user.universityId) return true;
    return false;
  });

  const groupsWithCounts = visibleGroups.map(group => {
    const memberCount = store.memberships.filter(m => m.groupId === group.id).length;
    return { ...group, memberCount };
  });
  res.json({ groups: groupsWithCounts });
});

// GET /api/groups/:id — Get group details + members
router.get('/:id', requireAuth, (req, res) => {
  const group = store.groups.find(g => g.id === parseInt(req.params.id));
  if (!group) return res.status(404).json({ error: 'Group not found.' });

  const memberIds = store.memberships
    .filter(m => m.groupId === group.id)
    .map(m => m.userId);

  const members = store.users
    .filter(u => memberIds.includes(u.id))
    .map(u => ({
      id: u.id,
      fullName: u.fullName,
      nationality: u.nationality,
      universityName: u.universityName,
      isRepresentative: u.isRepresentative
    }));

  const isMember = memberIds.includes(req.user.id);

  res.json({ group: { ...group, memberCount: members.length }, members, isMember });
});

// POST /api/groups/:id/join — Join a group (verified students only)
router.post('/:id/join', requireAuth, requireVerified, (req, res) => {
  const group = store.groups.find(g => g.id === parseInt(req.params.id));
  if (!group) return res.status(404).json({ error: 'Group not found.' });

  // Check if already a member
  const existing = store.memberships.find(
    m => m.userId === req.user.id && m.groupId === group.id
  );
  if (existing) {
    return res.status(409).json({ error: 'You are already a member of this group.' });
  }

  // Check if already a pending request
  const existingReq = store.groupRequests.find(
    r => r.userId === req.user.id && r.groupId === group.id && r.status === 'pending'
  );
  if (existingReq) {
    return res.status(409).json({ error: 'You already have a pending request for this group.' });
  }

  // Determine if join is auto-approved
  let isAutoApprove = false;
  if (group.isUniversityGroup) {
    if (req.user.role === 'student' && req.user.universityId === group.universityId) {
      isAutoApprove = true;
    } else {
      return res.status(403).json({ error: 'Only students of this university can join this chat.' });
    }
  } else if (!group.isCountryGroup || group.countryCode === 'ALL') {
    isAutoApprove = true;
  } else {
    const country = store.countries.find(c => c.code === group.countryCode);
    if (country && (req.user.nationality === country.name || req.user.nationality === country.code)) {
      isAutoApprove = true;
    }
  }

  if (isAutoApprove) {
    store.memberships.push({
      userId: req.user.id,
      groupId: group.id,
      joinedAt: new Date().toISOString()
    });
    return res.json({ message: `You joined "${group.name}"!` });
  } else {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'A reason is required to join this group.', requiresReason: true });
    }
    
    store.groupRequests.push({
      id: store.nextGroupRequestId++,
      userId: req.user.id,
      userName: req.user.fullName,
      groupId: group.id,
      groupName: group.name,
      reason: reason.trim(),
      status: 'pending',
      requestedAt: new Date().toISOString()
    });
    return res.json({ message: 'Join request sent! An admin will review it shortly.' });
  }
});

// POST /api/groups/:id/leave — Leave a group
router.post('/:id/leave', requireAuth, (req, res) => {
  const idx = store.memberships.findIndex(
    m => m.userId === req.user.id && m.groupId === parseInt(req.params.id)
  );
  if (idx === -1) {
    return res.status(404).json({ error: 'You are not a member of this group.' });
  }
  store.memberships.splice(idx, 1);
  res.json({ message: 'You left the group.' });
});

// GET /api/groups/:id/messages — Get group chat messages
router.get('/:id/messages', requireAuth, (req, res) => {
  const group = store.groups.find(g => g.id === parseInt(req.params.id));
  if (!group) return res.status(404).json({ error: 'Group not found.' });

  // Check membership
  const isMember = store.memberships.some(
    m => m.userId === req.user.id && m.groupId === group.id
  );
  if (!isMember && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You must be a member to view messages.' });
  }

  const messages = store.messages
    .filter(m => m.groupId === group.id)
    .map(m => {
      const sender = store.users.find(u => u.id === m.senderId);
      return {
        id: m.id,
        text: m.text,
        senderName: sender ? sender.fullName : 'Unknown',
        senderId: m.senderId,
        sentAt: m.sentAt
      };
    });

  res.json({ messages });
});

// POST /api/groups/:id/messages — Send a message
router.post('/:id/messages', requireAuth, (req, res) => {
  const group = store.groups.find(g => g.id === parseInt(req.params.id));
  if (!group) return res.status(404).json({ error: 'Group not found.' });

  const isMember = store.memberships.some(
    m => m.userId === req.user.id && m.groupId === group.id
  );
  if (!isMember) {
    return res.status(403).json({ error: 'You must be a member to send messages.' });
  }

  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Message text is required.' });
  }

  const message = {
    id: store.nextMessageId++,
    groupId: group.id,
    senderId: req.user.id,
    text: text.trim(),
    sentAt: new Date().toISOString()
  };

  store.messages.push(message);

  res.status(201).json({
    message: {
      ...message,
      senderName: req.user.fullName
    }
  });
});

module.exports = router;
