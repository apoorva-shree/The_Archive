<?php
/**
 * Overdue Books Tracker & Defaulters List (Admin)
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

require_admin();
$conn = get_db_connection();

// Fetch all overdue active issues
$query = "SELECT ib.*, u.full_name, u.student_id_number, u.email, u.phone, b.title, b.author, b.isbn, c.name AS category_name
          FROM issued_books ib
          JOIN users u ON ib.user_id = u.id
          JOIN books b ON ib.book_id = b.id
          LEFT JOIN categories c ON b.category_id = c.id
          WHERE ib.status = 'issued' AND ib.due_date < CURDATE()
          ORDER BY ib.due_date ASC";
$res = $conn->query($query);
$overdue_list = [];
$total_fines_accumulated = 0.00;
$max_days_overdue = 0;

if ($res) {
    while ($row = $res->fetch_assoc()) {
        $calc = calculate_overdue_and_fine($row['due_date']);
        $row['days_overdue'] = $calc['days_overdue'];
        $row['calculated_fine'] = $calc['fine_amount'];
        $total_fines_accumulated += $calc['fine_amount'];
        if ($calc['days_overdue'] > $max_days_overdue) {
            $max_days_overdue = $calc['days_overdue'];
        }
        $overdue_list[] = $row;
    }
}

$page_title = 'Overdue Books Tracker';
$header_title = 'Overdue Books & Fine Management';
$header_subtitle = 'Automated detection of overdue loans and defaulter tracking';
$current_page = 'overdue_books';
$base_path = '../';

require __DIR__ . '/../includes/header.php';
?>

<!-- Overdue Analytics Cards -->
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-card-icon icon-rose">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
    </div>
    <div class="stat-card-data">
      <h3><?= count($overdue_list) ?></h3>
      <p>Overdue Books on Loan</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-icon icon-amber">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
    </div>
    <div class="stat-card-data">
      <h3>₹<?= number_format($total_fines_accumulated, 2) ?></h3>
      <p>Total Accumulated Fines</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-icon icon-blue">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
    </div>
    <div class="stat-card-data">
      <h3><?= $max_days_overdue ?> Days</h3>
      <p>Longest Overdue Delay</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-icon icon-emerald">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </div>
    <div class="stat-card-data">
      <h3>₹<?= number_format(FINE_PER_DAY, 2) ?></h3>
      <p>Daily Overdue Fine Rate</p>
    </div>
  </div>
</div>

<!-- Overdue Table -->
<div class="content-card">
  <div class="card-header">
    <h2>Overdue Book Loans (<?= count($overdue_list) ?> Total)</h2>
  </div>
  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Issue ID</th>
          <th>Student Details</th>
          <th>Contact Info</th>
          <th>Book Title &amp; ISBN</th>
          <th>Issue Date</th>
          <th>Due Date</th>
          <th>Days Overdue</th>
          <th>Accrued Fine</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($overdue_list)): ?>
          <tr>
            <td colspan="9" style="text-align: center; padding: 48px; color: #10b981;">
              <div style="font-size: 2.2rem; margin-bottom: 8px;">&#10003;</div>
              <h3 style="color: #0f172a; margin-bottom: 4px;">Zero Overdue Books!</h3>
              <p style="color: #64748b;">All students have returned books on time or their return dates are active.</p>
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($overdue_list as $row): ?>
            <tr>
              <td><strong>#IB-<?= $row['id'] ?></strong></td>
              <td>
                <div style="font-weight: 700; color: #0f172a;"><?= e($row['full_name']) ?></div>
                <div style="font-size: 0.8rem; color: #64748b;">Roll ID: <?= e($row['student_id_number']) ?></div>
              </td>
              <td>
                <div style="font-size: 0.85rem;"><a href="mailto:<?= e($row['email']) ?>"><?= e($row['email']) ?></a></div>
                <div style="font-size: 0.8rem; color: #64748b;"><?= e($row['phone'] ?: 'No Phone') ?></div>
              </td>
              <td>
                <div style="font-weight: 700; color: #0f172a;"><?= e($row['title']) ?></div>
                <div style="font-size: 0.8rem; color: #64748b;">by <?= e($row['author']) ?></div>
                <div style="font-size: 0.75rem; color: #94a3b8;">ISBN: <?= e($row['isbn']) ?></div>
              </td>
              <td><?= date('d M Y', strtotime($row['issue_date'])) ?></td>
              <td><strong style="color: #ef4444;"><?= date('d M Y', strtotime($row['due_date'])) ?></strong></td>
              <td>
                <span class="badge badge-danger">
                  <?= $row['days_overdue'] ?> days late
                </span>
              </td>
              <td>
                <strong style="color: #ef4444; font-size: 1rem;">₹<?= number_format($row['calculated_fine'], 2) ?></strong>
              </td>
              <td>
                <a href="return_book.php?id=<?= $row['id'] ?>" class="btn btn-sm btn-primary">
                  Process Return &rarr;
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
