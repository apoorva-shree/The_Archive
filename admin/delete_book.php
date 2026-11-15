<?php
/**
 * Delete Book Controller (Admin)
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

require_admin();
$conn = get_db_connection();

$book_id = (int)($_GET['id'] ?? 0);
if ($book_id <= 0) {
    set_flash('error', 'Invalid Book ID provided for deletion.');
    header('Location: manage_books.php');
    exit();
}

// 1. Safety Check: Are any copies currently on loan?
$chk_issued = $conn->prepare("SELECT COUNT(*) AS cnt FROM issued_books WHERE book_id = ? AND status IN ('issued', 'overdue')");
$chk_issued->bind_param("i", $book_id);
$chk_issued->execute();
if ($chk_issued->get_result()->fetch_assoc()['cnt'] > 0) {
    set_flash('error', 'Deletion rejected: Active copies of this book are currently on loan to students. Record returns before deleting.');
    header('Location: manage_books.php');
    exit();
}

// 2. Safety Check: Are there pending borrow requests?
$chk_req = $conn->prepare("SELECT COUNT(*) AS cnt FROM borrow_requests WHERE book_id = ? AND status = 'pending'");
$chk_req->bind_param("i", $book_id);
$chk_req->execute();
if ($chk_req->get_result()->fetch_assoc()['cnt'] > 0) {
    set_flash('error', 'Deletion rejected: There are pending borrow requests for this book. Review or reject requests before deleting.');
    header('Location: manage_books.php');
    exit();
}

// 3. Fetch title for friendly confirmation message
$info_stmt = $conn->prepare("SELECT title FROM books WHERE id = ?");
$info_stmt->bind_param("i", $book_id);
$info_stmt->execute();
$info = $info_stmt->get_result()->fetch_assoc();
$title = $info['title'] ?? 'Selected Book';

// 4. Perform Deletion
$del = $conn->prepare("DELETE FROM books WHERE id = ?");
$del->bind_param("i", $book_id);

if ($del->execute()) {
    set_flash('success', "Book '{$title}' was successfully removed from the catalog.");
} else {
    set_flash('error', 'Could not delete book due to relational database integrity constraints.');
}

header('Location: manage_books.php');
exit();
