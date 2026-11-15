<?php
/**
 * Database Configuration & Global Helper Functions
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

// Database Connection Credentials (Default for XAMPP)
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'library_management');
define('DB_PORT', 3306);

// System Configuration Constants
define('APP_NAME', 'The Archive');
define('APP_TAGLINE', 'IIIT KOTA · DIGITAL LIBRARY');
define('LOAN_PERIOD_DAYS', 14); // Standard duration student can keep a book
define('FINE_PER_DAY', 5.00);    // Daily fine rate (currency units) for overdue books

// Establish MySQL Database Connection using MySQLi
$conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);

// Check Connection
if ($conn->connect_error) {
    die("
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Database Connection Error - " . APP_NAME . "</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1b2d; color: #FAF7F0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .error-card { background: #FFFFFF; border: 1px solid #E5E1D8; border-radius: 10px; padding: 32px; max-width: 560px; width: 100%; box-shadow: 0 10px 25px rgba(15,27,45,0.2); }
            h2 { color: #b91c1c; margin-top: 0; font-size: 24px; }
            p { color: #526075; line-height: 1.6; }
            .details { background: #FAF7F0; border-left: 4px solid #b91c1c; padding: 12px 16px; border-radius: 4px; font-family: monospace; color: #991b1b; font-size: 13px; margin: 16px 0; }
            ol { color: #0f1b2d; padding-left: 20px; line-height: 1.8; }
            code { background: #F3EFE6; padding: 2px 6px; border-radius: 4px; color: #c89b3c; font-size: 13px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class='error-card'>
            <h2>Database Connection Failed</h2>
            <p>Unable to connect to the MySQL database server. Please ensure XAMPP MySQL service is running and the database is imported.</p>
            <div class='details'>" . htmlspecialchars($conn->connect_error) . "</div>
            <p><strong>Quick Setup Instructions:</strong></p>
            <ol>
                <li>Open <strong>XAMPP Control Panel</strong> and click <strong>Start</strong> next to <strong>Apache</strong> and <strong>MySQL</strong>.</li>
                <li>Open phpMyAdmin at <code>http://localhost/phpmyadmin</code>.</li>
                <li>Create a database named <code>library_management</code>.</li>
                <li>Import the provided <code>database.sql</code> file.</li>
                <li>Refresh this page.</li>
            </ol>
        </div>
    </body>
    </html>");
}

// Set UTF-8 character encoding
$conn->set_charset("utf8mb4");

/**
 * Return active database connection
 */
function get_db_connection() {
    global $conn;
    return $conn;
}

/**
 * Sanitize string for output to prevent XSS attacks
 */
function e($value) {
    return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
}

/**
 * Flash message helper - sets a session alert
 */
function set_flash($type, $message) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $_SESSION['flash'][$type] = $message;
}

/**
 * Retrieve and clear flash messages
 */
function get_flash() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (isset($_SESSION['flash'])) {
        $flash = $_SESSION['flash'];
        unset($_SESSION['flash']);
        return $flash;
    }
    return [];
}

/**
 * Calculate overdue days and fine for an issued record
 * @param string $due_date (YYYY-MM-DD)
 * @param string|null $return_date (YYYY-MM-DD or null if currently issued)
 * @return array ['days_overdue' => int, 'fine_amount' => float]
 */
function calculate_overdue_and_fine($due_date, $return_date = null) {
    $compare_date = $return_date ? new DateTime($return_date) : new DateTime('today');
    $due = new DateTime($due_date);

    if ($compare_date > $due) {
        $interval = $due->diff($compare_date);
        $days = (int)$interval->days;
        $fine = $days * FINE_PER_DAY;
        return [
            'days_overdue' => $days,
            'fine_amount' => $fine
        ];
    }

    return [
        'days_overdue' => 0,
        'fine_amount' => 0.00
    ];
}
