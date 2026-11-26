/**
 * Database Configuration & Connection Pool
 * The Archive - Library Management System (Node.js & Express Migration)
 * 
 * Uses mysql2/promise for async/await query execution and connection pooling.
 * Credentials are read safely from the .env file.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a reusable MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'library_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // dateStrings: true ensures date columns return as exact 'YYYY-MM-DD' strings without UTC timezone shifting
  dateStrings: true,
  // Timezone matching Indian Standard Time (+05:30) for accurate loan calculations
  timezone: '+05:30'
});

/**
 * Safe helper function to test database connectivity
 * Does NOT expose passwords or private credentials.
 */
async function testDbConnection() {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS connection_test');
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    return {
      success: true,
      databaseName: process.env.DB_NAME || 'library_management',
      tablesCount: tableNames.length,
      tables: tableNames
    };
  } catch (error) {
    return {
      success: false,
      errorCode: error.code || 'UNKNOWN_ERROR',
      errorMessage: error.code === 'ER_ACCESS_DENIED_ERROR'
        ? 'Access denied. Please check DB_USER and DB_PASS in your .env file.'
        : error.code === 'ER_BAD_DB_ERROR'
        ? `Database '${process.env.DB_NAME}' not found. Please import database.sql into MySQL.`
        : error.code === 'ECONNREFUSED'
        ? 'Connection refused. Please ensure MySQL server is running.'
        : 'Could not connect to MySQL database server.'
    };
  }
}

module.exports = {
  pool,
  testDbConnection
};
