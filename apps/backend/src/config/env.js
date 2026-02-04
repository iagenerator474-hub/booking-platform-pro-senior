require("dotenv").config();

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function bool(name, fallback = false) {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return String(v).toLowerCase() === "true" || String(v) === "1";
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 4242,
  APP_URL: process.env.APP_URL || `http://localhost:${process.env.PORT || 4242}`,
  APP_VERSION: process.env.APP_VERSION || "unknown",

  // Express behind reverse-proxy (Railway/Render/Fly/NGINX, etc.)
  TRUST_PROXY: bool("TRUST_PROXY", false),

  // Session / cookies
  SESSION_SECRET: must("SESSION_SECRET"),
  COOKIE_SECURE: bool("COOKIE_SECURE", false), // set true in HTTPS production
  COOKIE_SAMESITE: process.env.COOKIE_SAMESITE || "lax", // "lax" | "strict" | "none"
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,

  // Stripe
  STRIPE_SECRET_KEY: must("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: must("STRIPE_WEBHOOK_SECRET"),
};
