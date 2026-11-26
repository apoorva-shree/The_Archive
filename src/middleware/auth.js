/**
 * Authentication Middleware & Access Control Guards
 * The Archive - Library Management System (Node.js & Express Migration)
 * 
 * Replicates includes/auth.php:
 * - requireLogin: Ensures user has an active session.
 * - requireAdmin: Restricts route to admin accounts only.
 * - requireStudent: Restricts route to student accounts only.
 * - redirectIfLoggedIn: Prevents logged-in users from seeing /login or /register.
 */

function wantsJson(req) {
  return Boolean(req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.query.format === 'json');
}

// Restrict access to logged-in users
function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    if (wantsJson(req)) {
      return res.status(401).json({ status: 'error', message: 'Please log in to access this page.' });
    }
    if (res.redirectWithFlash) {
      return res.redirectWithFlash('/login', 'error', 'Please log in to access this page.');
    }
    return res.redirect('/login');
  }
  next();
}

// Restrict access to Administrator accounts only
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    if (wantsJson(req)) {
      return res.status(401).json({ status: 'error', message: 'Please log in to access this page.' });
    }
    if (res.redirectWithFlash) {
      return res.redirectWithFlash('/login', 'error', 'Please log in to access this page.');
    }
    return res.redirect('/login');
  }

  if (req.session.user.role !== 'admin') {
    if (wantsJson(req)) {
      return res.status(403).json({ status: 'error', message: 'Unauthorized access! Administrator privileges required.' });
    }
    if (res.redirectWithFlash) {
      return res.redirectWithFlash('/student/dashboard', 'error', 'Unauthorized access! Administrator privileges required.');
    }
    return res.redirect('/student/dashboard');
  }

  next();
}

// Restrict access to Student accounts only
function requireStudent(req, res, next) {
  if (!req.session || !req.session.user) {
    if (wantsJson(req)) {
      return res.status(401).json({ status: 'error', message: 'Please log in to access this page.' });
    }
    if (res.redirectWithFlash) {
      return res.redirectWithFlash('/login', 'error', 'Please log in to access this page.');
    }
    return res.redirect('/login');
  }

  if (req.session.user.role !== 'student') {
    if (wantsJson(req)) {
      return res.status(403).json({ status: 'error', message: 'Access restricted to student accounts.' });
    }
    if (res.redirectWithFlash) {
      return res.redirectWithFlash('/admin/dashboard', 'error', 'Access restricted to student accounts.');
    }
    return res.redirect('/admin/dashboard');
  }

  next();
}

// Redirect already logged-in users away from /login and /register
function redirectIfLoggedIn(req, res, next) {
  if (req.session && req.session.user) {
    const targetUrl = req.session.user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
    return res.redirect(targetUrl);
  }
  next();
}

module.exports = {
  requireLogin,
  requireAdmin,
  requireStudent,
  redirectIfLoggedIn
};
