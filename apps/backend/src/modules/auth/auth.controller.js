const { NODE_ENV, COOKIE_SECURE, COOKIE_SAMESITE, COOKIE_DOMAIN } = require("../../config/env");
const authService = require("./auth.service");

async function login(req, res) {
  try {
    const user = await authService.login(req.body);

    // Session payload
    req.session.user = user;

    res.json({ user });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

function me(req, res) {
  // Return the session user directly (frontend expects {email, role, ...})
  res.json(req.session.user || null);
}

function logout(req, res) {
  // express-session: destroy server-side session then clear cookie
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    // Session cookie name is "sid" (see session config)
    res.clearCookie("sid", {
      httpOnly: true,
      sameSite: COOKIE_SAMESITE,
      secure: COOKIE_SECURE || NODE_ENV === "production",
      domain: COOKIE_DOMAIN,
    });
    // (legacy) also try clearing default cookie name if any
    res.clearCookie("connect.sid", {
      httpOnly: true,
      sameSite: COOKIE_SAMESITE,
      secure: COOKIE_SECURE || NODE_ENV === "production",
      domain: COOKIE_DOMAIN,
    });
    res.json({ ok: true });
  });
}

module.exports = { login, me, logout };
