<?php
/**
 * Student Books Catalog & Search
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

require_student();
$conn = get_db_connection();

// Fetch Categories for Filter Dropdown
$categories = [];
$cat_res = $conn->query("SELECT * FROM categories ORDER BY name ASC");
if ($cat_res) {
    while ($row = $cat_res->fetch_assoc()) {
        $categories[] = $row;
    }
}

// Search and Category Filter
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

$page_title = 'Browse Library Books';
$header_title = 'University Library Catalog';
$header_subtitle = 'Search and browse academic volumes available for borrow request';
$current_page = 'books';
$base_path = '../';

require __DIR__ . '/../includes/header.php';
?>

<!-- Search and Filter Bar -->
<div class="filter-bar">
  <form method="GET" action="books.php" style="display: flex; gap: 12px; width: 100%; flex-wrap: wrap;">
    <div class="filter-input">
      <input 
        type="text" 
        name="search" 
        class="form-control" 
        placeholder="Search books by title, author, or ISBN..." 
        value="<?= e($search) ?>"
      >
    </div>

    <div class="filter-select">
      <select name="category" class="form-control">
        <option value="0">All Disciplines & Categories</option>
        <?php foreach ($categories as $cat): ?>
          <option value="<?= $cat['id'] ?>" <?= ($category_filter === (int)$cat['id']) ? 'selected' : '' ?>>
            <?= e($cat['name']) ?>
          </option>
        <?php endforeach; ?>
      </select>
    </div>

    <button type="submit" class="btn btn-primary">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      Search Books
    </button>

    <?php if (!empty($search) || $category_filter > 0): ?>
      <a href="books.php" class="btn btn-secondary">Reset Filter</a>
    <?php endif; ?>
  </form>
</div>

<!-- Catalog Results Grid -->
<div style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
  <span style="font-weight: 600; color: #64748b; font-size: 0.9rem;">
    Showing <?= count($books) ?> book title(s)
  </span>
</div>

<?php if (empty($books)): ?>
  <div class="content-card">
    <div class="empty-state">
      <div class="empty-state-icon">&#128218;</div>
      <h3>No Books Found</h3>
      <p>We couldn't find any books matching your query. Try searching with different keywords or choosing a different subject category.</p>
      <a href="books.php" class="btn btn-primary">Browse All Books</a>
    </div>
  </div>
<?php else: ?>
  <div class="book-grid">
    <?php foreach ($books as $b): ?>
      <?php
        $cover_path = '../assets/images/covers/default_book.svg';
        if (!empty($b['cover_image']) && file_exists(__DIR__ . '/../assets/images/covers/' . $b['cover_image'])) {
            $cover_path = '../assets/images/covers/' . $b['cover_image'];
        }
      ?>
      <div class="book-card">
        <div class="book-cover-wrap">
          <img src="<?= e($cover_path) ?>" alt="<?= e($b['title']) ?>" class="book-cover-img">
          <div class="book-badge-pos">
            <?php if ($b['available_copies'] > 0): ?>
              <span class="badge badge-success"><?= $b['available_copies'] ?> Available</span>
            <?php else: ?>
              <span class="badge badge-danger">Out of Stock</span>
            <?php endif; ?>
          </div>
        </div>

        <div class="book-content">
          <div class="book-category"><?= e($b['category_name']) ?></div>
          <h4 class="book-title" title="<?= e($b['title']) ?>"><?= e($b['title']) ?></h4>
          <div class="book-author">By <?= e($b['author']) ?></div>
          <div class="book-meta">
            <span class="copies-info">ISBN: <?= e(substr($b['isbn'], 0, 13)) ?></span>
            <a href="book_details.php?id=<?= $b['id'] ?>" class="btn btn-sm btn-outline-primary">
              View &amp; Borrow &rarr;
            </a>
          </div>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
<?php endif; ?>

<?php require __DIR__ . '/../includes/footer.php'; ?>
