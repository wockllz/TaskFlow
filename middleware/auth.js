function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  
  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  res.redirect('/login');
}

function redirectIfAuth(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
}

function setUser(req, res, next) {
  res.locals.currentUser = req.session && req.session.user ? req.session.user : null;
  res.locals.path = req.path;
  next();
}

module.exports = {
  requireAuth,
  redirectIfAuth,
  setUser
};
