<?php
/**
 * Student Registration Page
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';

// Redirect if already logged in
if (is_logged_in()) {
    if (is_admin()) {
        header('Location: admin/dashboard.php');
    } else {
        header('Location: student/dashboard.php');
    }
    exit();
}

$conn = get_db_connection();
$error = '';
$form_data = [
    'full_name' => '',
    'student_id' => '',
    'email' => '',
    'phone' => ''
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $full_name  = trim($_POST['full_name'] ?? '');
    $student_id = trim($_POST['student_id'] ?? '');
    $email      = trim($_POST['email'] ?? '');
    $phone      = trim($_POST['phone'] ?? '');
    $password   = $_POST['password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';

    $form_data = [
        'full_name' => $full_name,
        'student_id' => $student_id,
        'email' => $email,
        'phone' => $phone
    ];

    // Form Validations
    if (empty($full_name) || empty($student_id) || empty($email) || empty($password) || empty($confirm_password)) {
        $error = 'Please fill in all mandatory fields.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Please enter a valid email address.';
    } elseif (strlen($password) < 6) {
        $error = 'Password must be at least 6 characters long.';
    } elseif ($password !== $confirm_password) {
        $error = 'Passwords do not match. Please verify and retype.';
    } else {
        // Check if email already exists
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        if ($stmt->get_result()->num_rows > 0) {
            $error = 'An account with this email address is already registered.';
        } else {
            // Check if Student ID already exists
            $stmt = $conn->prepare("SELECT id FROM users WHERE student_id_number = ? LIMIT 1");
            $stmt->bind_param("s", $student_id);
            $stmt->execute();
            if ($stmt->get_result()->num_rows > 0) {
                $error = 'A student with this Roll / Student ID Number is already registered.';
            } else {
                // Securely hash password
                $hashed_password = password_hash($password, PASSWORD_DEFAULT);
                $role = 'student';
                $status = 'active';

                $insert_stmt = $conn->prepare(
                    "INSERT INTO users (full_name, email, password, phone, student_id_number, role, status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)"
                );
                $insert_stmt->bind_param("sssssss", $full_name, $email, $hashed_password, $phone, $student_id, $role, $status);

                if ($insert_stmt->execute()) {
                    set_flash('success', 'Registration successful! You can now sign in with your credentials.');
                    header('Location: login.php');
                    exit();
                } else {
                    $error = 'Registration failed due to a database error. Please try again.';
                }
            }
        }
    }
}

$page_title = 'Student Registration';
$is_app_layout = false;
$base_path = '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= e($page_title) ?> - <?= APP_NAME ?></title>
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

<div class="auth-wrapper">
  <div class="auth-card" style="max-width: 520px;">
    <div class="auth-header">
      <div class="brand-icon-gold">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
      </div>
      <h1 class="auth-title">Create Scholar Account</h1>
      <p class="auth-subtitle" style="font-weight: 700; color: var(--gold-muted); text-transform: uppercase; letter-spacing: 1px; font-size: 0.75rem; margin-top: 2px;">THE ARCHIVE · IIIT KOTA</p>
      <p class="auth-subtitle" style="margin-top: 6px;">Register for digital circulation and book reservations</p>
    </div>

    <?php if (!empty($error)): ?>
      <div class="alert alert-danger">
        <?= e($error) ?>
      </div>
    <?php endif; ?>

    <form method="POST" action="register.php" autocomplete="off">
      <div class="form-group">
        <label class="form-label" for="full_name">Full Name <span class="required">*</span></label>
        <input 
          type="text" 
          id="full_name" 
          name="full_name" 
          class="form-control" 
          placeholder="e.g., Alex Johnson" 
          value="<?= e($form_data['full_name']) ?>" 
          required 
          autofocus
        >
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="student_id">Student / Roll ID <span class="required">*</span></label>
          <input 
            type="text" 
            id="student_id" 
            name="student_id" 
            class="form-control" 
            placeholder="e.g., CS2024050" 
            value="<?= e($form_data['student_id']) ?>" 
            required
          >
        </div>

        <div class="form-group">
          <label class="form-label" for="phone">Phone Number</label>
          <input 
            type="tel" 
            id="phone" 
            name="phone" 
            class="form-control" 
            placeholder="+91 9876543210" 
            value="<?= e($form_data['phone']) ?>"
          >
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="email">College Email Address <span class="required">*</span></label>
        <input 
          type="email" 
          id="email" 
          name="email" 
          class="form-control" 
          placeholder="e.g., alex.johnson@college.edu" 
          value="<?= e($form_data['email']) ?>" 
          required
        >
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="password">Password <span class="required">*</span></label>
          <input 
            type="password" 
            id="password" 
            name="password" 
            class="form-control" 
            placeholder="Min 6 characters" 
            required
          >
        </div>

        <div class="form-group">
          <label class="form-label" for="confirm_password">Confirm Password <span class="required">*</span></label>
          <input 
            type="password" 
            id="confirm_password" 
            name="confirm_password" 
            class="form-control" 
            placeholder="Retype password" 
            required
          >
        </div>
      </div>

      <button type="submit" class="btn btn-primary btn-block" style="padding: 12px; margin-top: 10px;">
        Complete Registration &rarr;
      </button>
    </form>

    <div class="auth-footer">
      <p>Already have an account? <a href="login.php">Sign In</a></p>
      <p style="margin-top: 8px;"><a href="index.php" style="color: #64748b;">&larr; Return to Public Website</a></p>
    </div>
  </div>
</div>

</body>
</html>
