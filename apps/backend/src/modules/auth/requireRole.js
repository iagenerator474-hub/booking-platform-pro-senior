module.exports = function requireRole(...roles) {
  const allowed = roles.flat();

  return (req, res, next) => {
    const user = req.session && req.session.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    if (allowed.length === 0) return next();
    if (allowed.includes(user.role)) return next();

    return res.status(403).json({ error: "Forbidden" });
  };
};
