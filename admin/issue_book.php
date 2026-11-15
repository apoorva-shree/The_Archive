<?php
/**
 * Direct Issue Book to Student (Admin)
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

require_admin();
$conn = get_db_connection();

// Fetch Active Students
$students = [];
$res = $conn->query("SELECT id, full_name, email, student_id_number FROM users WHERE role = 'student' AND status = 'active' ORDER BY full_name ASC");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $students[] = $row;
    }
}

// Fetch Books With Available Stock
$books = [];
$res = $conn->query("SELECT id, title, author, isbn, available_copies, total_copies FROM books WHERE available_copies > 0 ORDER BY title ASC");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $books[] = $row;
    }
}

$error = '';
$selected_user_id = (int)($_GET['user_id'] ?? 0);
$selected_book_id = (int)($_GET['book_id'] ?? 0);
$loan_days = LOAN_PERIOD_DAYS;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id = (int)($_POST['user_id'] ?? 0);
    $book_id = (int)($_POST['book_id'] ?? 0);
    $loan_days = (int)($_POST['loan_days'] ?? LOAN_PERIOD_DAYS);
    $selected_user_id = $user_id;
    $selected_book_id = $book_id;

    if ($user_id <= 0 || $book_id <= 0 || $loan_days <= 0) {
        $error = 'Please select a valid student, book, and loan period.';
    } else {
        // Verify student
        $stmt = $conn->prepare("SELECT id, full_name, status FROM users WHERE id = ? AND role = 'student' LIMIT 1");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $student_rec = $stmt->get_result()->fetch_assoc();

        if (!$student_rec || $student_rec['status'] !== 'active') {
            $error = 'Selected student account is not active.';
        } else {
            // Verify book stock
            $stmt = $conn->prepare("SELECT id, title, available_copies FROM books WHERE id = ? LIMIT 1");
            $stmt->bind_param("i", $book_id);
            $stmt->execute();
            $book_rec = $stmt->get_result()->fetch_assoc();

            if (!$book_rec || $book_rec['available_copies'] <= 0) {
                $error = 'Selected book is out of stock.';
            } else {
                // Prevent duplicate active issue
                $stmt = $conn->prepare("SELECT id FROM issued_books WHERE user_id = ? AND book_id = ? AND status IN ('issued', 'overdue') LIMIT 1");
                $stmt->bind_param("ii", $user_id, $book_id);
                $stmt->execute();
                if ($stmt->get_result()->num_rows > 0) {
                    $error = "Student '{$student_rec['full_name']}' already holds an active borrowed copy of '{$book_rec['title']}'.";
                } else {
                    // Proceed with issue inside database transaction
                    $conn->begin_transaction();
                    try {
                        // 1. Decrement available copies
                        $up_book = $conn->prepare("UPDATE books SET available_copies = available_copies - 1 WHERE id = ? AND available_copies > 0");
                        $up_book->bind_param("i", $book_id);
                        $up_book->execute();

                        // 2. Insert into issued_books
                        $issue_date = date('Y-m-d');
                        $due_date = date('Y-m-d', strtotime("+{$loan_days} days"));
                        $ins_issue = $conn->prepare(
                            "INSERT INTO issued_books (borrow_request_id, user_id, book_id, issue_date, due_date, status, fine_amount) 
                             VALUES (NULL, ?, ?, ?, ?, 'issued', 0.00)"
                        );
                        $ins_issue->bind_param("iiss", $user_id, $book_id, $issue_date, $due_date);
                        $ins_issue->execute();
                        $issued_id = $conn->insert_id;

                        // 3. Log transaction
                        $note = "Direct issue by admin: '{$book_rec['title']}' issued to {$student_rec['full_name']} (Due: {$due_date})";
                        $log_stmt = $conn->prepare("INSERT INTO transactions (user_id, book_id, issued_book_id, action, notes) VALUES (?, ?, ?, 'book_issued', ?)");
                        $log_stmt->bind_param("iiis", $user_id, $book_id, $issued_id, $note);
                        $log_stmt->execute();

                        $conn->commit();
                        set_flash('success', "Book '{$book_rec['title']}' successfully issued to {$student_rec['full_name']}. Due Date: " . date('d M Y', strtotime($due_date)));
                        header('Location: issued_books.php');
                        exit();
                    } catch (Exception $e) {
                        $conn->rollback();
                        $error = 'Failed to issue book: ' . $e->getMessage();
                    }
                }
            }
        }
    }
}

$page_title = 'Issue Book to Student';
$header_title = 'Direct Book Circulation Desk';
$header_subtitle = 'Issue a library volume directly to an active registered student';
$current_page = 'issued_books';
$base_path = '../';

require __DIR__ . '/../includes/header.php';
?>

<div class="content-card" style="max-width: 700px; margin: 0 auto;">
  <div class="card-header">
    <h2>Issue Book Form</h2>
    <a href="issued_books.php" class="btn btn-sm btn-secondary">&larr; Back to Issued Books</a>
  </div>

  <div class="card-body">
    <?php if (!empty($error)): ?>
      <div class="alert alert-danger"><?= e($error) ?></div>
    <?php endif; ?>

    <form method="POST" action="issue_book.php">
      <div class="form-group">
        <label class="form-label" for="user_id">Select Registered Student <span class="required">*</span></label>
        <select id="user_id" name="user_id" class="form-control" required>
          <option value="0">-- Choose Student --</option>
          <?php foreach ($students as $stu): ?>
            <option value="<?= $stu['id'] ?>" <?= ($selected_user_id === (int)$stu['id']) ? 'selected' : '' ?>>
              <?= e($stu['full_name']) ?> (ID: <?= e($stu['student_id_number'] ?: 'N/A') ?>) - <?= e($stu['email']) ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="book_id">Select Available Book <span class="required">*</span></label>
        <select id="book_id" name="book_id" class="form-control" required>
          <option value="0">-- Choose Book from Stock --</option>
          <?php foreach ($books as $bk): ?>
            <option value="<?= $bk['id'] ?>" <?= ($selected_book_id === (int)$bk['id']) ? 'selected' : '' ?>>
              <?= e($bk['title']) ?> (by <?= e($bk['author']) ?>) - <?= $bk['available_copies'] ?> copies available
            </option>
          <?php endforeach; ?>
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="loan_days">Loan Duration (Days) <span class="required">*</span></label>
          <input 
            type="number" 
            id="loan_days" 
            name="loan_days" 
            class="form-control" 
            min="1" 
            max="90" 
            value="<?= (int)$loan_days ?>" 
            required
          >
          <div class="form-help">Standard loan period is <?= LOAN_PERIOD_DAYS ?> days.</div>
        </div>

        <div class="form-group">
          <label class="form-label">Calculated Return Due Date</label>
          <input 
            type="text" 
            class="form-control" 
            value="<?= date('d M Y', strtotime("+{$loan_days} days")) ?>" 
            disabled 
            style="background: #f1f5f9;"
          >
        </div>
      </div>

      <div style="display: flex; gap: 12px; margin-top: 24px;">
        <button type="submit" class="btn btn-primary" style="padding: 11px 24px;">
          Confirm & Issue Book
        </button>
        <a href="issued_books.php" class="btn btn-secondary" style="padding: 11px 24px;">
          Cancel
        </a>
      </div>
    </form>
  </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
