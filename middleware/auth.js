module.exports = {
  ensureAuth: (req, res, next) => {
    if (req.session && req.session.user && req.session.user.id) return next();
    res.redirect('/auth/login');
  }
};