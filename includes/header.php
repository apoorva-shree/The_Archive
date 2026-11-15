<?php
/**
 * Shared Application Header
 * Handles HTML boilerplate, assets, dashboard top-bar and flash messages
 */

if (!function_exists('is_logged_in')) {
    require_once __DIR__ . '/auth.php';
}

$page_title = isset($page_title) ? $page_title . ' - ' . APP_NAME : APP_NAME . ' - ' . APP_TAGLINE;
$base_path = $base_path ?? '';
$user = current_user();
$flash_messages = get_flash();
$is_app_layout = $is_app_layout ?? true; // True for admin/student dashboard, false for landing/login
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= e($page_title) ?></title>
  <link rel="stylesheet" href="<?= $base_path ?>assets/css/style.css">
  <meta name="theme-color" content="#0f172a">
</head>
<body>

<?php if ($is_app_layout): ?>
<div class="app-container">
  <?php require __DIR__ . '/sidebar.php'; ?>

  <div class="main-content">
    <header class="top-header">
      <div class="header-title-box">
        <h1><?= e($header_title ?? 'Dashboard') ?></h1>
        <p><?= e($header_subtitle ?? 'Welcome to ' . APP_NAME . ' Library System') ?></p>
      </div>

      <div class="header-actions">
        <span class="badge badge-info" style="font-size: 0.8rem; padding: 6px 12px;">
          <?= date('l, d M Y') ?>
        </span>
        <a href="<?= $base_path ?>logout.php" class="btn btn-sm btn-secondary" onclick="return confirm('Do you want to log out?');">
          Logout
        </a>
      </div>
    </header>

    <main class="page-body">
      <!-- Flash Notifications Display -->
      <?php if (!empty($flash_messages)): ?>
        <?php foreach ($flash_messages as $type => $message): ?>
          <div class="alert alert-<?= ($type === 'error') ? 'danger' : e($type) ?>">
            <strong><?= ($type === 'error') ? 'Error: ' : 'Notice: ' ?></strong> <?= e($message) ?>
          </div>
        <?php endforeach; ?>
      <?php endif; ?>
<?php endif; ?>
