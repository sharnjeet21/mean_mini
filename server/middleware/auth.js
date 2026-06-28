const jwt    = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User   = require('../models/User');

const JWT_SECRET  = process.env.JWT_SECRET || 'travel_app_secret';
const JWT_EXPIRES = '7d';

// ── Register ──────────────────────────────────────────────────────────────────
async function registerUser({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) throw new Error('Email already registered');

  const hashed = await bcrypt.hash(password, 10);
  // 'password' matches the User schema field name
  const user = await User.create({ name, email, password: hashed, role: 'user' });
  return signToken(user);
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function loginUser({ email, password }) {
  const user = await User.findOne({ email });
  if (!user || !user.isActive) throw new Error('Invalid email or password');

  // 'user.password' is the hashed value stored in the schema
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Invalid email or password');

  return signToken(user);
}

// ── Token helpers ─────────────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
}

// ── JWT middleware ────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Access token required' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// ── Role guard ────────────────────────────────────────────────────────────────
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  registerUser,
  loginUser,
  authMiddleware,
  requireRole,
  // Aliases used by existing routes
  authenticate: authMiddleware,
  authorize: (...roles) => (req, res, next) => {
    if (!req.user)                    return res.status(401).json({ message: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Insufficient permissions' });
    next();
  },
  // Legacy helpers used by older routes
  generateToken: (userId) => jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES }),
  hashPassword:  (pw) => bcrypt.hash(pw, 10),
  comparePassword: (plain, hashed) => bcrypt.compare(plain, hashed),
};
