<?php
/**
 * Record Book Return Controller & Interface (Admin)
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

require_admin();
$conn = get_db_connection();

$issued_id = (int)($_GET['id'] ?? 0);
if ($issued_id <= 0 && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $issued_id = (int)($_POST['issued_id'] ?? 0);
}

if ($issued_id <= 0) {
    set_flash('error', 'Invalid Issued Record ID.');
    header('Location: issued_books.php');
    exit();
}

// Fetch issued record details
$stmt = $conn->prepare(
    "SELECT ib.*, u.full_name, u.student_id_number, u.email, u.phone, b.title, b.author, b.isbn, b.total_copies, b.available_copies
     FROM issued_books ib
     JOIN users u ON ib.user_id = u.id
     JOIN books b ON ib.book_id = b.id
     WHERE ib.id = ? LIMIT 1"
);
$stmt->bind_param("i", $issued_id);
$stmt->execute();
$issue = $stmt->get_result()->fetch_assoc();

if (!$issue) {
    set_flash('error', 'Issued book record not found.');
    header('Location: issued_books.php');
    exit();
}

if ($issue['status'] === 'returned') {
    set_flash('error', 'This book has already been marked as returned.');
    header('Location: issued_books.php');
    exit();
}

// Calculate overdue days and fine amount
$calc = calculate_overdue_and_fine($issue['due_date']);
$days_overdue = $calc['days_overdue'];
$fine_amount = $calc['fine_amount'];

// Handle Return Confirmation Submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['confirm_return'])) {
    $return_date = date('Y-m-d');
    $collected_fine = isset($_POST['fine_collected']) ? (float)$fine_amount : 0.00;
    $notes = trim($_POST['return_notes'] ?? '');

    $conn->begin_transaction();
    try {
        // 1. Update issued_books record
        $up_issue = $conn->prepare(
            "UPDATE issued_books SET status = 'returned', return_date = ?, fine_amount = ? WHERE id = ?"
        );
        $up_issue->bind_param("sdi", $return_date, $fine_amount, $issued_id);
        $up_issue->execute();

        // 2. Increment book available copies
        $up_book = $conn->prepare(
            "UPDATE books SET available_copies = LEAST(total_copies, available_copies + 1) WHERE id = ?"
        );
        $up_book->bind_param("i", $issue['book_id']);
        $up_book->execute();

        // 3. Log into transactions audit ledger
        $log_note = "Book '{$issue['title']}' returned by {$issue['full_name']}. Fine assessed: ₹" . number_format($fine_amount, 2) . ". {$notes}";
        $log_stmt = $conn->prepare(
            "INSERT INTO transactions (user_id, book_id, issued_book_id, action, notes) VALUES (?, ?, ?, 'book_returned', ?)"
        );
        $log_stmt->bind_param("iiis", $issue['user_id'], $issue['book_id'], $issued_id, $log_note);
        $log_stmt->execute();

        $conn->commit();
        set_flash('success', "Book '{$issue['title']}' returned successfully! Inventory copy restored to shelf.");
        header('Location: issued_books.php');
        exit();
    } catch (Exception $e) {
        $conn->rollback();
        $error = 'Error processing return: ' . $e->getMessage();
    }
}

$page_title = 'Process Book Return: ' . $issue['title'];
$header_title = 'Process Book Return';
$header_subtitle = 'Record physical copy check-in, calculate fines, and restore library inventory';
$current_page = 'issued_books';
$base_path = '../';

require __DIR__ . '/../includes/header.php';
?>

<div class="content-card" style="max-width: 760px; margin: 0 auto;">
  <div class="card-header">
    <h2>Return Clearance & Fine Summary (#IB-<?= $issue['id'] ?>)</h2>
    <a href="issued_books.php" class="btn btn-sm btn-secondary">&larr; Back to Circulation</a>
  </div>

  <div class="card-body">
    <?php if (!empty($error)): ?>
      <div class="alert alert-danger"><?= e($error) ?></div>
    <?php endif; ?>

    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; background: var(--bg-subtle); padding: 20px; border-radius: var(--radius-sm); margin-bottom: 24px;">
      <div>
        <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 700;">Student Information</div>
        <div style="font-size: 1.05rem; font-weight: 700; color: #0f172a; margin-top: 4px;"><?= e($issue['full_name']) ?></div>
        <div style="font-size: 0.85rem; color: #64748b;"><?= e($issue['student_id_number']) ?> &bull; <?= e($issue['email']) ?></div>
        <?php if (!empty($issue['phone'])): ?>
          <div style="font-size: 0.85rem; color: #64748b;">Phone: <?= e($issue['phone']) ?></div>
        <?php endif; ?>
      </div>

      <div>
        <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 700;">Book Information</div>
        <div style="font-size: 1.05rem; font-weight: 700; color: #0f172a; margin-top: 4px;"><?= e($issue['title']) ?></div>
        <div style="font-size: 0.85rem; color: #64748b;">by <?= e($issue['author']) ?></div>
        <div style="font-size: 0.85rem; color: #64748b;">ISBN: <code><?= e($issue['isbn']) ?></code></div>
      </div>
    </div>

    <!-- Loan Timeline & Overdue Computation -->
    <div style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 20px; margin-bottom: 24px;">
      <h3 style="font-size: 1rem; margin-bottom: 14px; color: #0f172a;">Circulation Audit Timeline</h3>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; text-align: center;">
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px;">
          <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase;">Issue Date</div>
          <div style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin-top: 2px;">
            <?= date('d M Y', strtotime($issue['issue_date'])) ?>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 12px; border-radius: 6px;">
          <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase;">Scheduled Due Date</div>
          <div style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin-top: 2px;">
            <?= date('d M Y', strtotime($issue['due_date'])) ?>
          </div>
        </div>

        <div style="background: #eff6ff; padding: 12px; border-radius: 6px; border: 1px solid #bfdbfe;">
          <div style="font-size: 0.75rem; color: #1e3a8a; text-transform: uppercase;">Actual Return Date</div>
          <div style="font-size: 0.95rem; font-weight: 700; color: #2563eb; margin-top: 2px;">
            <?= date('d M Y') ?> (Today)
          </div>
        </div>
      </div>

      <!-- Fine Calculation Box -->
      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-weight: 700; color: #0f172a;">
            <?php if ($days_overdue > 0): ?>
              <span style="color: #ef4444;">&#9888; Overdue by <?= $days_overdue ?> Days</span>
            <?php else: ?>
              <span style="color: #10b981;">&#10003; Returned On Time</span>
            <?php endif; ?>
          </div>
          <div style="font-size: 0.82rem; color: #64748b;">
            Fine Rule: ₹<?= number_format(FINE_PER_DAY, 2) ?> per calendar day past scheduled due date.
          </div>
        </div>

        <div style="text-align: right;">
          <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b;">Total Overdue Fine</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: <?= $fine_amount > 0 ? '#ef4444' : '#10b981' ?>;">
            ₹<?= number_format($fine_amount, 2) ?>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation Form -->
    <form method="POST" action="return_book.php">
      <input type="hidden" name="confirm_return" value="1">
      <input type="hidden" name="issued_id" value="<?= $issue['id'] ?>">

      <?php if ($fine_amount > 0): ?>
        <div class="form-group" style="background: #fffbeb; border: 1px solid #fde68a; padding: 14px 18px; border-radius: 6px;">
          <label style="display: flex; align-items: center; gap: 10px; font-weight: 600; color: #92400e; cursor: pointer;">
            <input type="checkbox" name="fine_collected" value="1" checked style="width: 18px; height: 18px;">
            Fine of ₹<?= number_format($fine_amount, 2) ?> collected from student at library desk.
          </label>
        </div>
      <?php endif; ?>

      <div class="form-group">
        <label class="form-label" for="return_notes">Return Condition / Librarian Remarks</label>
        <input 
          type="text" 
          id="return_notes" 
          name="return_notes" 
          class="form-control" 
          placeholder="e.g., Book inspected, physical condition good, copy restored to Shelf A-4."
        >
      </div>

      <div style="display: flex; gap: 12px; margin-top: 24px;">
        <button type="submit" class="btn btn-primary" style="padding: 11px 24px;">
          Confirm Check-In &amp; Restore Inventory
        </button>
        <a href="issued_books.php" class="btn btn-secondary" style="padding: 11px 24px;">
          Cancel
        </a>
      </div>
    </form>
  </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
