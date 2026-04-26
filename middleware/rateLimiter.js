const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, max: 60,
  message: { success: false, error: 'Rate limit reached' },
});

const geminiLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  message: { success: false, error: 'AI rate limit — wait 1 minute' },
});

module.exports = { apiLimiter, geminiLimiter };