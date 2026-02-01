const rateLimit = require("express-rate-limit");

/**
 * ------------------------------------------------------------
 * Shared JSON handler
 * ------------------------------------------------------------
 * Keep a consistent, API-safe error shape for all rate limits.
 * Intentionally boring and easy to explain to clients.
 */
function jsonRateLimitHandler(req, res /*, next */) {
  return res.status(429).json({
    error: "rate_limited",
    message: "Too many requests. Please try again later.",
    requestId: req.requestId,
  });
}

/**
 * ------------------------------------------------------------
 * Login rate limiter
 * ------------------------------------------------------------
 * Protects POST /auth/login against brute force.
 * 10 attempts / 15 min / IP (reasonable default for prod).
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

/**
 * ------------------------------------------------------------
 * Webhook rate limiter
 * ------------------------------------------------------------
 * Stripe can retry quickly; allow bursts but prevent abuse.
 */
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

module.exports = {
  loginLimiter,
  webhookLimiter,
};
