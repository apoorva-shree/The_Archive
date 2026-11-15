<?php
/**
 * Manage Books Catalog (Admin)
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

require_admin();
$conn = get_db_connection();

// Categories for Filter Dropdown
$categories = [];
$cat_res = $conn->query("SELECT * FROM categories ORDER BY name ASC");
if ($cat_res) {
    while ($row = $cat_res->fetch_assoc()) {
        $categories[] = $row;
    }
}

// Search and Filter Handling
$search = trim($_GET['search'] ?? '');
$category_filter = (int)($_GET['category'] ?? 0);

$query = "SELECT b.*, c.name AS category_name 
          FROM books b 
          LEFT JOIN categories c ON b.category_id = c.id 
          WHERE 1=1";
$params = [];
$types = "";

if (!empty($search)) {
    $query .= " AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)";
    $like = "%" . $search . "%";
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $types .= "sss";
}

if ($category_filter > 0) {
    $query .= " AND b.category_id = ?";
    $params[] = $category_filter;
    $types .= "i";
}

$query .= " ORDER BY b.title ASC";

$stmt = $conn->prepare($query);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$books = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

$page_title = 'Manage Books';
$header_title = 'Library Book Catalog';
$header_subtitle = 'Search, inspect, update, and manage book inventories';
$current_page = 'manage_books';
$base_path = '../';

require __DIR__ . '/../includes/header.php';
?>

<!-- Search and Filter Bar -->
<div class="filter-bar">
  <form method="GET" action="manage_books.php" style="display: flex; gap: 12px; width: 100%; flex-wrap: wrap;">
    <div class="filter-input">
      <input 
        type="text" 
        name="search" 
        class="form-control" 
        placeholder="Search by title, author, or ISBN..." 
        value="<?= e($search) ?>"
      >
    </div>

    <div class="filter-select">
      <select name="category" class="form-control">
        <option value="0">All Categories</option>
        <?php foreach ($categories as $cat): ?>
          <option value="<?= $cat['id'] ?>" <?= ($category_filter === (int)$cat['id']) ? 'selected' : '' ?>>
            <?= e($cat['name']) ?>
          </option>
        <?php endforeach; ?>
      </select>
    </div>

    <button type="submit" class="btn btn-primary">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      Filter Books
    </button>

    <?php if (!empty($search) || $category_filter > 0): ?>
      <a href="manage_books.php" class="btn btn-secondary">Reset</a>
    <?php endif; ?>

    <div style="margin-left: auto;">
      <a href="add_book.php" class="btn btn-success">+ Add New Book</a>
    </div>
  </form>
</div>

<!-- Books Catalog Table -->
<div class="content-card">
  <div class="card-header">
    <h2>Book Repository (<?= count($books) ?> Total Found)</h2>
  </div>
  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Cover</th>
          <th>Book Information</th>
          <th>Category</th>
          <th>ISBN</th>
          <th>Stock Status</th>
          <th>Available / Total</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($books)): ?>
          <tr>
            <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
              No books matched your search query. Try broadening your criteria or <a href="add_book.php">add a new book</a>.
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($books as $b): ?>
            <?php
              $cover_path = '../assets/images/covers/default_book.svg';
              if (!empty($b['cover_image']) && file_exists(__DIR__ . '/../assets/images/covers/' . $b['cover_image'])) {
                  $cover_path = '../assets/images/covers/' . $b['cover_image'];
              }
            ?>
            <tr>
              <td style="width: 60px;">
                <img src="<?= e($cover_path) ?>" alt="Cover" style="width: 48px; height: 68px; object-fit: cover; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              </td>
              <td>
                <div style="font-weight: 700; font-size: 0.95rem; color: #0f172a;"><?= e($b['title']) ?></div>
                <div style="font-size: 0.82rem; color: #64748b;">by <?= e($b['author']) ?></div>
                <?php if (!empty($b['publisher'])): ?>
                  <div style="font-size: 0.78rem; color: #94a3b8;"><?= e($b['publisher']) ?> (<?= e($b['publication_year']) ?>)</div>
                <?php endif; ?>
              </td>
              <td>
                <span class="badge badge-neutral"><?= e($b['category_name']) ?></span>
              </td>
              <td><code><?= e($b['isbn']) ?></code></td>
              <td>
                <?php if ($b['available_copies'] == 0): ?>
                  <span class="badge badge-danger">Out of Stock</span>
                <?php elseif ($b['available_copies'] <= 2): ?>
                  <span class="badge badge-warning">Low Stock</span>
                <?php else: ?>
                  <span class="badge badge-success">In Stock</span>
                <?php endif; ?>
              </td>
              <td>
                <strong style="color: <?= $b['available_copies'] > 0 ? '#10b981' : '#ef4444' ?>;">
                  <?= $b['available_copies'] ?>
                </strong>
                / <?= $b['total_copies'] ?> copies
              </td>
              <td>
                <div style="display: flex; gap: 6px;">
                  <a href="edit_book.php?id=<?= $b['id'] ?>" class="btn btn-sm btn-secondary" title="Edit Book">
                    Edit
                  </a>
                  <a href="delete_book.php?id=<?= $b['id'] ?>" class="btn btn-sm btn-danger" onclick="return confirm('Are you sure you want to delete this book? This action cannot be undone.');" title="Delete Book">
                    Delete
                  </a>
                </div>
              </td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
