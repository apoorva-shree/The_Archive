<?php
/**
 * View Issued Books & Circulation (Admin)
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

require_admin();
$conn = get_db_connection();

// Status Filter (active / returned / all)
$status_filter = trim($_GET['status'] ?? 'active');
$search = trim($_GET['search'] ?? '');

$query = "SELECT ib.*, u.full_name, u.student_id_number, u.email, u.phone, b.title, b.author, b.isbn, c.name AS category_name
          FROM issued_books ib
          JOIN users u ON ib.user_id = u.id
          JOIN books b ON ib.book_id = b.id
          LEFT JOIN categories c ON b.category_id = c.id
          WHERE 1=1";
$params = [];
$types = "";

if ($status_filter === 'active') {
    $query .= " AND ib.status IN ('issued', 'overdue')";
} elseif ($status_filter === 'overdue') {
    $query .= " AND ib.status = 'issued' AND ib.due_date < CURDATE()";
} elseif ($status_filter === 'returned') {
    $query .= " AND ib.status = 'returned'";
}

if (!empty($search)) {
    $query .= " AND (u.full_name LIKE ? OR u.student_id_number LIKE ? OR b.title LIKE ? OR b.isbn LIKE ?)";
    $like = "%" . $search . "%";
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $types .= "ssss";
}

$query .= " ORDER BY CASE WHEN ib.status IN ('issued', 'overdue') THEN 0 ELSE 1 END, ib.due_date ASC";

$stmt = $conn->prepare($query);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$issued_list = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

$page_title = 'Issued Books Management';
$header_title = 'Issued Books & Active Circulation';
$header_subtitle = 'Monitor loan deadlines, track returns, and record fine payments';
$current_page = 'issued_books';
$base_path = '../';

require __DIR__ . '/../includes/header.php';
?>

<!-- Filter & Search Bar -->
<div class="filter-bar">
  <form method="GET" action="issued_books.php" style="display: flex; gap: 12px; width: 100%; flex-wrap: wrap; align-items: center;">
    <div style="display: flex; gap: 6px;">
      <a href="issued_books.php?status=active" class="btn btn-sm <?= ($status_filter === 'active') ? 'btn-primary' : 'btn-secondary' ?>">
        Active Loans
      </a>
      <a href="issued_books.php?status=overdue" class="btn btn-sm <?= ($status_filter === 'overdue') ? 'btn-danger' : 'btn-secondary' ?>">
        Overdue Only
      </a>
      <a href="issued_books.php?status=returned" class="btn btn-sm <?= ($status_filter === 'returned') ? 'btn-primary' : 'btn-secondary' ?>">
        Returned History
      </a>
      <a href="issued_books.php?status=all" class="btn btn-sm <?= ($status_filter === 'all') ? 'btn-primary' : 'btn-secondary' ?>">
        All Records
      </a>
    </div>

    <div class="filter-input" style="max-width: 320px;">
      <input 
        type="text" 
        name="search" 
        class="form-control" 
        placeholder="Search student or book title..." 
        value="<?= e($search) ?>"
      >
      <input type="hidden" name="status" value="<?= e($status_filter) ?>">
    </div>

    <button type="submit" class="btn btn-secondary">Search</button>

    <div style="margin-left: auto;">
      <a href="issue_book.php" class="btn btn-success">+ Issue Book Directly</a>
    </div>
  </form>
</div>

<!-- Issued Books Table -->
<div class="content-card">
  <div class="card-header">
    <h2>Circulation Records (<?= count($issued_list) ?> Found)</h2>
  </div>
  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Issue ID</th>
          <th>Student Details</th>
          <th>Book Title &amp; ISBN</th>
          <th>Issue Date</th>
          <th>Due Date</th>
          <th>Return Date</th>
          <th>Status</th>
          <th>Fine</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($issued_list)): ?>
          <tr>
            <td colspan="9" style="text-align: center; padding: 40px; color: #64748b;">
              No records found for the selected circulation filter.
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($issued_list as $row): ?>
            <?php
              $is_active = ($row['status'] !== 'returned');
              $is_overdue = ($is_active && strtotime($row['due_date']) < strtotime(date('Y-m-d')));
              $calc = calculate_overdue_and_fine($row['due_date'], $row['return_date']);
              $fine_display = $is_active ? $calc['fine_amount'] : (float)$row['fine_amount'];
            ?>
            <tr>
              <td><strong>#IB-<?= $row['id'] ?></strong></td>
              <td>
                <div style="font-weight: 700; color: #0f172a;"><?= e($row['full_name']) ?></div>
                <div style="font-size: 0.8rem; color: #64748b;"><?= e($row['student_id_number']) ?></div>
                <div style="font-size: 0.75rem; color: #94a3b8;"><?= e($row['email']) ?></div>
              </td>
              <td>
                <div style="font-weight: 700; color: #0f172a;"><?= e($row['title']) ?></div>
                <div style="font-size: 0.8rem; color: #64748b;">by <?= e($row['author']) ?></div>
                <div style="font-size: 0.75rem; color: #94a3b8;">ISBN: <?= e($row['isbn']) ?></div>
              </td>
              <td><?= date('d M Y', strtotime($row['issue_date'])) ?></td>
              <td>
                <strong><?= date('d M Y', strtotime($row['due_date'])) ?></strong>
                <?php if ($is_overdue): ?>
                  <div style="color: #ef4444; font-size: 0.78rem; font-weight: 700;">
                    <?= $calc['days_overdue'] ?> days overdue
                  </div>
                <?php endif; ?>
              </td>
              <td>
                <?php if (!empty($row['return_date'])): ?>
                  <?= date('d M Y', strtotime($row['return_date'])) ?>
                <?php else: ?>
                  <span style="color: #94a3b8;">Pending</span>
                <?php endif; ?>
              </td>
              <td>
                <?php if (!$is_active): ?>
                  <span class="badge badge-neutral">Returned</span>
                <?php elseif ($is_overdue): ?>
                  <span class="badge badge-danger">Overdue</span>
                <?php else: ?>
                  <span class="badge badge-success">Active Loan</span>
                <?php endif; ?>
              </td>
              <td>
                <?php if ($fine_display > 0): ?>
                  <strong style="color: #ef4444;">₹<?= number_format($fine_display, 2) ?></strong>
                <?php else: ?>
                  <span style="color: #10b981;">₹0.00</span>
                <?php endif; ?>
              </td>
              <td>
                <?php if ($is_active): ?>
                  <a href="return_book.php?id=<?= $row['id'] ?>" class="btn btn-sm btn-primary">
                    Process Return
                  </a>
                <?php else: ?>
                  <span style="color: #94a3b8; font-size: 0.85rem;">Completed</span>
                <?php endif; ?>
              </td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
