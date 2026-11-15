<?php
/**
 * Student Active Borrowed Books
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

require_student();
$conn = get_db_connection();
$user = current_user();
$user_id = (int)$user['id'];

// Fetch all currently active or overdue books
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
$active_loans = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// Calculate total active fines
$total_fines = 0.00;
foreach ($active_loans as $loan) {
    $calc = calculate_overdue_and_fine($loan['due_date']);
    $total_fines += $calc['fine_amount'];
}

$page_title = 'My Borrowed Books';
$header_title = 'My Active Borrowed Books';
$header_subtitle = 'Track your active book issues, return deadlines, and overdue fine status';
$current_page = 'my_books';
$base_path = '../';

require __DIR__ . '/../includes/header.php';
?>

<!-- Information Alert -->
<div class="alert alert-info">
  <div>
    <strong>Library Circulation Policy:</strong>
    Standard loan duration is <strong><?= LOAN_PERIOD_DAYS ?> days</strong>. 
    Books must be returned physically at the central library desk. Overdue books incur a fee of 
    <strong>₹<?= number_format(FINE_PER_DAY, 2) ?> per day</strong>.
  </div>
</div>

<?php if ($total_fines > 0): ?>
  <div class="alert alert-danger">
    <strong>Overdue Notice:</strong> You currently have an accumulated overdue fine of 
    <strong>₹<?= number_format($total_fines, 2) ?></strong>. 
    Please return your overdue books immediately to prevent further fine accrual.
  </div>
<?php endif; ?>

<div class="content-card">
  <div class="card-header">
    <h2>Active Book Loans (<?= count($active_loans) ?>)</h2>
    <a href="books.php" class="btn btn-sm btn-primary">+ Borrow Another Book</a>
  </div>
  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Cover</th>
          <th>Book Title &amp; Details</th>
          <th>Category</th>
          <th>Issue Date</th>
          <th>Due Date</th>
          <th>Loan Status</th>
          <th>Accrued Fine</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($active_loans)): ?>
          <tr>
            <td colspan="7" style="text-align: center; padding: 48px; color: #64748b;">
              <div style="font-size: 2rem; margin-bottom: 8px;">&#128218;</div>
              <p>You have no books currently on loan.</p>
              <a href="books.php" class="btn btn-primary btn-sm" style="margin-top: 10px;">Browse Catalog</a>
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($active_loans as $loan): ?>
            <?php
              $cover_path = '../assets/images/covers/default_book.svg';
              if (!empty($loan['cover_image']) && file_exists(__DIR__ . '/../assets/images/covers/' . $loan['cover_image'])) {
                  $cover_path = '../assets/images/covers/' . $loan['cover_image'];
              }

              $is_overdue = (strtotime($loan['due_date']) < strtotime(date('Y-m-d')));
              $overdue_info = calculate_overdue_and_fine($loan['due_date']);
              $days_left = ceil((strtotime($loan['due_date']) - strtotime(date('Y-m-d'))) / 86400);
            ?>
            <tr>
              <td style="width: 50px;">
                <img src="<?= e($cover_path) ?>" alt="Cover" style="width: 44px; height: 60px; object-fit: cover; border-radius: 4px;">
              </td>
              <td>
                <div style="font-weight: 700; color: #0f172a;"><?= e($loan['title']) ?></div>
                <div style="font-size: 0.8rem; color: #64748b;">by <?= e($loan['author']) ?></div>
                <div style="font-size: 0.75rem; color: #94a3b8;">ISBN: <?= e($loan['isbn']) ?></div>
              </td>
              <td><span class="badge badge-neutral"><?= e($loan['category_name']) ?></span></td>
              <td><?= date('d M Y', strtotime($loan['issue_date'])) ?></td>
              <td>
                <div style="font-weight: 700;"><?= date('d M Y', strtotime($loan['due_date'])) ?></div>
                <?php if ($is_overdue): ?>
                  <div style="color: #ef4444; font-size: 0.78rem; font-weight: 700;">
                    <?= $overdue_info['days_overdue'] ?> days past due!
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
                  <span class="badge badge-success">Active Loan</span>
                <?php endif; ?>
              </td>
              <td>
                <?php if ($is_overdue): ?>
                  <strong style="color: #ef4444; font-size: 0.95rem;">₹<?= number_format($overdue_info['fine_amount'], 2) ?></strong>
                  <div style="font-size: 0.72rem; color: #94a3b8;">₹<?= number_format(FINE_PER_DAY, 2) ?>/day</div>
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

<?php require __DIR__ . '/../includes/footer.php'; ?>
