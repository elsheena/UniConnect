const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { requireAuth } = require('../middleware/auth');

// GET /api/chats — List user's private chats
router.get('/', requireAuth, (req, res) => {
  const myChats = store.privateChats.filter(c => c.studentId === req.user.id || c.applicantId === req.user.id);
  
  // Enhance with other user info and booking info
  const enhanced = myChats.map(c => {
    const otherId = c.studentId === req.user.id ? c.applicantId : c.studentId;
    const otherUser = store.users.find(u => u.id === otherId);
    const booking = store.bookings.find(b => b.id === c.bookingId);
    return {
      ...c,
      otherUserName: otherUser ? otherUser.fullName : 'Unknown User',
      otherUserAvatar: (otherUser && otherUser.avatarStatus === 'approved') ? otherUser.avatarUrl : null,
      serviceName: booking ? booking.serviceName : 'Deleted Service'
    };
  });
  
  res.json({ chats: enhanced });
});

// GET /api/chats/:id — Get chat details and messages
router.get('/:id', requireAuth, (req, res) => {
  const chat = store.privateChats.find(c => c.id === parseInt(req.params.id));
  if (!chat) return res.status(404).json({ error: 'Chat not found.' });

  // Safety check
  if (chat.studentId !== req.user.id && chat.applicantId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized.' });
  }

  const messages = store.privateMessages.filter(m => m.chatId === chat.id);
  const otherId = chat.studentId === req.user.id ? chat.applicantId : chat.studentId;
  const otherUser = store.users.find(u => u.id === otherId);
  const booking = store.bookings.find(b => b.id === chat.bookingId);

  res.json({ 
    chat, 
    messages, 
    otherUserName: otherUser ? otherUser.fullName : 'Unknown User',
    otherUserAvatar: (otherUser && otherUser.avatarStatus === 'approved') ? otherUser.avatarUrl : null,
    currentUserAvatar: (req.user.avatarStatus === 'approved') ? req.user.avatarUrl : null,
    serviceName: booking ? booking.serviceName : 'Service'
  });
});

// POST /api/chats/:id/messages — Send a private message
router.post('/:id/messages', requireAuth, (req, res) => {
  const chat = store.privateChats.find(c => c.id === parseInt(req.params.id));
  if (!chat) return res.status(404).json({ error: 'Chat not found.' });

  if (chat.studentId !== req.user.id && chat.applicantId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized.' });
  }

  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Message text is required.' });

  const newMessage = {
    id: store.nextPrivateMessageId++,
    chatId: chat.id,
    senderId: req.user.id,
    senderName: req.user.fullName,
    text: text.trim(),
    sentAt: new Date().toISOString()
  };

  store.privateMessages.push(newMessage);
  res.json({ message: 'Sent!', msg: newMessage });
});

module.exports = router;
