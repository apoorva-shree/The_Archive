<?php
/**
 * Public Landing Page
 * Library Management System - B.Tech Web Dev Lab Evaluation
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';

$conn = get_db_connection();

// Dynamic Statistics Query
$total_books_count = 0;
$available_copies_count = 0;
$members_count = 0;
$categories_count = 0;

$res = $conn->query("SELECT SUM(total_copies) AS total_copies, SUM(available_copies) AS available_copies, COUNT(*) AS titles FROM books");
if ($res && $row = $res->fetch_assoc()) {
    $total_books_count = (int)$row['total_copies'];
    $available_copies_count = (int)$row['available_copies'];
    $total_titles_count = (int)$row['titles'];
}

$res = $conn->query("SELECT COUNT(*) AS total_students FROM users WHERE role = 'student'");
if ($res && $row = $res->fetch_assoc()) {
    $members_count = (int)$row['total_students'];
}

$res = $conn->query("SELECT COUNT(*) AS total_categories FROM categories");
if ($res && $row = $res->fetch_assoc()) {
    $categories_count = (int)$row['total_categories'];
}

// Fetch categories for category cards
$categories = [];
$res = $conn->query("SELECT * FROM categories ORDER BY id ASC LIMIT 6");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $categories[] = $row;
    }
}

// Fetch 8 featured books for catalog preview
$featured_books = [];
$sql = "SELECT b.*, c.name AS category_name 
        FROM books b 
        LEFT JOIN categories c ON b.category_id = c.id 
        ORDER BY b.id ASC 
        LIMIT 8";
$res = $conn->query($sql);
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $featured_books[] = $row;
    }
}

$page_title = "The Archive - Where Learning Goes Beyond Classrooms";
$is_app_layout = false;
$base_path = '';

require __DIR__ . '/includes/header.php';
?>

<!-- Public Navigation Bar -->
<header class="public-navbar">
  <div class="nav-container">
    <a href="index.php" class="brand-logo">
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
    </a>

    <ul class="nav-links">
      <li><a href="#about">About</a></li>
      <li><a href="#categories">Departments</a></li>
      <li><a href="#catalog">Featured Volumes</a></li>
      <li><a href="#features">Why The Archive</a></li>
    </ul>

    <div class="nav-actions">
      <?php if (is_logged_in()): ?>
        <?php if (is_admin()): ?>
          <a href="admin/dashboard.php" class="btn btn-gold">Admin Console &rarr;</a>
        <?php else: ?>
          <a href="student/dashboard.php" class="btn btn-gold">Student Dashboard &rarr;</a>
        <?php endif; ?>
      <?php else: ?>
        <a href="login.php" class="btn btn-outline">Sign In</a>
        <a href="register.php" class="btn btn-gold">Student Register</a>
      <?php endif; ?>
    </div>
  </div>
</header>

<!-- Hero Section -->
<section class="hero-section" id="about">
  <div class="hero-container">
    <div class="hero-content">
      <div class="hero-institution-badge">
        <span>&#9733;</span> IIIT KOTA · DIGITAL LIBRARY
      </div>
      <h1 class="hero-title">
        Where Learning Goes <span>Beyond Classrooms.</span>
      </h1>
      <p class="hero-desc">
        Your gateway to knowledge, discovery and academic excellence. Access research texts, syllabus volumes, and streamlined circulation tailored for IIIT Kota scholars.
      </p>

      <div class="hero-tags">
        <span class="tag-chip">Discover</span>
        <span class="tag-chip">Learn</span>
        <span class="tag-chip">Explore</span>
      </div>

      <div class="hero-cta">
        <a href="#catalog" class="btn btn-lg btn-gold">Explore Books</a>
        <?php if (!is_logged_in()): ?>
          <a href="register.php" class="btn btn-lg btn-outline">Create Student Account</a>
        <?php endif; ?>
      </div>

      <!-- Real-Time Dynamic Library Stats Banner -->
      <div class="hero-stats-banner">
        <div class="stat-item">
          <h3><?= number_format($total_books_count) ?>+</h3>
          <p>Total Book Volumes</p>
        </div>
        <div class="stat-item">
          <h3><?= number_format($available_copies_count) ?></h3>
          <p>Available on Shelves</p>
        </div>
        <div class="stat-item">
          <h3><?= number_format($members_count) ?>+</h3>
          <p>Enrolled Scholars</p>
        </div>
      </div>
    </div>

    <div class="hero-preview">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <span style="font-size: 0.82rem; font-weight: 700; color: #dfba66; text-transform: uppercase; letter-spacing: 1px;">IIIT Kota Circulation</span>
        <span class="badge badge-success">Digital Desk Online</span>
      </div>
      <div style="background: rgba(15, 27, 45, 0.65); padding: 18px; border-radius: 8px; border: 1px solid rgba(229, 225, 216, 0.12); margin-bottom: 14px;">
        <div style="font-weight: 700; color: #fff; margin-bottom: 4px;">Direct Borrow Reservations</div>
        <div style="font-size: 0.85rem; color: #cbd5e1;">Students can submit book borrow requests online. Instant verification and zero queue time at the circulation counter.</div>
      </div>
      <div style="background: rgba(15, 27, 45, 0.65); padding: 18px; border-radius: 8px; border: 1px solid rgba(229, 225, 216, 0.12); margin-bottom: 14px;">
        <div style="font-weight: 700; color: #fff; margin-bottom: 4px;">Automated Deadlines &amp; Ledger</div>
        <div style="font-size: 0.85rem; color: #cbd5e1;">Configured <?= LOAN_PERIOD_DAYS ?>-day loan periods with automated overdue detection and transparent daily fee accounting.</div>
      </div>
      <div style="text-align: center; margin-top: 18px;">
        <a href="login.php" class="btn btn-block btn-gold">Sign In to Request Books</a>
      </div>
    </div>
  </div>
</section>

<!-- Featured Categories Section -->
<section class="section" id="categories">
  <div class="section-header">
    <div class="section-tag">Academic Disciplines</div>
    <h2 class="section-title">Explore by Department & Subject</h2>
    <p class="section-desc">
      Our repository spans comprehensive collections curated across major engineering, science, computing, and humanities curricula.
    </p>
  </div>

  <div class="category-grid">
    <?php foreach ($categories as $cat): ?>
      <div class="category-card">
        <div class="category-icon">&#128214;</div>
        <h3><?= e($cat['name']) ?></h3>
        <p><?= e($cat['description']) ?></p>
        <div style="margin-top: 16px;">
          <a href="<?= is_logged_in() ? 'student/books.php?category=' . $cat['id'] : 'login.php' ?>" class="btn btn-sm btn-outline-primary">
            Browse Department &rarr;
          </a>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
</section>

<!-- Featured Books Catalog Preview -->
<section class="section" id="catalog" style="background: var(--bg-subtle); max-width: 100%; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);">
  <div style="max-width: 1200px; margin: 0 auto;">
    <div class="section-header">
      <div class="section-tag">Library Catalog</div>
      <h2 class="section-title">Featured Academic Volumes</h2>
      <p class="section-desc">
        Explore popular reference textbooks, lab manuals, and research foundations available for issue.
      </p>
    </div>

    <div class="book-grid">
      <?php foreach ($featured_books as $book): ?>
        <?php
          $cover_src = 'assets/images/covers/default_book.svg';
          if (!empty($book['cover_image']) && file_exists(__DIR__ . '/assets/images/covers/' . $book['cover_image'])) {
              $cover_src = 'assets/images/covers/' . $book['cover_image'];
          }
        ?>
        <div class="book-card">
          <div class="book-cover-wrap">
            <img src="<?= e($cover_src) ?>" alt="<?= e($book['title']) ?>" class="book-cover-img">
            <div class="book-badge-pos">
              <?php if ($book['available_copies'] > 0): ?>
                <span class="badge badge-success">Available (<?= $book['available_copies'] ?>)</span>
              <?php else: ?>
                <span class="badge badge-danger">Out of Stock</span>
              <?php endif; ?>
            </div>
          </div>
          <div class="book-content">
            <div class="book-category"><?= e($book['category_name']) ?></div>
            <h4 class="book-title" title="<?= e($book['title']) ?>"><?= e($book['title']) ?></h4>
            <div class="book-author">By <?= e($book['author']) ?></div>
            <div class="book-meta">
              <span class="copies-info">ISBN: <?= e(substr($book['isbn'], 0, 13)) ?></span>
              <a href="<?= is_logged_in() ? 'student/book_details.php?id=' . $book['id'] : 'login.php' ?>" class="btn btn-sm btn-outline-primary">
                Details
              </a>
            </div>
          </div>
        </div>
      <?php endforeach; ?>
    </div>

    <div style="text-align: center; margin-top: 40px;">
      <a href="<?= is_logged_in() ? 'student/books.php' : 'login.php' ?>" class="btn btn-lg btn-primary">
        View Entire Catalog in Portal &rarr;
      </a>
    </div>
  </div>
</section>

<!-- Why Choose Our Library Section -->
<section class="section" id="features">
  <div class="section-header">
    <div class="section-tag">Modern System Architecture</div>
    <h2 class="section-title">Why Choose Our Library Portal?</h2>
    <p class="section-desc">
      Engineered to replace manual register logs with automated, transparent, and accurate circulation workflows.
    </p>
  </div>

  <div class="features-grid">
    <div class="feature-box">
      <div style="font-size: 2rem; color: var(--blue-primary); margin-bottom: 8px;">&#9889;</div>
      <h4>Instant Book Requests</h4>
      <p>Students can check real-time stock and place borrowing requests with one click, eliminating physical counter congestion.</p>
    </div>

    <div class="feature-box">
      <div style="font-size: 2rem; color: var(--blue-primary); margin-bottom: 8px;">&#128197;</div>
      <h4>Smart Due Date Tracking</h4>
      <p>Automatic detection of active and overdue issues, calculating clear daily fines at <?= number_format(FINE_PER_DAY, 2) ?> per overdue day.</p>
    </div>

    <div class="feature-box">
      <div style="font-size: 2rem; color: var(--blue-primary); margin-bottom: 8px;">&#128274;</div>
      <h4>Role-Based Access Control</h4>
      <p>Dedicated Admin and Student workspaces secured with session authentication and modern password hashing.</p>
    </div>

    <div class="feature-box">
      <div style="font-size: 2rem; color: var(--blue-primary); margin-bottom: 8px;">&#128220;</div>
      <h4>Complete Audit Trail</h4>
      <p>Every borrow request, approval, issue, return, and fine calculation is permanently recorded in the transaction ledger.</p>
    </div>

    <div class="feature-box">
      <div style="font-size: 2rem; color: var(--blue-primary); margin-bottom: 8px;">&#128269;</div>
      <h4>Dynamic Search & Filter</h4>
      <p>Filter through titles, authors, and department categories with instantaneous server-side query processing.</p>
    </div>

    <div class="feature-box">
      <div style="font-size: 2rem; color: var(--blue-primary); margin-bottom: 8px;">&#128187;</div>
      <h4>Lightweight & Fast</h4>
      <p>Built with clean HTML5, native CSS3, Core PHP, and MySQL. Zero external bloat or third-party framework dependencies.</p>
    </div>
  </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
