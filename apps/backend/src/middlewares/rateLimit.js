const rateLimit = require("express-rate-limit");

/**
 * Strict rate limit for auth login (anti brute-force)
 */
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Permissive rate limit for Stripe webhook
 */
const stripeWebhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  stripeWebhookLimiter,
};

