module.exports = function requireAuthPage(req, res, next) {
  if (req.session?.user?.id) return next();
  return res.redirect("/login");
};
