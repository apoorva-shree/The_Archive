const express = require('express');
const path = require('path');
require('dotenv').config();

// Phase 2: Database pool and connection tester
const { pool, testDbConnection } = require('./src/config/db');

// Phase 3 (Step 3.1): Session & Flash Middleware
const sessionMiddleware = require('./src/config/session');
const flashMiddleware = require('./src/middleware/flash');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing URL-encoded form data & JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up EJS template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Mount Session and Flash Middleware
app.use(sessionMiddleware);
app.use(flashMiddleware);

// Preserve and serve existing static assets
// Accessible at /assets/css/style.css, /assets/images/covers/..., etc.
app.use('/assets', express.static(path.join(__dirname, 'assets')));

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
  res.redirect('/test/flash-get');
});

// Step 3.1: Flash Message Test - Part 2 (Display message & auto-clear)
app.get('/test/flash-get', (req, res) => {
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
  console.log(`[The Archive] Session test: http://localhost:${PORT}/test/session`);
});

module.exports = { app, server, pool };
