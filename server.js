const express = require('express');
const path = require('path');
require('dotenv').config();

// Phase 2: Database pool and connection tester
const { pool, testDbConnection } = require('./src/config/db');

// Phase 3: Session & Flash Middleware
const sessionMiddleware = require('./src/config/session');
const flashMiddleware = require('./src/middleware/flash');

// Phase 3: Authentication Routes (Login, Register, Logout, Dashboards)
const authRoutes = require('./src/routes/auth');

// Phase 4: Library Management Core Routes
const booksRoutes = require('./src/routes/books');
const borrowRoutes = require('./src/routes/borrow');
const circulationRoutes = require('./src/routes/circulation');
const transactionsRoutes = require('./src/routes/transactions');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing URL-encoded form data & JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up EJS template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Ignore favicon requests so browser background checks do not touch session store
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Mount Session and Flash Middleware
app.use(sessionMiddleware);
app.use(flashMiddleware);

// Sidebar badge count and user locals middleware
app.use(async (req, res, next) => {
  res.locals.currentUser = (req.session && req.session.user) ? req.session.user : null;
  res.locals.pendingRequestsCount = 0;
  res.locals.overdueCount = 0;

  if (req.session && req.session.user) {
    try {
      if (req.session.user.role === 'admin') {
        const [pRows] = await pool.query("SELECT COUNT(*) AS cnt FROM borrow_requests WHERE status = 'pending'");
        const [oRows] = await pool.query("SELECT COUNT(*) AS cnt FROM issued_books WHERE status IN ('issued', 'overdue') AND due_date < CURDATE()");
        res.locals.pendingRequestsCount = pRows[0]?.cnt || 0;
        res.locals.overdueCount = oRows[0]?.cnt || 0;
      } else if (req.session.user.role === 'student') {
        const [oRows] = await pool.query("SELECT COUNT(*) AS cnt FROM issued_books WHERE user_id = ? AND status IN ('issued', 'overdue') AND due_date < CURDATE()", [req.session.user.id]);
        res.locals.overdueCount = oRows[0]?.cnt || 0;
      }
    } catch (e) {
      console.error('Sidebar badge count error:', e);
    }
  }
  next();
});

// Preserve and serve existing static assets
// Accessible at /assets/css/style.css, /assets/images/covers/..., etc.
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Legacy PHP compatibility redirects to avoid broken or dead links
app.get('/login.php', (req, res) => res.redirect('/login'));
app.get('/register.php', (req, res) => res.redirect('/register'));
app.get('/logout.php', (req, res) => res.redirect('/logout'));
app.get('/admin/dashboard.php', (req, res) => res.redirect('/admin/dashboard'));
app.get('/admin/manage_books.php', (req, res) => res.redirect('/admin/books'));
app.get('/admin/add_book.php', (req, res) => res.redirect('/admin/books/add'));
app.get('/admin/edit_book.php', (req, res) => res.redirect(req.query.id ? `/admin/books/${req.query.id}/edit` : '/admin/books'));
app.get('/admin/borrow_requests.php', (req, res) => res.redirect('/admin/borrow-requests' + (req.query.status ? `?status=${req.query.status}` : '')));
app.get('/admin/issued_books.php', (req, res) => res.redirect('/admin/circulation/issued' + (req.query.status ? `?status=${req.query.status}` : '')));
app.get('/admin/issue_book.php', (req, res) => res.redirect('/admin/circulation/issue'));
app.get('/admin/return_book.php', (req, res) => res.redirect(req.query.id ? `/admin/circulation/return/${req.query.id}` : '/admin/circulation/issued'));
app.get('/admin/overdue_books.php', (req, res) => res.redirect('/admin/circulation/overdue'));
app.get('/admin/transactions.php', (req, res) => res.redirect('/admin/transactions'));
app.get('/admin/manage_students.php', (req, res) => res.redirect('/admin/students'));
app.get('/student/dashboard.php', (req, res) => res.redirect('/student/dashboard'));
app.get('/student/books.php', (req, res) => res.redirect('/student/books' + (req.query.category ? `?category=${req.query.category}` : '')));
app.get('/student/book_details.php', (req, res) => res.redirect(req.query.id ? `/student/books/${req.query.id}` : '/student/books'));
app.get('/student/my_books.php', (req, res) => res.redirect('/student/my-loans'));
app.get('/student/borrow_history.php', (req, res) => res.redirect('/student/loan-history'));
app.get('/student/profile.php', (req, res) => res.redirect('/student/profile'));

// Mount Authentication Routes
app.use('/', authRoutes);

// Mount Phase 4 Library Routes (Books, Borrow Requests, Circulation, Transactions)
app.use('/', booksRoutes);
app.use('/', borrowRoutes);
app.use('/', circulationRoutes);
app.use('/', transactionsRoutes);

// Phase 1 Baseline Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'The Archive - Library Management System',
    message: 'Node.js & Express server is running successfully',
    environment: process.env.NODE_ENV || 'development',
    time: new Date().toISOString()
  });
});

// Phase 2 Safe Database Health Check Route
app.get('/health/db', async (req, res) => {
  const result = await testDbConnection();

  if (result.success) {
    return res.status(200).json({
      status: 'ok',
      database: {
        connected: true,
        name: result.databaseName,
        tablesCount: result.tablesCount,
        tables: result.tables
      },
      message: 'Database connection verified successfully'
    });
  } else {
    return res.status(503).json({
      status: 'error',
      database: {
        connected: false,
        code: result.errorCode,
        message: result.errorMessage
      }
    });
  }
});

// Step 3.1: Session Verification Endpoint
// Increments page views in session to confirm sessions persist in MySQL
app.get('/test/session', (req, res) => {
  req.session.views = (req.session.views || 0) + 1;

  res.status(200).json({
    status: 'ok',
    message: 'Session is working and connected to MySQL store',
    sessionId: req.sessionID,
    sessionViews: req.session.views,
    cookie: req.session.cookie,
    currentUser: res.locals.currentUser,
    notice: 'Refresh this endpoint to see sessionViews increment. Data is persisted in the sessions table.'
  });
});

// Step 3.1: Flash Message Test - Part 1 (Set message & redirect)
app.get('/test/flash-set', (req, res) => {
  req.setFlash('success', 'Test flash message: Registration successful! (One-time alert)');
  // Await session write to MySQL before sending 302 redirect header
  req.session.save((err) => {
    if (err) console.error('Session save error:', err);
    res.redirect('/test/flash-get');
  });
});

// Step 3.1: Flash Message Test - Part 2 (Display message & auto-clear)
app.get('/test/flash-get', (req, res) => {
  // Prevent browser caching on this dynamic test endpoint
  res.set('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    message: 'Flash message received from session (matches PHP get_flash() behavior)',
    receivedFlash: res.locals.flash,
    notice: 'Refresh this page: the flash message will disappear because it is a one-time alert.'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`[The Archive] Server running at http://localhost:${PORT}`);
  console.log(`[The Archive] Health check: http://localhost:${PORT}/health`);
  console.log(`[The Archive] Database check: http://localhost:${PORT}/health/db`);
  console.log(`[The Archive] Login portal: http://localhost:${PORT}/login`);
  console.log(`[The Archive] Register portal: http://localhost:${PORT}/register`);
});

module.exports = { app, server, pool };
