<?php
/**
 * Authentication & Access Control Helpers
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config/database.php';

/**
 * Check if a user is currently logged in
 * @return bool
 */
function is_logged_in() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

/**
 * Check if the logged-in user is an administrator
 * @return bool
 */
function is_admin() {
    return is_logged_in() && isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin';
}

/**
 * Check if the logged-in user is a student
 * @return bool
 */
function is_student() {
    return is_logged_in() && isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'student';
}

/**
 * Restrict access to logged-in users only. Redirects to login page if not authenticated.
 * @param string $login_path Path to login.php relative to calling file
 */
function require_login($login_path = '../login.php') {
    if (!is_logged_in()) {
        set_flash('error', 'Please log in to access this page.');
        header("Location: $login_path");
        exit();
    }
}

/**
 * Restrict access to Admin users only.
 * @param string $login_path
 */
function require_admin($login_path = '../login.php') {
    require_login($login_path);
    if (!is_admin()) {
        set_flash('error', 'Unauthorized access! Administrator privileges required.');
        header("Location: ../student/dashboard.php");
        exit();
    }
}

/**
 * Restrict access to Student users only.
 * @param string $login_path
 */
function require_student($login_path = '../login.php') {
    require_login($login_path);
    if (!is_student()) {
        set_flash('error', 'Access restricted to student accounts.');
        header("Location: ../admin/dashboard.php");
        exit();
    }
}

/**
 * Get the current logged-in user session array
 * @return array
 */
function current_user() {
    if (!is_logged_in()) {
        return null;
    }
    return [
        'id'        => $_SESSION['user_id'] ?? null,
        'full_name' => $_SESSION['user_name'] ?? 'User',
        'email'     => $_SESSION['user_email'] ?? '',
        'role'      => $_SESSION['user_role'] ?? 'student',
        'student_id'=> $_SESSION['student_id'] ?? ''
    ];
}

/**
 * Log in a user and set their session variables
 * @param array $user
 */
function login_user_session($user) {
    // Regenerate session ID to prevent session fixation attacks
    session_regenerate_id(true);
    
    $_SESSION['user_id']    = $user['id'];
    $_SESSION['user_name']  = $user['full_name'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_role']  = $user['role'];
    $_SESSION['student_id'] = $user['student_id_number'] ?? '';
}

/**
 * Destroy user session and log out
 */
function logout_user() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();
}
