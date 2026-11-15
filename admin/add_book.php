<?php
/**
 * Add New Book (Admin)
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

require_admin();
$conn = get_db_connection();

// Fetch categories
$categories = [];
$cat_res = $conn->query("SELECT * FROM categories ORDER BY name ASC");
if ($cat_res) {
    while ($row = $cat_res->fetch_assoc()) {
        $categories[] = $row;
    }
}

$error = '';
$form = [
    'title' => '',
    'author' => '',
    'category_id' => 0,
    'isbn' => '',
    'publisher' => '',
    'publication_year' => date('Y'),
    'total_copies' => 1,
    'description' => ''
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = trim($_POST['title'] ?? '');
    $author = trim($_POST['author'] ?? '');
    $category_id = (int)($_POST['category_id'] ?? 0);
    $isbn = trim($_POST['isbn'] ?? '');
    $publisher = trim($_POST['publisher'] ?? '');
    $publication_year = (int)($_POST['publication_year'] ?? date('Y'));
    $total_copies = (int)($_POST['total_copies'] ?? 1);
    $description = trim($_POST['description'] ?? '');

    $form = [
        'title' => $title,
        'author' => $author,
        'category_id' => $category_id,
        'isbn' => $isbn,
        'publisher' => $publisher,
        'publication_year' => $publication_year,
        'total_copies' => $total_copies,
        'description' => $description
    ];

    // Validation
    if (empty($title) || empty($author) || $category_id <= 0 || empty($isbn)) {
        $error = 'Please fill in all mandatory fields (Title, Author, Category, and ISBN).';
    } elseif ($total_copies < 1) {
        $error = 'Total copies must be at least 1.';
    } else {
        // Check ISBN uniqueness
        $stmt = $conn->prepare("SELECT id FROM books WHERE isbn = ? LIMIT 1");
        $stmt->bind_param("s", $isbn);
        $stmt->execute();
        if ($stmt->get_result()->num_rows > 0) {
            $error = 'A book with this ISBN already exists in the catalog.';
        } else {
            // Handle optional cover image upload
            $cover_image = 'default_book.svg';
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

            $available_copies = $total_copies;

            $ins = $conn->prepare(
                "INSERT INTO books (isbn, title, author, category_id, publisher, publication_year, total_copies, available_copies, description, cover_image) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $ins->bind_param("sssisiiiss", $isbn, $title, $author, $category_id, $publisher, $publication_year, $total_copies, $available_copies, $description, $cover_image);

            if ($ins->execute()) {
                set_flash('success', "Book '{$title}' added successfully to the catalog.");
                header('Location: manage_books.php');
                exit();
            } else {
                $error = 'Database error while saving the book. Please try again.';
            }
        }
    }
}

$page_title = 'Add New Book';
$header_title = 'Add Book to Catalog';
$header_subtitle = 'Register a new academic title into the library management system';
$current_page = 'add_book';
$base_path = '../';

require __DIR__ . '/../includes/header.php';
?>

<div class="content-card" style="max-width: 800px; margin: 0 auto;">
  <div class="card-header">
    <h2>Book Information Form</h2>
    <a href="manage_books.php" class="btn btn-sm btn-secondary">&larr; Back to Catalog</a>
  </div>

  <div class="card-body">
    <?php if (!empty($error)): ?>
      <div class="alert alert-danger"><?= e($error) ?></div>
    <?php endif; ?>

    <form method="POST" action="add_book.php" enctype="multipart/form-data">
      <div class="form-group">
        <label class="form-label" for="title">Book Title <span class="required">*</span></label>
        <input 
          type="text" 
          id="title" 
          name="title" 
          class="form-control" 
          placeholder="e.g., Computer Networks: A Systems Approach" 
          value="<?= e($form['title']) ?>" 
          required 
          autofocus
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
            placeholder="e.g., Larry L. Peterson, Bruce S. Davie" 
            value="<?= e($form['author']) ?>" 
            required
          >
        </div>

        <div class="form-group">
          <label class="form-label" for="category_id">Academic Category <span class="required">*</span></label>
          <select id="category_id" name="category_id" class="form-control" required>
            <option value="0">-- Select Subject / Category --</option>
            <?php foreach ($categories as $cat): ?>
              <option value="<?= $cat['id'] ?>" <?= ($form['category_id'] === (int)$cat['id']) ? 'selected' : '' ?>>
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
            placeholder="e.g., 978-0123850591" 
            value="<?= e($form['isbn']) ?>" 
            required
          >
          <div class="form-help">Unique 10 or 13 digit International Standard Book Number.</div>
        </div>

        <div class="form-group">
          <label class="form-label" for="total_copies">Total Inventory Copies <span class="required">*</span></label>
          <input 
            type="number" 
            id="total_copies" 
            name="total_copies" 
            class="form-control" 
            min="1" 
            max="1000" 
            value="<?= (int)$form['total_copies'] ?>" 
            required
          >
          <div class="form-help">Number of physical book copies placed on shelves.</div>
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
            placeholder="e.g., Morgan Kaufmann" 
            value="<?= e($form['publisher']) ?>"
          >
        </div>

        <div class="form-group">
          <label class="form-label" for="publication_year">Year of Publication</label>
          <input 
            type="number" 
            id="publication_year" 
            name="publication_year" 
            class="form-control" 
            min="1800" 
            max="<?= date('Y') + 1 ?>" 
            value="<?= (int)$form['publication_year'] ?>"
          >
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="description">Book Summary / Syllabus Description</label>
        <textarea 
          id="description" 
          name="description" 
          class="form-control" 
          rows="4" 
          placeholder="Brief description of chapters, syllabus topics, and reference importance..."
        ><?= e($form['description']) ?></textarea>
      </div>

      <div class="form-group">
        <label class="form-label" for="cover_image">Book Cover Image (Optional)</label>
        <input 
          type="file" 
          id="cover_image" 
          name="cover_image" 
          class="form-control" 
          accept=".jpg,.jpeg,.png,.webp,.svg"
        >
        <div class="form-help">Accepted formats: JPG, PNG, WEBP, SVG. If left empty, a stylish default SVG cover will be assigned automatically.</div>
      </div>

      <div style="display: flex; gap: 12px; margin-top: 28px;">
        <button type="submit" class="btn btn-primary" style="padding: 11px 24px;">
          Save & Register Book
        </button>
        <a href="manage_books.php" class="btn btn-secondary" style="padding: 11px 24px;">
          Cancel
        </a>
      </div>
    </form>
  </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
