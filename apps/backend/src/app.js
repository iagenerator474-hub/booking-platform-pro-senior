
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");

const { NODE_ENV, TRUST_PROXY, SESSION_SECRET, COOKIE_SECURE, COOKIE_SAMESITE, COOKIE_DOMAIN } = require("./config/env");

const { securityHeaders } = require("./middlewares/securityHeaders");
const { webhookLimiter } = require("./middlewares/rateLimit");

const { requestContext } = require("./middlewares/requestContext");
const { errorHandler } = require("./middlewares/errorHandler");

const authRoutes = require("./modules/auth/auth.routes");
const bookingRoutes = require("./modules/booking/booking.routes");
const webhookRoutes = require("./modules/payment/webhook.controller");
const paymentsRoutes = require("./modules/payment/payments.routes");

const requireAuth = require("./middlewares/requireAuth");

const app = express();

// If deployed behind a reverse proxy (common in prod), enable this.
// It is required for secure cookies when TLS is terminated at the proxy.
if (TRUST_PROXY) app.set("trust proxy", 1);

// Security headers (helmet)
app.use(securityHeaders());

/**
 * ------------------------------------------------------------
 * Middlewares (context/logging first)
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
console.log("Serving admin frontend from:", publicDir);

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
