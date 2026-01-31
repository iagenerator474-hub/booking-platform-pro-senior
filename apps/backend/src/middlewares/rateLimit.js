const rateLimit = require("express-rate-limit");

/**
 * Small wrapper to keep a consistent JSON error shape.
 * NOTE: rate limiting is intentionally "boring" and easy to explain to clients.
 */
function jsonRateLimitHandler(req, res /*, next */) {
  return res.status(429).json({
    error: "rate_limited",
    message: "Too many requests. Please try again later.",
    requestId: req.requestId,
  });
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20, // 20 attempts / 15 min / IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 120, // Stripe can retry quickly: allow bursts but prevent abuse
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

module.exports = { loginLimiter, webhookLimiter };

