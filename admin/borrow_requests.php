<?php
/**
 * Manage Borrow Requests (Admin)
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

require_admin();
$conn = get_db_connection();

// 1. Handle Approval Action
if (isset($_GET['action']) && $_GET['action'] === 'approve' && isset($_GET['id'])) {
    $request_id = (int)$_GET['id'];

    // Fetch request details
    $stmt = $conn->prepare("SELECT br.*, b.title, b.available_copies, u.full_name 
                            FROM borrow_requests br
                            JOIN books b ON br.book_id = b.id
                            JOIN users u ON br.user_id = u.id
                            WHERE br.id = ? AND br.status = 'pending' 
                            LIMIT 1");
    $stmt->bind_param("i", $request_id);
    $stmt->execute();
    $req = $stmt->get_result()->fetch_assoc();

    if ($req) {
        if ($req['available_copies'] <= 0) {
            set_flash('error', "Cannot approve request: All copies of '{$req['title']}' are currently out of stock.");
        } else {
            // Begin Transaction
            $conn->begin_transaction();
            try {
                // a. Update request status to approved
                $admin_note = "Approved by Administrator on " . date('d M Y');
                $up_req = $conn->prepare("UPDATE borrow_requests SET status = 'approved', admin_notes = ? WHERE id = ?");
                $up_req->bind_param("si", $admin_note, $request_id);
                $up_req->execute();

                // b. Decrement available copies of the book
                $up_book = $conn->prepare("UPDATE books SET available_copies = available_copies - 1 WHERE id = ? AND available_copies > 0");
                $up_book->bind_param("i", $req['book_id']);
                $up_book->execute();

                // c. Create record in issued_books table
                $issue_date = date('Y-m-d');
                $due_date = date('Y-m-d', strtotime("+" . LOAN_PERIOD_DAYS . " days"));
                $ins_issue = $conn->prepare(
                    "INSERT INTO issued_books (borrow_request_id, user_id, book_id, issue_date, due_date, status, fine_amount) 
                     VALUES (?, ?, ?, ?, ?, 'issued', 0.00)"
                );
                $ins_issue->bind_param("iiiss", $request_id, $req['user_id'], $req['book_id'], $issue_date, $due_date);
                $ins_issue->execute();
                $issued_id = $conn->insert_id;

                // d. Log transactions
                $log_note = "Request #BR-{$request_id} approved. Book '{$req['title']}' issued to {$req['full_name']} (Due: {$due_date}).";
                $log_stmt = $conn->prepare("INSERT INTO transactions (user_id, book_id, issued_book_id, action, notes) VALUES (?, ?, ?, 'book_issued', ?)");
                $log_stmt->bind_param("iiis", $req['user_id'], $req['book_id'], $issued_id, $log_note);
                $log_stmt->execute();

                $conn->commit();
                set_flash('success', "Borrow request #BR-{$request_id} approved successfully! Book issued with due date: " . date('d M Y', strtotime($due_date)));
            } catch (Exception $e) {
                $conn->rollback();
                set_flash('error', 'Database error during approval: ' . $e->getMessage());
            }
        }
    } else {
        set_flash('error', 'Invalid or already processed borrow request.');
    }
    header('Location: borrow_requests.php');
    exit();
}

// 2. Handle Rejection Action
if (isset($_GET['action']) && $_GET['action'] === 'reject' && isset($_GET['id'])) {
    $request_id = (int)$_GET['id'];
    $reject_reason = trim($_GET['reason'] ?? 'Request declined by administrator (e.g. reserved or maintenance).');

    $stmt = $conn->prepare("SELECT br.*, b.title, u.full_name 
                            FROM borrow_requests br
                            JOIN books b ON br.book_id = b.id
                            JOIN users u ON br.user_id = u.id
                            WHERE br.id = ? AND br.status = 'pending' 
                            LIMIT 1");
    $stmt->bind_param("i", $request_id);
    $stmt->execute();
    $req = $stmt->get_result()->fetch_assoc();

    if ($req) {
        $up = $conn->prepare("UPDATE borrow_requests SET status = 'rejected', admin_notes = ? WHERE id = ?");
        $up->bind_param("si", $reject_reason, $request_id);
        if ($up->execute()) {
            // Log transaction
            $log_note = "Borrow request #BR-{$request_id} for '{$req['title']}' rejected by admin. Reason: {$reject_reason}";
            $log_stmt = $conn->prepare("INSERT INTO transactions (user_id, book_id, action, notes) VALUES (?, ?, 'request_rejected', ?)");
            $log_stmt->bind_param("iis", $req['user_id'], $req['book_id'], $log_note);
            $log_stmt->execute();

            set_flash('success', "Borrow request #BR-{$request_id} rejected.");
        }
    }
    header('Location: borrow_requests.php');
    exit();
}

// 3. Filter by Status
$status_filter = trim($_GET['status'] ?? 'all');
$valid_statuses = ['pending', 'approved', 'rejected'];

$query = "SELECT br.*, u.full_name, u.student_id_number, u.email, u.phone, b.title, b.author, b.isbn, b.available_copies
          FROM borrow_requests br
          JOIN users u ON br.user_id = u.id
          JOIN books b ON br.book_id = b.id
          WHERE 1=1";
$params = [];
$types = "";

if (in_array($status_filter, $valid_statuses)) {
    $query .= " AND br.status = ?";
    $params[] = $status_filter;
    $types .= "s";
}

$query .= " ORDER BY CASE WHEN br.status = 'pending' THEN 0 ELSE 1 END, br.request_date DESC";

$stmt = $conn->prepare($query);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$requests = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

$page_title = 'Borrow Requests';
$header_title = 'Student Borrow Requests';
$header_subtitle = 'Review, approve, or reject book reservation requests from students';
$current_page = 'borrow_requests';
$base_path = '../';

require __DIR__ . '/../includes/header.php';
?>

<!-- Filter Tabs -->
<div style="display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap;">
  <a href="borrow_requests.php" class="btn btn-sm <?= ($status_filter === 'all') ? 'btn-primary' : 'btn-secondary' ?>">
    All Requests
  </a>
  <a href="borrow_requests.php?status=pending" class="btn btn-sm <?= ($status_filter === 'pending') ? 'btn-primary' : 'btn-secondary' ?>">
    Pending Review
  </a>
  <a href="borrow_requests.php?status=approved" class="btn btn-sm <?= ($status_filter === 'approved') ? 'btn-primary' : 'btn-secondary' ?>">
    Approved
  </a>
  <a href="borrow_requests.php?status=rejected" class="btn btn-sm <?= ($status_filter === 'rejected') ? 'btn-primary' : 'btn-secondary' ?>">
    Rejected
  </a>
</div>

<div class="content-card">
  <div class="card-header">
    <h2>Circulation Request Ledger (<?= count($requests) ?> Total)</h2>
  </div>
  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Request ID</th>
          <th>Student Details</th>
          <th>Book Information</th>
          <th>Request Date</th>
          <th>Available Stock</th>
          <th>Status</th>
          <th>Admin Remarks</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($requests)): ?>
          <tr>
            <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
              No borrow requests found for this filter.
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($requests as $req): ?>
            <tr>
              <td><strong>#BR-<?= $req['id'] ?></strong></td>
              <td>
                <div style="font-weight: 700; color: #0f172a;"><?= e($req['full_name']) ?></div>
                <div style="font-size: 0.8rem; color: #64748b;"><?= e($req['student_id_number']) ?></div>
                <div style="font-size: 0.78rem; color: #94a3b8;"><?= e($req['email']) ?></div>
              </td>
              <td>
                <div style="font-weight: 700; color: #0f172a;"><?= e($req['title']) ?></div>
                <div style="font-size: 0.8rem; color: #64748b;">by <?= e($req['author']) ?></div>
                <div style="font-size: 0.75rem; color: #94a3b8;">ISBN: <?= e($req['isbn']) ?></div>
              </td>
              <td><?= date('d M Y, h:i A', strtotime($req['request_date'])) ?></td>
              <td>
                <?php if ($req['available_copies'] > 0): ?>
                  <span class="badge badge-success"><?= $req['available_copies'] ?> In Stock</span>
                <?php else: ?>
                  <span class="badge badge-danger">0 Available</span>
                <?php endif; ?>
              </td>
              <td>
                <?php if ($req['status'] === 'pending'): ?>
                  <span class="badge badge-warning">Pending</span>
                <?php elseif ($req['status'] === 'approved'): ?>
                  <span class="badge badge-success">Approved</span>
                <?php else: ?>
                  <span class="badge badge-danger">Rejected</span>
                <?php endif; ?>
              </td>
              <td style="font-size: 0.82rem; color: #64748b; max-width: 180px;">
                <?= e($req['admin_notes'] ?: '—') ?>
              </td>
              <td>
                <?php if ($req['status'] === 'pending'): ?>
                  <div style="display: flex; gap: 6px;">
                    <?php if ($req['available_copies'] > 0): ?>
                      <a href="borrow_requests.php?action=approve&id=<?= $req['id'] ?>" class="btn btn-sm btn-success" onclick="return confirm('Approve request and issue book copy for 14 days?');">
                        Approve
                      </a>
                    <?php else: ?>
                      <button class="btn btn-sm btn-secondary" disabled title="Out of stock">No Stock</button>
                    <?php endif; ?>
                    <a href="borrow_requests.php?action=reject&id=<?= $req['id'] ?>" class="btn btn-sm btn-danger" onclick="return confirm('Reject this request?');">
                      Reject
                    </a>
                  </div>
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
