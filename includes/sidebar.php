<?php
/**
 * Shared Application Sidebar Navigation
 * Adapts automatically to the logged-in user's role (Admin vs Student)
 */

if (!function_exists('is_logged_in')) {
    require_once __DIR__ . '/auth.php';
}

$user = current_user();
$conn = get_db_connection();
$current_page = $current_page ?? '';
$base_path = $base_path ?? '../';

// Fetch quick badge counts for Admin
$pending_requests_count = 0;
$overdue_count = 0;

if (is_admin()) {
    $res = $conn->query("SELECT COUNT(*) AS cnt FROM borrow_requests WHERE status = 'pending'");
    if ($res) {
        $pending_requests_count = $res->fetch_assoc()['cnt'];
    }
    $res = $conn->query("SELECT COUNT(*) AS cnt FROM issued_books WHERE status = 'issued' AND due_date < CURDATE()");
    if ($res) {
        $overdue_count = $res->fetch_assoc()['cnt'];
    }
} elseif (is_student()) {
    $user_id = $user['id'];
    $stmt = $conn->prepare("SELECT COUNT(*) AS cnt FROM issued_books WHERE user_id = ? AND status = 'issued' AND due_date < CURDATE()");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $overdue_count = $stmt->get_result()->fetch_assoc()['cnt'];
}
?>

<aside class="sidebar">
  <div class="sidebar-brand">
    <div class="brand-icon-gold">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
      </svg>
    </div>
    <div class="brand-title-group">
      <span class="brand-title">THE ARCHIVE</span>
      <span class="brand-sub">IIIT KOTA · DIGITAL LIBRARY</span>
    </div>
  </div>

  <div class="sidebar-user">
    <div class="user-avatar">
      <?= strtoupper(substr($user['full_name'] ?? 'U', 0, 1)) ?>
    </div>
    <div class="user-details">
      <div class="user-name" title="<?= e($user['full_name']) ?>"><?= e($user['full_name']) ?></div>
      <div class="user-role-badge"><?= strtoupper(e($user['role'])) ?> <?= !empty($user['student_id']) ? '• ' . e($user['student_id']) : '' ?></div>
    </div>
  </div>

  <nav class="sidebar-nav">
    <?php if (is_admin()): ?>
      <div class="nav-section-title">Overview</div>
      <a href="dashboard.php" class="sidebar-link <?= ($current_page === 'dashboard') ? 'active' : '' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        <span>Admin Dashboard</span>
      </a>

      <div class="nav-section-title">Book Management</div>
      <a href="manage_books.php" class="sidebar-link <?= ($current_page === 'manage_books') ? 'active' : '' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        <span>All Books Catalog</span>
      </a>
      <a href="add_book.php" class="sidebar-link <?= ($current_page === 'add_book') ? 'active' : '' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Add New Book</span>
      </a>

      <div class="nav-section-title">Circulation & Issues</div>
      <a href="borrow_requests.php" class="sidebar-link <?= ($current_page === 'borrow_requests') ? 'active' : '' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
        <span>Borrow Requests</span>
        <?php if ($pending_requests_count > 0): ?>
          <span class="badge badge-warning" style="margin-left: auto; font-size: 0.7rem; padding: 2px 7px;"><?= $pending_requests_count ?></span>
        <?php endif; ?>
      </a>
      <a href="issued_books.php" class="sidebar-link <?= ($current_page === 'issued_books') ? 'active' : '' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
        <span>Issued Books</span>
      </a>
      <a href="overdue_books.php" class="sidebar-link <?= ($current_page === 'overdue_books') ? 'active' : '' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span>Overdue Tracker</span>
        <?php if ($overdue_count > 0): ?>
          <span class="badge badge-danger" style="margin-left: auto; font-size: 0.7rem; padding: 2px 7px;"><?= $overdue_count ?></span>
        <?php endif; ?>
      </a>

      <div class="nav-section-title">Members & Logs</div>
      <a href="manage_students.php" class="sidebar-link <?= ($current_page === 'manage_students') ? 'active' : '' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        <span>Student Accounts</span>
      </a>
      <a href="transactions.php" class="sidebar-link <?= ($current_page === 'transactions') ? 'active' : '' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
        <span>Transaction History</span>
      </a>

    <?php else: /* STUDENT ROLE */ ?>
      <div class="nav-section-title">Student Portal</div>
      <a href="dashboard.php" class="sidebar-link <?= ($current_page === 'dashboard') ? 'active' : '' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        <span>My Dashboard</span>
      </a>
      <a href="books.php" class="sidebar-link <?= ($current_page === 'books') ? 'active' : '' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        <span>Browse Books</span>
      </a>
      <a href="my_books.php" class="sidebar-link <?= ($current_page === 'my_books') ? 'active' : '' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
        <span>My Borrowed Books</span>
        <?php if ($overdue_count > 0): ?>
          <span class="badge badge-danger" style="margin-left: auto; font-size: 0.7rem; padding: 2px 7px;">Overdue</span>
        <?php endif; ?>
      </a>
      <a href="borrow_history.php" class="sidebar-link <?= ($current_page === 'borrow_history') ? 'active' : '' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span>Borrowing History</span>
      </a>
      <a href="profile.php" class="sidebar-link <?= ($current_page === 'profile') ? 'active' : '' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span>My Profile</span>
      </a>
    <?php endif; ?>
  </nav>

  <div class="sidebar-footer">
    <a href="<?= $base_path ?>index.php" class="sidebar-link" target="_blank" title="Open Public Website">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
      <span>Public Portal</span>
    </a>
    <a href="<?= $base_path ?>logout.php" class="sidebar-link" style="color: #f87171;" onclick="return confirm('Are you sure you want to log out?');">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      <span>Sign Out</span>
    </a>
  </div>
</aside>
