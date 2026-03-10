const User = require('../models/User');

// Simple session simulation (in production, use proper session management)
const sessions = new Map();

const authenticate = async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.body.sessionId;
    
    if (!sessionId || !sessions.has(sessionId)) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userId = sessions.get(sessionId);
    const user = await User.findById(userId);
    
    if (!user || !user.isActive) {
      sessions.delete(sessionId);
      return res.status(401).json({ message: 'Invalid session' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Authentication error' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

const createSession = (userId) => {
  const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  sessions.set(sessionId, userId);
  return sessionId;
};

const destroySession = (sessionId) => {
  sessions.delete(sessionId);
};

module.exports = {
  authenticate,
  authorize,
  createSession,
  destroySession,
};