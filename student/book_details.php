<?php
/**
 * Single Book Details & Borrow Request View (Student)
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

require_student();
$conn = get_db_connection();
$user = current_user();
$user_id = (int)$user['id'];

$book_id = (int)($_GET['id'] ?? 0);
if ($book_id <= 0) {
    set_flash('error', 'Invalid Book ID specified.');
    header('Location: books.php');
    exit();
}

// Fetch book record with category
$stmt = $conn->prepare(
    "SELECT b.*, c.name AS category_name, c.description AS category_desc 
     FROM books b 
     LEFT JOIN categories c ON b.category_id = c.id 
     WHERE b.id = ? 
     LIMIT 1"
);
$stmt->bind_param("i", $book_id);
$stmt->execute();
$book = $stmt->get_result()->fetch_assoc();

if (!$book) {
    set_flash('error', 'The requested book was not found in the catalog.');
    header('Location: books.php');
    exit();
}

// Check student eligibility for this specific book
$has_active_issue = false;
$chk_issue = $conn->prepare("SELECT id, due_date FROM issued_books WHERE user_id = ? AND book_id = ? AND status IN ('issued', 'overdue') LIMIT 1");
$chk_issue->bind_param("ii", $user_id, $book_id);
$chk_issue->execute();
$issue_res = $chk_issue->get_result();
if ($issue_res->num_rows > 0) {
    $has_active_issue = true;
    $active_issue_data = $issue_res->fetch_assoc();
}

$has_pending_request = false;
$chk_req = $conn->prepare("SELECT id, request_date FROM borrow_requests WHERE user_id = ? AND book_id = ? AND status = 'pending' LIMIT 1");
$chk_req->bind_param("ii", $user_id, $book_id);
$chk_req->execute();
$req_res = $chk_req->get_result();
if ($req_res->num_rows > 0) {
    $has_pending_request = true;
    $pending_req_data = $req_res->fetch_assoc();
}

$page_title = $book['title'];
$header_title = 'Book Details & Circulation';
$header_subtitle = 'Review syllabus references and submit borrowing requests';
$current_page = 'books';
$base_path = '../';

require __DIR__ . '/../includes/header.php';

$cover_path = '../assets/images/covers/default_book.svg';
if (!empty($book['cover_image']) && file_exists(__DIR__ . '/../assets/images/covers/' . $book['cover_image'])) {
    $cover_path = '../assets/images/covers/' . $book['cover_image'];
}
?>

<div style="margin-bottom: 20px;">
  <a href="books.php" class="btn btn-sm btn-secondary">&larr; Back to Catalog</a>
</div>

<div class="content-card">
  <div class="card-body">
    <div class="book-detail-grid">
      <!-- Left Column: Cover & Stock Badge -->
      <div>
        <img src="<?= e($cover_path) ?>" alt="<?= e($book['title']) ?>" class="detail-cover">
        <div style="text-align: center; margin-top: 16px;">
          <?php if ($book['available_copies'] > 0): ?>
            <span class="badge badge-success" style="font-size: 0.85rem; padding: 6px 14px;">
              &#10003; <?= $book['available_copies'] ?> of <?= $book['total_copies'] ?> Copies Available
            </span>
          <?php else: ?>
            <span class="badge badge-danger" style="font-size: 0.85rem; padding: 6px 14px;">
              &#10007; Currently Out of Stock
            </span>
          <?php endif; ?>
        </div>
      </div>

      <!-- Right Column: Metadata & Request Submission -->
      <div>
        <span class="badge badge-neutral" style="margin-bottom: 10px;"><?= e($book['category_name']) ?></span>
        <h1 style="font-size: 1.85rem; font-weight: 800; color: #0f172a; margin-bottom: 8px; line-height: 1.25;">
          <?= e($book['title']) ?>
        </h1>
        <div style="font-size: 1.1rem; color: #475569; margin-bottom: 20px;">
          By <strong><?= e($book['author']) ?></strong>
        </div>

        <!-- Metadata Spec Box -->
        <div class="detail-meta-list">
          <div class="meta-item">
            <strong>ISBN-10 / ISBN-13</strong>
            <span><?= e($book['isbn']) ?></span>
          </div>
          <div class="meta-item">
            <strong>Academic Subject</strong>
            <span><?= e($book['category_name']) ?></span>
          </div>
          <div class="meta-item">
            <strong>Publisher</strong>
            <span><?= e($book['publisher'] ?: 'Standard Academic Press') ?></span>
          </div>
          <div class="meta-item">
            <strong>Publication Year</strong>
            <span><?= e($book['publication_year'] ?: 'N/A') ?></span>
          </div>
          <div class="meta-item">
            <strong>Standard Loan Period</strong>
            <span><?= LOAN_PERIOD_DAYS ?> Days</span>
          </div>
          <div class="meta-item">
            <strong>Daily Overdue Fine</strong>
            <span>₹<?= number_format(FINE_PER_DAY, 2) ?> / Day</span>
          </div>
        </div>

        <h3 style="font-size: 1.1rem; margin: 24px 0 10px;">Synopsis & Syllabus Scope</h3>
        <p style="color: #475569; line-height: 1.7; font-size: 0.95rem; margin-bottom: 28px;">
          <?= nl2br(e($book['description'] ?: 'Comprehensive academic textbook covering fundamental principles, problem sets, and practical laboratory exercises suited for undergraduate degree examinations.')) ?>
        </p>

        <!-- Circulation & Borrow Action Box -->
        <div style="background: var(--bg-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 24px;">
          <h4 style="margin-bottom: 12px; color: #0f172a;">Borrowing Action</h4>

          <?php if ($has_active_issue): ?>
            <div class="alert alert-warning" style="margin-bottom: 0;">
              You currently hold an issued copy of this book (Due date: <strong><?= date('d M Y', strtotime($active_issue_data['due_date'])) ?></strong>). 
              Please return your current copy at the library counter before requesting another one.
            </div>

          <?php elseif ($has_pending_request): ?>
            <div class="alert alert-info" style="margin-bottom: 0;">
              You already submitted a borrow request (#BR-<?= $pending_req_data['id'] ?>) for this book on 
              <strong><?= date('d M Y', strtotime($pending_req_data['request_date'])) ?></strong>. 
              It is currently awaiting administrator approval.
            </div>

          <?php elseif ($book['available_copies'] <= 0): ?>
            <div class="alert alert-danger" style="margin-bottom: 0;">
              All copies of this volume are currently checked out by other students. 
              Please check back once copies are returned to library inventory.
            </div>

          <?php else: ?>
            <p style="font-size: 0.9rem; color: #64748b; margin-bottom: 16px;">
              Click below to place an official borrow request. Once approved by the library admin, 
              you can collect the physical copy from the central circulation desk.
            </p>
            <form method="POST" action="request_borrow.php">
              <input type="hidden" name="book_id" value="<?= $book['id'] ?>">
              <button type="submit" class="btn btn-primary btn-lg" onclick="return confirm('Do you want to submit a borrow request for this book?');">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                Request to Borrow This Book
              </button>
            </form>
          <?php endif; ?>
        </div>

      </div>
    </div>
  </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
