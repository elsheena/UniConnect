const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ===== MIDDLEWARE =====
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'uniconnect-session-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded documents (for admin viewing)
app.use('/uploads', express.static(uploadsDir));

// ===== API ROUTES =====
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const serviceRoutes = require('./routes/services');
const adminRoutes = require('./routes/admin');
const eventRoutes = require('./routes/events');
const chatRoutes = require('./routes/chats');

// Utility route: get universities list (public)
const store = require('./data/store');
app.get('/api/universities', (req, res) => {
  res.json({ universities: store.universities });
});

app.get('/api/universities/:id', (req, res) => {
  const uni = store.universities.find(u => u.id === parseInt(req.params.id));
  if (!uni) return res.status(404).json({ error: 'University not found.' });
  
  const serviceIds = store.universityServices
    .filter(us => us.universityId === uni.id)
    .map(us => us.serviceTypeId);
    
  const services = store.serviceTypes.filter(s => serviceIds.includes(s.id));
  
  res.json({ university: uni, services });
});

// Utility route: get countries list (public)
app.get('/api/countries', (req, res) => {
  res.json({ countries: store.countries });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/chats', chatRoutes);

// ===== SPA FALLBACK =====
// For any non-API route that doesn't match a static file, serve index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found.' });
  }
  // Check if the requested HTML file exists
  const htmlFile = path.join(__dirname, 'public', req.path);
  if (fs.existsSync(htmlFile)) {
    return res.sendFile(htmlFile);
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== START =====
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║                                          ║');
  console.log('  ║   🎓 UniConnect Server                   ║');
  console.log(`  ║   Running at: http://localhost:${PORT}      ║`);
  console.log('  ║                                          ║');
  console.log('  ╠══════════════════════════════════════════╣');
  console.log('  ║   📚 Registered Accounts                 ║');
  store.users.forEach(u => {
    let roleStr = u.role.padEnd(14, ' ');
    console.log(`  ║   [${roleStr}] ${u.email}  (${u.password})`);
  });
  console.log('  ║                                          ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});
