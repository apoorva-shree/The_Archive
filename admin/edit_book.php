<?php
/**
 * Edit Existing Book (Admin)
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

require_admin();
$conn = get_db_connection();

$book_id = (int)($_GET['id'] ?? 0);
if ($book_id <= 0) {
    set_flash('error', 'Invalid Book ID provided.');
    header('Location: manage_books.php');
    exit();
}

// Fetch existing book
$stmt = $conn->prepare("SELECT * FROM books WHERE id = ? LIMIT 1");
$stmt->bind_param("i", $book_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    set_flash('error', 'Book record not found.');
    header('Location: manage_books.php');
    exit();
}

$book = $result->fetch_assoc();

// Fetch categories
$categories = [];
$cat_res = $conn->query("SELECT * FROM categories ORDER BY name ASC");
if ($cat_res) {
    while ($row = $cat_res->fetch_assoc()) {
        $categories[] = $row;
    }
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = trim($_POST['title'] ?? '');
    $author = trim($_POST['author'] ?? '');
    $category_id = (int)($_POST['category_id'] ?? 0);
    $isbn = trim($_POST['isbn'] ?? '');
    $publisher = trim($_POST['publisher'] ?? '');
    $publication_year = (int)($_POST['publication_year'] ?? date('Y'));
    $total_copies = (int)($_POST['total_copies'] ?? 1);
    $description = trim($_POST['description'] ?? '');

    // Validation
    if (empty($title) || empty($author) || $category_id <= 0 || empty($isbn)) {
        $error = 'Please fill in all mandatory fields (Title, Author, Category, and ISBN).';
    } elseif ($total_copies < 1) {
        $error = 'Total copies must be at least 1.';
    } else {
        // Check ISBN uniqueness for other books
        $check_isbn = $conn->prepare("SELECT id FROM books WHERE isbn = ? AND id != ? LIMIT 1");
        $check_isbn->bind_param("si", $isbn, $book_id);
        $check_isbn->execute();
        if ($check_isbn->get_result()->num_rows > 0) {
            $error = 'Another book in the catalog already uses this ISBN.';
        } else {
            // Calculate adjusted available copies based on total copies change
            $diff = $total_copies - $book['total_copies'];
            $new_available = max(0, $book['available_copies'] + $diff);
            if ($new_available > $total_copies) {
                $new_available = $total_copies;
            }

            $cover_image = $book['cover_image'];
            // Handle new cover upload
            if (isset($_FILES['cover_image']) && $_FILES['cover_image']['error'] === UPLOAD_ERR_OK) {
                $file = $_FILES['cover_image'];
                $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                $allowed = ['jpg', 'jpeg', 'png', 'webp', 'svg'];

                if (in_array($ext, $allowed)) {
                    $new_filename = 'book_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
                    $target_dir = __DIR__ . '/../assets/images/covers/';
                    if (move_uploaded_file($file['tmp_name'], $target_dir . $new_filename)) {
                        $cover_image = $new_filename;
                    }
                }
            }

            $update_stmt = $conn->prepare(
                "UPDATE books SET 
                    isbn = ?, 
                    title = ?, 
                    author = ?, 
                    category_id = ?, 
                    publisher = ?, 
                    publication_year = ?, 
                    total_copies = ?, 
                    available_copies = ?, 
                    description = ?, 
                    cover_image = ? 
                 WHERE id = ?"
            );
            $update_stmt->bind_param("sssisiiissi", $isbn, $title, $author, $category_id, $publisher, $publication_year, $total_copies, $new_available, $description, $cover_image, $book_id);

            if ($update_stmt->execute()) {
                set_flash('success', "Book details for '{$title}' updated successfully.");
                header('Location: manage_books.php');
                exit();
            } else {
                $error = 'Database error while updating the book record.';
            }
        }
    }
}

$page_title = 'Edit Book: ' . $book['title'];
$header_title = 'Edit Book Information';
$header_subtitle = 'Update catalog metadata, copy quantities, and shelf availability';
$current_page = 'manage_books';
$base_path = '../';

require __DIR__ . '/../includes/header.php';

$cover_path = '../assets/images/covers/default_book.svg';
if (!empty($book['cover_image']) && file_exists(__DIR__ . '/../assets/images/covers/' . $book['cover_image'])) {
    $cover_path = '../assets/images/covers/' . $book['cover_image'];
}
?>

<div class="content-card" style="max-width: 800px; margin: 0 auto;">
  <div class="card-header">
    <h2>Edit Book #<?= $book['id'] ?></h2>
    <a href="manage_books.php" class="btn btn-sm btn-secondary">&larr; Back to Catalog</a>
  </div>

  <div class="card-body">
    <?php if (!empty($error)): ?>
      <div class="alert alert-danger"><?= e($error) ?></div>
    <?php endif; ?>

    <form method="POST" action="edit_book.php?id=<?= $book['id'] ?>" enctype="multipart/form-data">
      <div class="form-group">
        <label class="form-label" for="title">Book Title <span class="required">*</span></label>
        <input 
          type="text" 
          id="title" 
          name="title" 
          class="form-control" 
          value="<?= e($book['title']) ?>" 
          required
        >
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="author">Author(s) <span class="required">*</span></label>
          <input 
            type="text" 
            id="author" 
            name="author" 
            class="form-control" 
            value="<?= e($book['author']) ?>" 
            required
          >
        </div>

        <div class="form-group">
          <label class="form-label" for="category_id">Academic Category <span class="required">*</span></label>
          <select id="category_id" name="category_id" class="form-control" required>
            <?php foreach ($categories as $cat): ?>
              <option value="<?= $cat['id'] ?>" <?= ($book['category_id'] == $cat['id']) ? 'selected' : '' ?>>
                <?= e($cat['name']) ?>
              </option>
            <?php endforeach; ?>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="isbn">ISBN Identifier <span class="required">*</span></label>
          <input 
            type="text" 
            id="isbn" 
            name="isbn" 
            class="form-control" 
            value="<?= e($book['isbn']) ?>" 
            required
          >
        </div>

        <div class="form-group">
          <label class="form-label" for="total_copies">Total Copies <span class="required">*</span></label>
          <input 
            type="number" 
            id="total_copies" 
            name="total_copies" 
            class="form-control" 
            min="1" 
            value="<?= (int)$book['total_copies'] ?>" 
            required
          >
          <div class="form-help">Currently available: <strong><?= (int)$book['available_copies'] ?></strong> copies.</div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="publisher">Publisher</label>
          <input 
            type="text" 
            id="publisher" 
            name="publisher" 
            class="form-control" 
            value="<?= e($book['publisher']) ?>"
          >
        </div>

        <div class="form-group">
          <label class="form-label" for="publication_year">Year of Publication</label>
          <input 
            type="number" 
            id="publication_year" 
            name="publication_year" 
            class="form-control" 
            value="<?= (int)$book['publication_year'] ?>"
          >
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="description">Summary / Syllabus Description</label>
        <textarea 
          id="description" 
          name="description" 
          class="form-control" 
          rows="4"
        ><?= e($book['description']) ?></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Current Book Cover</label>
        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 12px;">
          <img src="<?= e($cover_path) ?>" alt="Cover" style="width: 70px; height: 100px; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
          <div>
            <label class="form-label" for="cover_image">Upload Replacement Cover Image</label>
            <input 
              type="file" 
              id="cover_image" 
              name="cover_image" 
              class="form-control" 
              accept=".jpg,.jpeg,.png,.webp,.svg"
            >
            <div class="form-help">Leave empty to keep the current cover image.</div>
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 12px; margin-top: 28px;">
        <button type="submit" class="btn btn-primary" style="padding: 11px 24px;">
          Update Book Record
        </button>
        <a href="manage_books.php" class="btn btn-secondary" style="padding: 11px 24px;">
          Cancel
        </a>
      </div>
    </form>
  </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
