/**
 * Rate limiter middleware
 * Per-IP: 60 requests per 60-second sliding window.
 * On exceed: 429 + Retry-After header (seconds until window resets).
 */

const WINDOW_MS = 60 * 1000; // 60 seconds
const MAX_REQUESTS = 60;

// Map<ip, { count: number, windowStart: number }>
const requestMap = new Map();

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  const entry = requestMap.get(ip);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    // New window: reset counter
    requestMap.set(ip, { count: 1, windowStart: now });
    return next();
  }

  if (entry.count < MAX_REQUESTS) {
    entry.count += 1;
    return next();
  }

  // Limit exceeded
  const windowElapsedMs = now - entry.windowStart;
  const retryAfterSeconds = Math.ceil((WINDOW_MS - windowElapsedMs) / 1000);

  res.set('Retry-After', String(retryAfterSeconds));
  return res.status(429).json({ message: 'Too many requests. Please wait.' });
};

module.exports = { rateLimiter };
