/**
 * Session Configuration & MySQL Session Store
 * The Archive - Library Management System (Node.js & Express Migration)
 * 
 * Uses express-session with express-mysql-session.
 * Stores session data in the existing MySQL database (sessions table)
 * so sessions persist even if the Node server restarts.
 */

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { pool } = require('./db');
require('dotenv').config();

// Configure MySQL Session Store using existing connection pool
const sessionStore = new MySQLStore({
  clearExpired: true,
  checkExpirationInterval: 900000, // Clean expired sessions every 15 minutes
  expiration: 86400000,            // Session validity: 24 hours (in milliseconds)
  createDatabaseTable: true,       // Automatically create 'sessions' table if not present
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
}, pool);

// Configure Express Session Middleware
const sessionMiddleware = session({
  key: 'the_archive_sid',
  secret: process.env.SESSION_SECRET || 'the_archive_secret_key_iiit_kota',
  store: sessionStore,
  resave: false,             // Do not save session back to store if unmodified
  saveUninitialized: false,  // Do not create session until something is stored
  cookie: {
    httpOnly: true,                                // Prevents client-side JavaScript access (XSS protection)
    secure: process.env.NODE_ENV === 'production', // true for HTTPS in production, false for localhost
    sameSite: 'lax',                               // CSRF protection for cookie transmission
    maxAge: 24 * 60 * 60 * 1000                    // 24 hours
  }
});

module.exports = sessionMiddleware;
