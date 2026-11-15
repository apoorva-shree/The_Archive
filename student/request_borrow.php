<?php
/**
 * Student Borrow Request Submission Controller
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

require_student();
$conn = get_db_connection();
$user = current_user();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: books.php');
    exit();
}

$book_id = (int)($_POST['book_id'] ?? 0);
$user_id = (int)$user['id'];

if ($book_id <= 0) {
    set_flash('error', 'Invalid book selected for request.');
    header('Location: books.php');
    exit();
}

// 1. Verify student account status
$user_stmt = $conn->prepare("SELECT status FROM users WHERE id = ? LIMIT 1");
$user_stmt->bind_param("i", $user_id);
$user_stmt->execute();
$user_data = $user_stmt->get_result()->fetch_assoc();

if (!$user_data || $user_data['status'] !== 'active') {
    set_flash('error', 'Your student account is currently deactivated. You cannot request books.');
    header("Location: book_details.php?id={$book_id}");
    exit();
}

// 2. Fetch book details & check available copies
$book_stmt = $conn->prepare("SELECT id, title, available_copies FROM books WHERE id = ? LIMIT 1");
$book_stmt->bind_param("i", $book_id);
$book_stmt->execute();
$book = $book_stmt->get_result()->fetch_assoc();

if (!$book) {
    set_flash('error', 'Book not found in library catalog.');
    header('Location: books.php');
    exit();
}

if ($book['available_copies'] <= 0) {
    set_flash('error', "Sorry, '{$book['title']}' is currently out of stock. Please check back when copies are returned.");
    header("Location: book_details.php?id={$book_id}");
    exit();
}

// 3. Prevent duplicate pending borrow request for the same book
$dup_stmt = $conn->prepare("SELECT id FROM borrow_requests WHERE user_id = ? AND book_id = ? AND status = 'pending' LIMIT 1");
$dup_stmt->bind_param("ii", $user_id, $book_id);
$dup_stmt->execute();
if ($dup_stmt->get_result()->num_rows > 0) {
    set_flash('error', "You already have a pending borrow request submitted for '{$book['title']}'. Awaiting admin review.");
    header("Location: book_details.php?id={$book_id}");
    exit();
}

// 4. Prevent request if student currently has an active issued copy of this book
$act_stmt = $conn->prepare("SELECT id FROM issued_books WHERE user_id = ? AND book_id = ? AND status IN ('issued', 'overdue') LIMIT 1");
$act_stmt->bind_param("ii", $user_id, $book_id);
$act_stmt->execute();
if ($act_stmt->get_result()->num_rows > 0) {
    set_flash('error', "You currently have an active borrowed copy of '{$book['title']}'. Please return it before requesting another copy.");
    header("Location: book_details.php?id={$book_id}");
    exit();
}

// 5. Insert new borrow request
$req_ins = $conn->prepare("INSERT INTO borrow_requests (user_id, book_id, status) VALUES (?, ?, 'pending')");
$req_ins->bind_param("ii", $user_id, $book_id);

if ($req_ins->execute()) {
    $request_id = $conn->insert_id;
    
    // Log transaction
    $note = "Student submitted online borrow request #BR-{$request_id} for '{$book['title']}'";
    $log_stmt = $conn->prepare("INSERT INTO transactions (user_id, book_id, action, notes) VALUES (?, ?, 'borrow_request', ?)");
    $log_stmt->bind_param("iis", $user_id, $book_id, $note);
    $log_stmt->execute();

    set_flash('success', "Borrow request for '{$book['title']}' has been submitted successfully! The library administrator will review it.");
    header('Location: my_books.php');
    exit();
} else {
    set_flash('error', 'Failed to submit borrow request due to a database error. Please try again.');
    header("Location: book_details.php?id={$book_id}");
    exit();
}
