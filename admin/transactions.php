<?php
/**
 * Transaction Audit History & Circulation Log (Admin)
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

require_admin();
$conn = get_db_connection();

$action_filter = trim($_GET['action'] ?? 'all');
$search = trim($_GET['search'] ?? '');

$query = "SELECT t.*, u.full_name, u.student_id_number, u.email, b.title, b.author, b.isbn
          FROM transactions t
          JOIN users u ON t.user_id = u.id
          JOIN books b ON t.book_id = b.id
          WHERE 1=1";
$params = [];
$types = "";

$valid_actions = ['borrow_request', 'request_approved', 'request_rejected', 'book_issued', 'book_returned'];
if (in_array($action_filter, $valid_actions)) {
    $query .= " AND t.action = ?";
    $params[] = $action_filter;
    $types .= "s";
}

if (!empty($search)) {
    $query .= " AND (u.full_name LIKE ? OR u.student_id_number LIKE ? OR b.title LIKE ? OR t.notes LIKE ?)";
    $like = "%" . $search . "%";
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $types .= "ssss";
}

$query .= " ORDER BY t.transaction_date DESC";

$stmt = $conn->prepare($query);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$transactions = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

$page_title = 'Transaction History';
$header_title = 'Circulation Transaction Ledger';
$header_subtitle = 'Permanent audit log of all borrow requests, approvals, issues, and returns';
$current_page = 'transactions';
$base_path = '../';

require __DIR__ . '/../includes/header.php';
?>

<!-- Filter & Search Bar -->
<div class="filter-bar">
  <form method="GET" action="transactions.php" style="display: flex; gap: 12px; width: 100%; flex-wrap: wrap; align-items: center;">
    <div class="filter-select">
      <select name="action" class="form-control">
        <option value="all">All Action Types</option>
        <option value="borrow_request" <?= ($action_filter === 'borrow_request') ? 'selected' : '' ?>>Borrow Requests</option>
        <option value="request_approved" <?= ($action_filter === 'request_approved') ? 'selected' : '' ?>>Request Approvals</option>
        <option value="request_rejected" <?= ($action_filter === 'request_rejected') ? 'selected' : '' ?>>Request Rejections</option>
        <option value="book_issued" <?= ($action_filter === 'book_issued') ? 'selected' : '' ?>>Books Issued</option>
        <option value="book_returned" <?= ($action_filter === 'book_returned') ? 'selected' : '' ?>>Books Returned</option>
      </select>
    </div>

    <div class="filter-input">
      <input 
        type="text" 
        name="search" 
        class="form-control" 
        placeholder="Search by student, book, or keywords..." 
        value="<?= e($search) ?>"
      >
    </div>

    <button type="submit" class="btn btn-primary">Filter Ledger</button>

    <?php if ($action_filter !== 'all' || !empty($search)): ?>
      <a href="transactions.php" class="btn btn-secondary">Reset</a>
    <?php endif; ?>
  </form>
</div>

<!-- Transactions Table -->
<div class="content-card">
  <div class="card-header">
    <h2>Audit History (<?= count($transactions) ?> Events Logged)</h2>
  </div>
  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Log ID</th>
          <th>Timestamp</th>
          <th>Student Details</th>
          <th>Book Information</th>
          <th>Circulation Action</th>
          <th>Audit Remarks / Notes</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($transactions)): ?>
          <tr>
            <td colspan="6" style="text-align: center; padding: 40px; color: #64748b;">
              No transaction entries found matching the specified criteria.
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($transactions as $tx): ?>
            <tr>
              <td><code>#TX-<?= $tx['id'] ?></code></td>
              <td>
                <div style="font-weight: 600;"><?= date('d M Y', strtotime($tx['transaction_date'])) ?></div>
                <div style="font-size: 0.78rem; color: #64748b;"><?= date('h:i:s A', strtotime($tx['transaction_date'])) ?></div>
              </td>
              <td>
                <div style="font-weight: 700; color: #0f172a;"><?= e($tx['full_name']) ?></div>
                <div style="font-size: 0.8rem; color: #64748b;"><?= e($tx['student_id_number']) ?></div>
              </td>
              <td>
                <div style="font-weight: 600;"><?= e($tx['title']) ?></div>
                <div style="font-size: 0.78rem; color: #64748b;">by <?= e($tx['author']) ?></div>
              </td>
              <td>
                <?php
                  switch ($tx['action']) {
                      case 'borrow_request':
                          echo '<span class="badge badge-info">Borrow Request</span>';
                          break;
                      case 'request_approved':
                          echo '<span class="badge badge-success">Approved</span>';
                          break;
                      case 'request_rejected':
                          echo '<span class="badge badge-danger">Rejected</span>';
                          break;
                      case 'book_issued':
                          echo '<span class="badge badge-primary" style="background:#dbeafe; color:#1e40af; border:1px solid #93c5fd;">Book Issued</span>';
                          break;
                      case 'book_returned':
                          echo '<span class="badge badge-success">Book Returned</span>';
                          break;
                      default:
                          echo '<span class="badge badge-neutral">' . e($tx['action']) . '</span>';
                          break;
                  }
                ?>
              </td>
              <td style="font-size: 0.85rem; color: #475569; max-width: 300px;">
                <?= e($tx['notes']) ?>
              </td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
