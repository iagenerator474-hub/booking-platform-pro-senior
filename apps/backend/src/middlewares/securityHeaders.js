const helmet = require("helmet");

/**
 * Helmet hardening:
 * - keep it compatible with our simple static HTML frontend
 * - avoid CSP surprises (portfolio demo + static files)
 */
function securityHeaders() {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });
}

module.exports = { securityHeaders };

