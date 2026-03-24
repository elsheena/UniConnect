// ===== AUTH MIDDLEWARE =====

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  const store = require('../data/store');
  const user = store.users.find(u => u.id === req.session.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found. Please log in again.' });
  }
  req.user = user;
  next();
}

function requireVerified(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  if (!req.user.isVerified) {
    return res.status(403).json({ error: 'Your account is not verified yet. Please upload your student document.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access restricted to: ${roles.join(', ')}` });
    }
    next();
  };
}

module.exports = { requireAuth, requireVerified, requireAdmin, requireRole };
