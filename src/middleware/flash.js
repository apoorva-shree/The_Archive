/**
 * Flash Notification & Template Context Middleware
 * The Archive - Library Management System (Node.js & Express Migration)
 * 
 * Replicates PHP's set_flash() and get_flash() helper functions:
 * - req.setFlash(type, message): Stores a temporary alert message in session.
 * - res.locals.flash: Exposes the alert to EJS templates for one request, then clears it.
 * - res.locals.currentUser: Makes logged-in user details accessible to all EJS templates.
 */

function flashMiddleware(req, res, next) {
  // Helper to set a flash message from any route/controller
  req.setFlash = (type, message) => {
    if (!req.session) return;
    if (!req.session.flash) {
      req.session.flash = {};
    }
    req.session.flash[type] = message;
  };

  // Helper to retrieve and clear flash messages for rendering
  if (req.session && req.session.flash) {
    res.locals.flash = { ...req.session.flash };
    delete req.session.flash;
  } else {
    res.locals.flash = {};
  }

  // Make logged-in user available to all views (matches current_user() in PHP)
  res.locals.currentUser = (req.session && req.session.user) ? req.session.user : null;

  next();
}

module.exports = flashMiddleware;
