<?php
/**
 * Student Borrowing History & Request Log
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

require_student();
$conn = get_db_connection();
$user = current_user();
$user_id = (int)$user['id'];

// 1. Fetch Past Returned Books
$stmt = $conn->prepare(
    "SELECT ib.*, b.title, b.author, b.isbn, c.name AS category_name
     FROM issued_books ib
     JOIN books b ON ib.book_id = b.id
     LEFT JOIN categories c ON b.category_id = c.id
     WHERE ib.user_id = ? AND ib.status = 'returned'
     ORDER BY ib.return_date DESC"
);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$past_books = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// 2. Fetch All Borrow Requests
$stmt = $conn->prepare(
    "SELECT br.*, b.title, b.author, b.isbn
     FROM borrow_requests br
     JOIN books b ON br.book_id = b.id
     WHERE br.user_id = ?
     ORDER BY br.request_date DESC"
);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$requests_history = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

$page_title = 'Borrowing History';
$header_title = 'My Borrowing & Circulation History';
$header_subtitle = 'Complete record of your past book loans, returns, and request approvals';
$current_page = 'borrow_history';
$base_path = '../';

require __DIR__ . '/../includes/header.php';
?>

<!-- Past Returned Loans -->
<div class="content-card">
  <div class="card-header">
    <h2>Returned Books History (<?= count($past_books) ?> Total)</h2>
  </div>
  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Issue ID</th>
          <th>Book Title &amp; Author</th>
          <th>Category</th>
          <th>Issue Date</th>
          <th>Due Date</th>
          <th>Return Date</th>
          <th>Status</th>
          <th>Fine Paid</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($past_books)): ?>
          <tr>
            <td colspan="8" style="text-align: center; padding: 36px; color: #64748b;">
              You have not returned any books yet.
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($past_books as $book): ?>
            <tr>
              <td><strong>#IB-<?= $book['id'] ?></strong></td>
              <td>
                <div style="font-weight: 700; color: #0f172a;"><?= e($book['title']) ?></div>
                <div style="font-size: 0.8rem; color: #64748b;">by <?= e($book['author']) ?></div>
              </td>
              <td><span class="badge badge-neutral"><?= e($book['category_name']) ?></span></td>
              <td><?= date('d M Y', strtotime($book['issue_date'])) ?></td>
              <td><?= date('d M Y', strtotime($book['due_date'])) ?></td>
              <td>
                <strong style="color: #10b981;">
                  <?= date('d M Y', strtotime($book['return_date'])) ?>
                </strong>
              </td>
              <td><span class="badge badge-success">Returned</span></td>
              <td>
                <?php if ($book['fine_amount'] > 0): ?>
                  <span style="color: #ef4444; font-weight: 600;">₹<?= number_format($book['fine_amount'], 2) ?></span>
                <?php else: ?>
                  <span style="color: #10b981;">₹0.00 (On Time)</span>
                <?php endif; ?>
              </td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<!-- All Requests History -->
<div class="content-card">
  <div class="card-header">
    <h2>All Borrow Requests (<?= count($requests_history) ?> Total)</h2>
  </div>
  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Request ID</th>
          <th>Book Title</th>
          <th>Author</th>
          <th>ISBN</th>
          <th>Request Date</th>
          <th>Status</th>
          <th>Administrator Remarks</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($requests_history)): ?>
          <tr>
            <td colspan="7" style="text-align: center; padding: 36px; color: #64748b;">
              No borrow requests found in your account history.
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($requests_history as $req): ?>
            <tr>
              <td><strong>#BR-<?= $req['id'] ?></strong></td>
              <td style="font-weight: 600;"><?= e($req['title']) ?></td>
              <td><?= e($req['author']) ?></td>
              <td><code><?= e($req['isbn']) ?></code></td>
              <td><?= date('d M Y, h:i A', strtotime($req['request_date'])) ?></td>
              <td>
                <?php if ($req['status'] === 'pending'): ?>
                  <span class="badge badge-warning">Pending</span>
                <?php elseif ($req['status'] === 'approved'): ?>
                  <span class="badge badge-success">Approved</span>
                <?php else: ?>
                  <span class="badge badge-danger">Rejected</span>
                <?php endif; ?>
              </td>
              <td style="font-size: 0.85rem; color: #64748b;">
                <?= e($req['admin_notes'] ?: '—') ?>
              </td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
