<?php
/**
 * Manage Student Accounts (Admin)
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

require_admin();
$conn = get_db_connection();

// Handle Status Toggle (Active <-> Inactive)
if (isset($_GET['action']) && $_GET['action'] === 'toggle_status' && isset($_GET['id'])) {
    $student_id = (int)$_GET['id'];
    $stmt = $conn->prepare("SELECT status, full_name FROM users WHERE id = ? AND role = 'student' LIMIT 1");
    $stmt->bind_param("i", $student_id);
    $stmt->execute();
    $student = $stmt->get_result()->fetch_assoc();

    if ($student) {
        $new_status = ($student['status'] === 'active') ? 'inactive' : 'active';
        $up = $conn->prepare("UPDATE users SET status = ? WHERE id = ?");
        $up->bind_param("si", $new_status, $student_id);
        if ($up->execute()) {
            set_flash('success', "Student account status for '{$student['full_name']}' changed to " . strtoupper($new_status) . ".");
        }
    }
    header('Location: manage_students.php');
    exit();
}

// Search Filter
$search = trim($_GET['search'] ?? '');
$query = "SELECT u.*, 
            (SELECT COUNT(*) FROM issued_books ib WHERE ib.user_id = u.id AND ib.status IN ('issued', 'overdue')) AS active_issues,
            (SELECT COUNT(*) FROM borrow_requests br WHERE br.user_id = u.id AND br.status = 'pending') AS pending_requests
          FROM users u 
          WHERE u.role = 'student'";
$params = [];
$types = "";

if (!empty($search)) {
    $query .= " AND (u.full_name LIKE ? OR u.email LIKE ? OR u.student_id_number LIKE ?)";
    $like = "%" . $search . "%";
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $types .= "sss";
}

$query .= " ORDER BY u.created_at DESC";

$stmt = $conn->prepare($query);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$students = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

$page_title = 'Manage Students';
$header_title = 'Student Accounts Management';
$header_subtitle = 'View registered students, circulation privileges, and account status';
$current_page = 'manage_students';
$base_path = '../';

require __DIR__ . '/../includes/header.php';
?>

<!-- Search Bar -->
<div class="filter-bar">
  <form method="GET" action="manage_students.php" style="display: flex; gap: 12px; width: 100%; flex-wrap: wrap;">
    <div class="filter-input">
      <input 
        type="text" 
        name="search" 
        class="form-control" 
        placeholder="Search by student name, roll ID, or email..." 
        value="<?= e($search) ?>"
      >
    </div>

    <button type="submit" class="btn btn-primary">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      Search Students
    </button>

    <?php if (!empty($search)): ?>
      <a href="manage_students.php" class="btn btn-secondary">Reset</a>
    <?php endif; ?>
  </form>
</div>

<!-- Student Table -->
<div class="content-card">
  <div class="card-header">
    <h2>Registered Students (<?= count($students) ?> Total)</h2>
  </div>
  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Student Details</th>
          <th>Student / Roll ID</th>
          <th>Contact</th>
          <th>Active Loans</th>
          <th>Pending Requests</th>
          <th>Registered On</th>
          <th>Status</th>
          <th>Account Control</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($students)): ?>
          <tr>
            <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
              No student records matched the specified search criteria.
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($students as $s): ?>
            <tr>
              <td>
                <div style="font-weight: 700; color: #0f172a;"><?= e($s['full_name']) ?></div>
                <div style="font-size: 0.82rem; color: #64748b;"><?= e($s['email']) ?></div>
              </td>
              <td><code><?= e($s['student_id_number'] ?: 'N/A') ?></code></td>
              <td><?= e($s['phone'] ?: 'N/A') ?></td>
              <td>
                <?php if ($s['active_issues'] > 0): ?>
                  <span class="badge badge-warning"><?= $s['active_issues'] ?> Book(s) Held</span>
                <?php else: ?>
                  <span class="badge badge-neutral">0 Active</span>
                <?php endif; ?>
              </td>
              <td>
                <?php if ($s['pending_requests'] > 0): ?>
                  <span class="badge badge-info"><?= $s['pending_requests'] ?> Pending</span>
                <?php else: ?>
                  <span style="color: #94a3b8; font-size: 0.85rem;">None</span>
                <?php endif; ?>
              </td>
              <td><?= date('d M Y', strtotime($s['created_at'])) ?></td>
              <td>
                <?php if ($s['status'] === 'active'): ?>
                  <span class="badge badge-success">Active</span>
                <?php else: ?>
                  <span class="badge badge-danger">Deactivated</span>
                <?php endif; ?>
              </td>
              <td>
                <?php if ($s['status'] === 'active'): ?>
                  <a href="manage_students.php?action=toggle_status&id=<?= $s['id'] ?>" class="btn btn-sm btn-outline" style="color: #ef4444; border-color: #fca5a5;" onclick="return confirm('Suspend library privileges for this student?');">
                    Deactivate
                  </a>
                <?php else: ?>
                  <a href="manage_students.php?action=toggle_status&id=<?= $s['id'] ?>" class="btn btn-sm btn-success" onclick="return confirm('Reactivate library access for this student?');">
                    Activate
                  </a>
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
