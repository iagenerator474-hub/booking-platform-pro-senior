const {
  NODE_ENV,
  COOKIE_SECURE,
  COOKIE_SAMESITE,
  COOKIE_DOMAIN,
} = require("../../config/env");

const authService = require("./auth.service");

/**
 * ------------------------------------------------------------
 * Login
 * ------------------------------------------------------------
 * - Authenticates user via service
 * - Regenerates session (anti session fixation)
 * - Stores minimal user payload in session
 */
async function login(req, res) {
  try {
    const user = await authService.login(req.body);

    // Anti session fixation
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({ error: "Session error" });
      }

      req.session.user = user;
      return res.json({ user });
    });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

/**
 * ------------------------------------------------------------
 * Me
 * ------------------------------------------------------------
 * - Returns current authenticated user
 * - requireAuth middleware guarantees session existence
 */
function me(req, res) {
  return res.json({
    user: req.session.user,
  });
}

/**
 * ------------------------------------------------------------
 * Logout
 * ------------------------------------------------------------
 * - Destroys server-side session
 * - Clears auth cookies
 * - Idempotent (safe to call multiple times)
 */
function logout(req, res) {
  // No session → already logged out
  if (!req.session) {
    return res.json({ ok: true });
  }

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }

    const cookieOptions = {
      httpOnly: true,
      sameSite: COOKIE_SAMESITE,
      secure: COOKIE_SECURE || NODE_ENV === "production",
      domain: COOKIE_DOMAIN,
    };

    // Main session cookie
    res.clearCookie("sid", cookieOptions);

    // Legacy / fallback (defensive)
    res.clearCookie("connect.sid", cookieOptions);

    return res.json({ ok: true });
  });
}

module.exports = {
  login,
  me,
  logout,
};

