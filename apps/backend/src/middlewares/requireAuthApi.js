module.exports = function requireAuthApi(req, res, next) {
  if (req.session?.user?.id) return next();
  return res.status(401).json({ error: "unauthorized" });
};
