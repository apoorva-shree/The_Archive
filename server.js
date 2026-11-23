const express = require('express');
const path = require('path');
require('dotenv').config();

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

// Start server
const server = app.listen(PORT, () => {
  console.log(`[The Archive] Server is running at http://localhost:${PORT}`);
  console.log(`[The Archive] Health check available at http://localhost:${PORT}/health`);
});

module.exports = { app, server };
