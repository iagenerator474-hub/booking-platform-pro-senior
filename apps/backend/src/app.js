const path = require("path");
const fs = require("fs");
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

const { prisma } = require("./infra/prisma");

const { securityHeaders } = require("./middlewares/securityHeaders");
const { requestContext } = require("./middlewares/requestContext");
const { errorHandler } = require("./middlewares/errorHandler");

// Page auth (redirect) for frontend routes
const requireAuthPage = require("./middlewares/requireAuthPage");


// API routes
const authRoutes = require("./modules/auth/auth.routes");
const bookingRoutes = require("./modules/booking/booking.routes");
const paymentsRoutes = require("./modules/payment/payments.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const webhookRoutes = require("./modules/payment/webhook.controller");

const app = express();

/**
 * ------------------------------------------------------------
 * Proxy / trust proxy
 * ------------------------------------------------------------
 * Needed for secure cookies when TLS is terminated at a proxy.
 */
if (TRUST_PROXY) app.set("trust proxy", 1);

/**
 * ------------------------------------------------------------
 * Security headers
 * ------------------------------------------------------------
 */
app.use(securityHeaders());

/**
 * ------------------------------------------------------------
 * Request context (requestId / log correlation)
 * ------------------------------------------------------------
 */
app.use(requestContext);

/**
 * ------------------------------------------------------------
 * Session (prod-safe cookies)
 * ------------------------------------------------------------
 */
const isProd = NODE_ENV === "production";
const cookieSecure = Boolean(COOKIE_SECURE) || isProd;
const cookieSameSite = COOKIE_SAMESITE || "lax";

app.use(
  session({
    name: "sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: TRUST_PROXY,
    cookie: {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      domain: COOKIE_DOMAIN || undefined,
      maxAge: 1000 * 60 * 60 * 8, // 8h
    },
  })
);

/**
 * ------------------------------------------------------------
 * Frontend (static) - OPTIONAL
 * In Docker "backend-only" image, the frontend folder may not exist.
 * ------------------------------------------------------------
 */
const publicDir = path.join(__dirname, "..", "..", "frontend", "public");
const hasFrontend = fs.existsSync(publicDir);

if (hasFrontend) {
  if (NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.log("Serving admin frontend from:", publicDir);
  }

  app.use(express.static(publicDir));

  app.get("/login", (req, res) => {
    res.sendFile(path.join(publicDir, "login.html"));
  });

  app.get("/dashboard", requireAuthPage, (req, res) => {

    res.sendFile(path.join(publicDir, "dashboard.html"));
  });
} else {
  // Docker / backend-only mode: keep endpoint predictable (no ENOENT)
  app.get("/login", (req, res) => {
    res.status(501).json({
      error: "frontend_not_available",
      message: "Frontend is not served in this environment (backend-only image).",
      requestId: req.requestId,
    });
  });
}

/**
 * ------------------------------------------------------------
 * Stripe webhook
 * MUST use RAW body (signature verification)
 * Rate limiting is handled LOCALLY in webhook.controller.js
 * ------------------------------------------------------------
 */
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
 * Health
 * ------------------------------------------------------------
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ✅ DB connectivity probe (useful for container orchestration / incident triage)
app.get("/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: "ok", db: "ok" });
  } catch (err) {
    if (req.log) {
      req.log.error({
        module: "health",
        action: "health.db_failed",
        message: "Database health check failed",
        error: { message: err.message },
      });
    }
    return res.status(503).json({ status: "degraded", db: "down" });
  }
});

/**
 * ------------------------------------------------------------
 * API routes
 * ------------------------------------------------------------
 */
app.use("/auth", authRoutes);
app.use("/", bookingRoutes);
app.use("/", paymentsRoutes);
app.use("/admin", adminRoutes);
app.use("/webhook", webhookRoutes);

/**
 * ------------------------------------------------------------
 * 404 handler
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

