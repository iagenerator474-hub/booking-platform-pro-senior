const {
  NODE_ENV,
  COOKIE_SECURE,
  COOKIE_SAMESITE,
  COOKIE_DOMAIN,
} = require("../../config/env");
const authService = require("./auth.service");

async function login(req, res) {
  try {
    const user = await authService.login(req.body);

    // Anti session fixation: regenerate session id on login
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: "Session error" });

      req.session.user = user;
      return res.json({ user });
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

function me(req, res) {
  res.json(req.session.user || null);
}

function logout(req, res) {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });

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

    return res.json({ ok: true });
  });
}

module.exports = { login, me, logout };
