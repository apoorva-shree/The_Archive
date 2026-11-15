<?php
/**
 * Admin Dashboard
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

// Enforce Admin Access
require_admin();

$conn = get_db_connection();

// 1. Fetch Dynamic Statistics
// Total Book Volumes & Available
$total_copies = 0;
$available_copies = 0;
$total_titles = 0;
$res = $conn->query("SELECT SUM(total_copies) AS total_copies, SUM(available_copies) AS available_copies, COUNT(*) AS titles FROM books");
if ($res && $row = $res->fetch_assoc()) {
    $total_copies = (int)$row['total_copies'];
    $available_copies = (int)$row['available_copies'];
    $total_titles = (int)$row['titles'];
}

// Total Registered Students
$total_students = 0;
$res = $conn->query("SELECT COUNT(*) AS total_students FROM users WHERE role = 'student'");
if ($res && $row = $res->fetch_assoc()) {
    $total_students = (int)$row['total_students'];
}

// Books Currently Issued
$currently_issued = 0;
$res = $conn->query("SELECT COUNT(*) AS issued_count FROM issued_books WHERE status IN ('issued', 'overdue')");
if ($res && $row = $res->fetch_assoc()) {
    $currently_issued = (int)$row['issued_count'];
}

// Overdue Books Count
$overdue_count = 0;
$res = $conn->query("SELECT COUNT(*) AS overdue_count FROM issued_books WHERE status = 'issued' AND due_date < CURDATE()");
if ($res && $row = $res->fetch_assoc()) {
    $overdue_count = (int)$row['overdue_count'];
}

// Pending Borrow Requests
$pending_requests = 0;
$res = $conn->query("SELECT COUNT(*) AS pending_count FROM borrow_requests WHERE status = 'pending'");
if ($res && $row = $res->fetch_assoc()) {
    $pending_requests = (int)$row['pending_count'];
}

// 2. Fetch Recent Pending Borrow Requests (Limit 5)
$recent_requests = [];
$req_query = "SELECT br.*, u.full_name, u.student_id_number, u.email, b.title, b.author, b.available_copies 
              FROM borrow_requests br
              JOIN users u ON br.user_id = u.id
              JOIN books b ON br.book_id = b.id
              WHERE br.status = 'pending'
              ORDER BY br.request_date DESC
              LIMIT 5";
$res = $conn->query($req_query);
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $recent_requests[] = $row;
    }
}

// 3. Fetch Recently Issued Books (Limit 5)
$recent_issued = [];
$iss_query = "SELECT ib.*, u.full_name, u.student_id_number, b.title, b.author 
              FROM issued_books ib
              JOIN users u ON ib.user_id = u.id
              JOIN books b ON ib.book_id = b.id
              WHERE ib.status IN ('issued', 'overdue')
              ORDER BY ib.issue_date DESC
              LIMIT 5";
$res = $conn->query($iss_query);
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $recent_issued[] = $row;
    }
}

$page_title = 'Admin Dashboard';
$header_title = 'Administrator Central Console';
$header_subtitle = 'Overview of library inventory, circulation activity, and member requests';
$current_page = 'dashboard';
$base_path = '../';

require __DIR__ . '/../includes/header.php';
?>

<!-- Statistics Overview Cards -->
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-card-icon icon-blue">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
    </div>
    <div class="stat-card-data">
      <h3><?= number_format($total_copies) ?></h3>
      <p>Total Book Volumes (<?= $total_titles ?> Titles)</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-icon icon-emerald">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </div>
    <div class="stat-card-data">
      <h3><?= number_format($available_copies) ?></h3>
      <p>Available on Shelves</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-icon icon-purple">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
    </div>
    <div class="stat-card-data">
      <h3><?= number_format($total_students) ?></h3>
      <p>Registered Students</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-icon icon-amber">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
    </div>
    <div class="stat-card-data">
      <h3><?= number_format($currently_issued) ?></h3>
      <p>Books Currently Issued</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-icon icon-rose">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    </div>
    <div class="stat-card-data">
      <h3><?= number_format($overdue_count) ?></h3>
      <p>Overdue Books</p>
    </div>
  </div>
</div>

<!-- Quick Actions Banner -->
<div class="content-card" style="margin-bottom: 24px; background: linear-gradient(135deg, #09111c, #0f1b2d); color: #fff; border: 1px solid rgba(200, 155, 60, 0.25);">
  <div class="card-body" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
    <div>
      <h3 style="color: #fff; margin-bottom: 4px;">Quick Administrative Tasks</h3>
      <p style="color: #cbd5e1; font-size: 0.9rem;">Perform frequent circulation actions with one click.</p>
    </div>
    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
      <a href="add_book.php" class="btn btn-gold">+ Add New Book</a>
      <a href="issue_book.php" class="btn btn-secondary">Issue Book to Student</a>
      <a href="borrow_requests.php" class="btn btn-outline">Review Requests (<?= $pending_requests ?>)</a>
    </div>
  </div>
</div>

<!-- Recent Pending Borrow Requests Table -->
<div class="content-card">
  <div class="card-header">
    <h2>Pending Borrow Requests</h2>
    <a href="borrow_requests.php" class="btn btn-sm btn-outline-primary">View All Requests &rarr;</a>
  </div>
  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Request ID</th>
          <th>Student Details</th>
          <th>Requested Book</th>
          <th>Request Date</th>
          <th>Stock Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($recent_requests)): ?>
          <tr>
            <td colspan="6" style="text-align: center; padding: 32px; color: #64748b;">
              No pending borrow requests right now. All requests are up to date!
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($recent_requests as $req): ?>
            <tr>
              <td><strong>#BR-<?= $req['id'] ?></strong></td>
              <td>
                <div style="font-weight: 600;"><?= e($req['full_name']) ?></div>
                <div style="font-size: 0.8rem; color: #64748b;"><?= e($req['student_id_number']) ?> &bull; <?= e($req['email']) ?></div>
              </td>
              <td>
                <div style="font-weight: 600;"><?= e($req['title']) ?></div>
                <div style="font-size: 0.8rem; color: #64748b;">by <?= e($req['author']) ?></div>
              </td>
              <td><?= date('d M Y, h:i A', strtotime($req['request_date'])) ?></td>
              <td>
                <?php if ($req['available_copies'] > 0): ?>
                  <span class="badge badge-success"><?= $req['available_copies'] ?> Available</span>
                <?php else: ?>
                  <span class="badge badge-danger">Out of Stock</span>
                <?php endif; ?>
              </td>
              <td>
                <div style="display: flex; gap: 6px;">
                  <?php if ($req['available_copies'] > 0): ?>
                    <a href="borrow_requests.php?action=approve&id=<?= $req['id'] ?>" class="btn btn-sm btn-success" onclick="return confirm('Approve request and issue this book?');">
                      Approve & Issue
                    </a>
                  <?php else: ?>
                    <button class="btn btn-sm btn-secondary" disabled title="No copies available">No Stock</button>
                  <?php endif; ?>
                  <a href="borrow_requests.php?action=reject&id=<?= $req['id'] ?>" class="btn btn-sm btn-danger" onclick="return confirm('Reject this request?');">
                    Reject
                  </a>
                </div>
              </td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<!-- Active Circulation / Issued Books Table -->
<div class="content-card">
  <div class="card-header">
    <h2>Recent Book Circulations</h2>
    <a href="issued_books.php" class="btn btn-sm btn-outline-primary">View All Issued &rarr;</a>
  </div>
  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Issue ID</th>
          <th>Student</th>
          <th>Book Title</th>
          <th>Issue Date</th>
          <th>Due Date</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($recent_issued)): ?>
          <tr>
            <td colspan="7" style="text-align: center; padding: 32px; color: #64748b;">
              No books currently on loan.
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($recent_issued as $iss): ?>
            <?php
              $is_overdue = (strtotime($iss['due_date']) < strtotime(date('Y-m-d')));
              $overdue_info = calculate_overdue_and_fine($iss['due_date']);
            ?>
            <tr>
              <td><strong>#IB-<?= $iss['id'] ?></strong></td>
              <td>
                <div style="font-weight: 600;"><?= e($iss['full_name']) ?></div>
                <div style="font-size: 0.8rem; color: #64748b;"><?= e($iss['student_id_number']) ?></div>
              </td>
              <td><?= e($iss['title']) ?></td>
              <td><?= date('d M Y', strtotime($iss['issue_date'])) ?></td>
              <td>
                <?= date('d M Y', strtotime($iss['due_date'])) ?>
                <?php if ($is_overdue): ?>
                  <div style="font-size: 0.75rem; color: #ef4444; font-weight: 600;">
                    <?= $overdue_info['days_overdue'] ?> days overdue
                  </div>
                <?php endif; ?>
              </td>
              <td>
                <?php if ($is_overdue): ?>
                  <span class="badge badge-danger">Overdue (Fine: ₹<?= number_format($overdue_info['fine_amount'], 2) ?>)</span>
                <?php else: ?>
                  <span class="badge badge-info">Active</span>
                <?php endif; ?>
              </td>
              <td>
                <a href="return_book.php?id=<?= $iss['id'] ?>" class="btn btn-sm btn-primary">
                  Process Return
                </a>
              </td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
