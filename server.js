const express = require('express');
const path = require('path');
require('dotenv').config();

// Phase 2: Import reusable database pool and connection tester
const { pool, testDbConnection } = require('./src/config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing URL-encoded form data & JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up EJS template engine (ready for views migration)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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
    // 503 Service Unavailable if database is unreachable
    // Sensitive credentials are NOT leaked in the response
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

// Start server
const server = app.listen(PORT, () => {
  console.log(`[The Archive] Server running at http://localhost:${PORT}`);
  console.log(`[The Archive] Health check: http://localhost:${PORT}/health`);
  console.log(`[The Archive] Database check: http://localhost:${PORT}/health/db`);
});

module.exports = { app, server, pool };
