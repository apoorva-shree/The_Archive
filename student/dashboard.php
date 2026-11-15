<?php
/**
 * Student Dashboard
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

require_student();
$conn = get_db_connection();
$user = current_user();
$user_id = (int)$user['id'];

// 1. Fetch Student Metrics
// Active Loans
$active_loans_count = 0;
$stmt = $conn->prepare("SELECT COUNT(*) AS cnt FROM issued_books WHERE user_id = ? AND status IN ('issued', 'overdue')");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$active_loans_count = (int)$stmt->get_result()->fetch_assoc()['cnt'];

// Pending Requests
$pending_requests_count = 0;
$stmt = $conn->prepare("SELECT COUNT(*) AS cnt FROM borrow_requests WHERE user_id = ? AND status = 'pending'");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$pending_requests_count = (int)$stmt->get_result()->fetch_assoc()['cnt'];

// Books Returned (All-Time)
$returned_count = 0;
$stmt = $conn->prepare("SELECT COUNT(*) AS cnt FROM issued_books WHERE user_id = ? AND status = 'returned'");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$returned_count = (int)$stmt->get_result()->fetch_assoc()['cnt'];

// Overdue Count
$overdue_count = 0;
$stmt = $conn->prepare("SELECT COUNT(*) AS cnt FROM issued_books WHERE user_id = ? AND status = 'issued' AND due_date < CURDATE()");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$overdue_count = (int)$stmt->get_result()->fetch_assoc()['cnt'];

// 2. Fetch Active Borrowed Books
$active_books = [];
$stmt = $conn->prepare(
    "SELECT ib.*, b.title, b.author, b.isbn, b.cover_image, c.name AS category_name
     FROM issued_books ib
     JOIN books b ON ib.book_id = b.id
     LEFT JOIN categories c ON b.category_id = c.id
     WHERE ib.user_id = ? AND ib.status IN ('issued', 'overdue')
     ORDER BY ib.due_date ASC"
);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$active_books = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// 3. Fetch Recent Borrow Requests (Limit 5)
$my_requests = [];
$stmt = $conn->prepare(
    "SELECT br.*, b.title, b.author, b.isbn, b.available_copies
     FROM borrow_requests br
     JOIN books b ON br.book_id = b.id
     WHERE br.user_id = ?
     ORDER BY br.request_date DESC
     LIMIT 5"
);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$my_requests = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

$page_title = 'Student Dashboard';
$header_title = 'Welcome, ' . $user['full_name'];
$header_subtitle = 'Your university library account summary and active reading portfolio';
$current_page = 'dashboard';
$base_path = '../';

require __DIR__ . '/../includes/header.php';
?>

<!-- Student Metrics Grid -->
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-card-icon icon-blue">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
    </div>
    <div class="stat-card-data">
      <h3><?= $active_loans_count ?></h3>
      <p>Books Currently Borrowed</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-icon icon-amber">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
    </div>
    <div class="stat-card-data">
      <h3><?= $pending_requests_count ?></h3>
      <p>Pending Borrow Requests</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-icon icon-emerald">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </div>
    <div class="stat-card-data">
      <h3><?= $returned_count ?></h3>
      <p>Books Returned (Completed)</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-icon icon-rose">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    </div>
    <div class="stat-card-data">
      <h3><?= $overdue_count ?></h3>
      <p>Overdue Books</p>
    </div>
  </div>
</div>

<!-- Active Borrowed Books Section -->
<div class="content-card">
  <div class="card-header">
    <h2>Currently Borrowed Books (<?= count($active_books) ?> Active)</h2>
    <a href="books.php" class="btn btn-sm btn-primary">+ Borrow Another Book</a>
  </div>
  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Book Title & Details</th>
          <th>Department</th>
          <th>Issue Date</th>
          <th>Due Date</th>
          <th>Circulation Status</th>
          <th>Fine Calculation</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($active_books)): ?>
          <tr>
            <td colspan="6" style="text-align: center; padding: 36px; color: #64748b;">
              You do not have any borrowed books at the moment. 
              <br><br>
              <a href="books.php" class="btn btn-primary btn-sm">Explore Books to Borrow</a>
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($active_books as $book): ?>
            <?php
              $is_overdue = (strtotime($book['due_date']) < strtotime(date('Y-m-d')));
              $overdue_info = calculate_overdue_and_fine($book['due_date']);
              $days_left = ceil((strtotime($book['due_date']) - strtotime(date('Y-m-d'))) / 86400);
            ?>
            <tr>
              <td>
                <div style="font-weight: 700; color: #0f172a;"><?= e($book['title']) ?></div>
                <div style="font-size: 0.82rem; color: #64748b;">by <?= e($book['author']) ?> &bull; ISBN: <?= e($book['isbn']) ?></div>
              </td>
              <td><span class="badge badge-neutral"><?= e($book['category_name']) ?></span></td>
              <td><?= date('d M Y', strtotime($book['issue_date'])) ?></td>
              <td>
                <strong><?= date('d M Y', strtotime($book['due_date'])) ?></strong>
                <?php if ($is_overdue): ?>
                  <div style="color: #ef4444; font-size: 0.78rem; font-weight: 600;">
                    <?= $overdue_info['days_overdue'] ?> days overdue!
                  </div>
                <?php else: ?>
                  <div style="color: #10b981; font-size: 0.78rem;">
                    <?= $days_left ?> days remaining
                  </div>
                <?php endif; ?>
              </td>
              <td>
                <?php if ($is_overdue): ?>
                  <span class="badge badge-danger">Overdue</span>
                <?php else: ?>
                  <span class="badge badge-success">On Loan (Active)</span>
                <?php endif; ?>
              </td>
              <td>
                <?php if ($is_overdue): ?>
                  <strong style="color: #ef4444;">₹<?= number_format($overdue_info['fine_amount'], 2) ?></strong>
                  <div style="font-size: 0.75rem; color: #94a3b8;">₹<?= number_format(FINE_PER_DAY, 2) ?> / overdue day</div>
                <?php else: ?>
                  <span style="color: #10b981; font-weight: 600;">₹0.00</span>
                <?php endif; ?>
              </td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<!-- Recent Borrow Requests -->
<div class="content-card">
  <div class="card-header">
    <h2>Recent Borrowing Requests</h2>
    <a href="borrow_history.php" class="btn btn-sm btn-outline-primary">View Full History &rarr;</a>
  </div>
  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Request ID</th>
          <th>Book Title</th>
          <th>Author</th>
          <th>Request Date</th>
          <th>Status</th>
          <th>Admin Notes</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($my_requests)): ?>
          <tr>
            <td colspan="6" style="text-align: center; padding: 32px; color: #64748b;">
              You have not submitted any recent borrow requests.
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($my_requests as $req): ?>
            <tr>
              <td><strong>#BR-<?= $req['id'] ?></strong></td>
              <td style="font-weight: 600;"><?= e($req['title']) ?></td>
              <td><?= e($req['author']) ?></td>
              <td><?= date('d M Y, h:i A', strtotime($req['request_date'])) ?></td>
              <td>
                <?php if ($req['status'] === 'pending'): ?>
                  <span class="badge badge-warning">Pending Review</span>
                <?php elseif ($req['status'] === 'approved'): ?>
                  <span class="badge badge-success">Approved</span>
                <?php else: ?>
                  <span class="badge badge-danger">Rejected</span>
                <?php endif; ?>
              </td>
              <td style="font-size: 0.85rem; color: #64748b;">
                <?= e($req['admin_notes'] ?: 'No notes') ?>
              </td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
