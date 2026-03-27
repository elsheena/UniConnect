const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { requireAuth, requireVerified } = require('../middleware/auth');

// GET /api/services — List available service types
router.get('/', (req, res) => {
  res.json({ services: store.serviceTypes });
});

// POST /api/services/book — Book a service (Applicant books)
router.post('/book', requireAuth, (req, res) => {
  const { serviceTypeId, universityId, notes } = req.body;

  if (!serviceTypeId) {
    return res.status(400).json({ error: 'serviceTypeId is required.' });
  }

  const serviceType = store.serviceTypes.find(s => s.id === serviceTypeId);
  if (!serviceType) {
    return res.status(404).json({ error: 'Service type not found.' });
  }

  const university = universityId
    ? store.universities.find(u => u.id === parseInt(universityId))
    : null;

  const booking = {
    id: store.nextBookingId++,
    serviceTypeId,
    serviceName: serviceType.name,
    serviceIcon: serviceType.icon,
    price: serviceType.price,
    bookerId: req.user.id,
    bookerName: req.user.fullName,
    bookerEmail: req.user.email,
    universityId: university ? university.id : null,
    universityName: university ? university.name : null,
    notes: notes || '',
    status: 'open', // open | accepted | completed | cancelled
    acceptedBy: null,
    acceptedByName: null,
    acceptedAt: null,
    completedAt: null,
    studentEarning: serviceType.price > 0 ? Math.round(serviceType.price * 0.1) : 0,
    createdAt: new Date().toISOString()
  };

  store.bookings.push(booking);
  res.status(201).json({ message: 'Service booked!', booking });
});

// GET /api/services/my-bookings — Get current user's bookings
router.get('/my-bookings', requireAuth, (req, res) => {
  const bookings = store.bookings.filter(b => b.bookerId === req.user.id);
  res.json({ bookings });
});

// GET /api/services/offers — List open service offers (for students to accept)
router.get('/offers', requireAuth, requireVerified, (req, res) => {
  // Filter based on role
  let offers = [];
  if (req.user.role === 'representative') {
    // Representatives see all open service requests for THEIR university
    offers = store.bookings.filter(b => 
      b.status === 'open' && 
      b.universityId === req.user.universityId
    );
  } else if (req.user.role === 'student') {
    // Students see all other open offers for their university (or general ones)
    offers = store.bookings.filter(b => 
      b.status === 'open' && 
      b.bookerId !== req.user.id &&
      b.serviceTypeId !== 'representative_call'
    );

    // Filter by university
    if (req.user.universityId) {
      offers = offers.filter(b => !b.universityId || b.universityId === req.user.universityId);
    } else {
      offers = offers.filter(b => !b.universityId);
    }
  }

  // Optionally filter by query param if provided
  if (req.query.universityId) {
    offers = offers.filter(b => b.universityId === parseInt(req.query.universityId));
  }

  res.json({ offers });
});

router.post('/:id/accept', requireAuth, (req, res) => {
  const booking = store.bookings.find(b => b.id === parseInt(req.params.id));
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });

  if (booking.status !== 'open') {
    return res.status(400).json({ error: 'This booking is no longer available.' });
  }

  if (booking.bookerId === req.user.id) {
    return res.status(400).json({ error: 'You cannot accept your own booking.' });
  }

  // Role check for representative_call - only rep of THAT uni can accept
  if (booking.serviceTypeId === 'representative_call') {
    if (req.user.role !== 'representative' || booking.universityId !== req.user.universityId) {
      return res.status(403).json({ error: 'Only a representative of this university can accept this request.' });
    }
  } else {
    // For other services: either a rep of that university OR a verified student can accept
    const isRepOfUni = req.user.role === 'representative' && booking.universityId === req.user.universityId;
    const isVerifiedStudent = req.user.role === 'student' && req.user.isVerified;

    if (!isRepOfUni && !isVerifiedStudent) {
      return res.status(403).json({ error: 'Only a representative of this university or a verified student can accept this request.' });
    }
  }

  booking.status = 'accepted';
  booking.acceptedBy = req.user.id;
  booking.acceptedByName = req.user.fullName;
  booking.acceptedAt = new Date().toISOString();

  // Create a private chat between the accepter (student or rep) and the applicant (bookerId)
  const chat = {
    id: store.nextPrivateChatId++,
    bookingId: booking.id,
    studentId: req.user.id, // studentId here acts as "accepterId"
    applicantId: booking.bookerId,
    createdAt: new Date().toISOString()
  };
  store.privateChats.push(chat);

  res.json({ message: 'You accepted the request! A private chat has been created.', booking, chatId: chat.id });
});

// POST /api/services/:id/complete — Mark service as completed
router.post('/:id/complete', requireAuth, (req, res) => {
  const booking = store.bookings.find(b => b.id === parseInt(req.params.id));
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });

  if (booking.status !== 'accepted') {
    return res.status(400).json({ error: 'Can only complete an accepted booking.' });
  }

  // Only the booker or the accepter can complete
  if (booking.bookerId !== req.user.id && booking.acceptedBy !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to complete this booking.' });
  }

  booking.status = 'completed';
  booking.completedAt = new Date().toISOString();

  res.json({
    message: 'Service completed!',
    booking,
    studentEarning: booking.studentEarning
  });
});

// POST /api/services/:id/cancel — Cancel a booking
router.post('/:id/cancel', requireAuth, (req, res) => {
  const booking = store.bookings.find(b => b.id === parseInt(req.params.id));
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });

  if (booking.bookerId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the booker or admin can cancel.' });
  }

  if (booking.status === 'completed') {
    return res.status(400).json({ error: 'Cannot cancel a completed booking.' });
  }

  booking.status = 'cancelled';
  res.json({ message: 'Booking cancelled.', booking });
});

// GET /api/services/accepted — Get services accepted by current student
router.get('/accepted', requireAuth, (req, res) => {
  const accepted = store.bookings.filter(b => b.acceptedBy === req.user.id);
  res.json({ bookings: accepted });
});

module.exports = router;
