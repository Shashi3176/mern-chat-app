const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;

const adminAuth = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];

  if (!ADMIN_SECRET_KEY) {
    console.warn('[AdminAuth] ADMIN_SECRET_KEY not configured');
    return res.status(500).json({ error: 'Admin authentication not configured' });
  }

  if (!adminKey) {
    return res.status(401).json({ error: 'Admin key required' });
  }

  if (adminKey !== ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'Invalid admin key' });
  }

  next();
};

module.exports = { adminAuth };