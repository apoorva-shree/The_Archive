<?php
/**
 * User Logout Script
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';

logout_user();

// Start a fresh session to hold the logout flash message
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
set_flash('success', 'You have been successfully signed out.');

header('Location: login.php');
exit();
