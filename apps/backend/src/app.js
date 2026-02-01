const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");

const {
  NODE_ENV,
  TRUST_PROXY,
  SESSION_SECRET,
  COOKIE_SECURE,
  COOKIE_SAMESITE,
  COOKIE_DOMAIN,
} = require("./config/env");

const { securityHeaders } = require("./middlewares/securityHeaders");
const { webhookLimiter } = require("./middlewares/rateLimit");
const { requestContext } = require("./middlewares/requestContext");
const { errorHandler } = require("./middlewares/errorHandler");

// Page auth (redirect) for frontend routes
const requireAuth = require("./middlewares/requireAuth");

// API routes
const authRoutes = require("./modules/auth/auth.routes");
const bookingRoutes = require("./modules/booking/booking.routes");
const paymentsRoutes = require("./modules/payment/payments.routes");
const adminRoutes = require("./modules/admin/admin.routes"); // ✅ manquant dans ton fichier
const webhookRoutes = require("./modules/payment/webhook.controller");

const app = express();

/**
 * ------------------------------------------------------------
 * Proxy / trust proxy
 * ------------------------------------------------------------
 * Required for secure cookies when TLS is terminated at a proxy.
 */
if (TRUST_PROXY) app.set("trust proxy", 1);

/**
 * ------------------------------------------------------------
 * Security headers (helmet)
 * ------------------------------------------------------------
 */
app.use(securityHeaders());

/**
 * ------------------------------------------------------------
 * Request context (requestId/log correlation) first
 * ------------------------------------------------------------
 */
app.use(requestContext);

/**
 * ------------------------------------------------------------
 * Session
 * ------------------------------------------------------------
 */
app.use(
  session({
    name: "sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    // Required when behind a reverse proxy and using secure cookies
    proxy: TRUST_PROXY,

    cookie: {
      httpOnly: true,
      sameSite: COOKIE_SAMESITE,
      secure: COOKIE_SECURE || NODE_ENV === "production",
      domain: COOKIE_DOMAIN,
      maxAge: 1000 * 60 * 60 * 8, // 8h
    },
  })
);

/**
 * ------------------------------------------------------------
 * Frontend admin (served by Express)
 * IMPORTANT: must be BEFORE the 404 handler
 * ------------------------------------------------------------
 *
 * __dirname = .../apps/backend/src
 * We want:  .../apps/frontend/public
 */
const publicDir = path.join(__dirname, "..", "..", "frontend", "public");

// Log only in non-test to avoid noise
if (NODE_ENV !== "test") {
  // eslint-disable-next-line no-console
  console.log("Serving admin frontend from:", publicDir);
}

// Serve static assets (login.html, dashboard.html, style.css, etc.)
app.use(express.static(publicDir));

// Clean page routes
app.get("/login", (req, res) => {
  res.sendFile(path.join(publicDir, "login.html"));
});

app.get("/dashboard", requireAuth, (req, res) => {
  res.sendFile(path.join(publicDir, "dashboard.html"));
});

/**
 * ------------------------------------------------------------
 * Stripe webhook: MUST use RAW body (signature verification)
 * + rate-limit to protect the endpoint
 * ------------------------------------------------------------
 */
app.use("/webhook", webhookLimiter);
app.use("/webhook", express.raw({ type: "application/json" }));

/**
 * ------------------------------------------------------------
 * Body parsing for the rest of the API (skip /webhook)
 * ------------------------------------------------------------
 */
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/webhook")) return next();
  return bodyParser.json()(req, res, next);
});

app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/webhook")) return next();
  return bodyParser.urlencoded({ extended: false })(req, res, next);
});

/**
 * ------------------------------------------------------------
 * API routes
 * ------------------------------------------------------------
 */
app.use("/auth", authRoutes);
app.use("/", bookingRoutes); // expose /create-checkout-session + /reservations
app.use("/", paymentsRoutes); // expose /payments (admin-protected)
app.use("/admin", adminRoutes); // ✅ /admin/metrics RBAC etc.
app.use("/webhook", webhookRoutes); // POST /webhook

/**
 * ------------------------------------------------------------
 * 404 handler (MUST BE AFTER ALL ROUTES)
 * ------------------------------------------------------------
 */
app.use((req, res) => {
  res.status(404).json({ error: "Not found", requestId: req.requestId });
});

/**
 * ------------------------------------------------------------
 * Error handler (last)
 * ------------------------------------------------------------
 */
app.use(errorHandler);

module.exports = app;
