/**
 * The Archive - Pure HTML5/CSS3 Server-Side Template-Engine-Less Renderer
 * Replaces EJS with native HTML string assembly and token replacement.
 * Strictly outputs pure HTML5/CSS3 with zero frontend JavaScript.
 */

const fs = require('fs');
const path = require('path');
const { FINE_PER_DAY } = require('./circulation');

const VIEWS_DIR = path.resolve(__dirname, '../../views');

/**
 * Centralized, secure HTML escaping function against Cross-Site Scripting (XSS).
 * Escapes &, <, >, ", and ' characters.
 * @param {*} value
 * @returns {string} Escaped HTML string
 */
function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  return str.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return char;
    }
  });
}

/**
 * Date formatting helpers
 */
function formatDate(d, options = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!d) return '';
  const dateObj = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  return dateObj.toLocaleDateString('en-GB', options);
}

function formatDateTime(d) {
  if (!d) return '';
  const dateObj = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  return dateObj.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateIso(d) {
  if (!d) return '';
  if (typeof d === 'string' && d.length >= 10) return d.substring(0, 10);
  const dateObj = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  return dateObj.toISOString().substring(0, 10);
}

/**
 * Read an HTML template file from the views directory.
 * @param {string} relativePath (e.g., 'partials/header.html' or 'admin/dashboard.html')
 * @returns {string} Raw HTML content
 */
function readTemplate(relativePath) {
  const normalized = relativePath.endsWith('.html') ? relativePath : `${relativePath}.html`;
  const fullPath = path.join(VIEWS_DIR, normalized);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`[htmlRenderer] Template file not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

/**
 * Replaces placeholders in an HTML template string.
 * Supports:
 * - `{{{key}}}` or `{{raw:key}}` for trusted, unescaped raw HTML fragments.
 * - `{{key}}` for auto-escaped user-supplied values.
 * @param {string} templateStr
 * @param {Object} data
 * @returns {string} Rendered HTML
 */
function replaceTokens(templateStr, data = {}) {
  if (!templateStr) return '';

  // 1. First replace raw / unescaped tokens: {{{key}}} or {{raw:key}}
  let result = templateStr.replace(/\{\{\{(.*?)\}\}\}/g, (match, key) => {
    const trimmed = key.trim();
    const val = getNestedValue(data, trimmed);
    return val !== undefined && val !== null ? String(val) : '';
  });

  result = result.replace(/\{\{raw:(.*?)\}\}/g, (match, key) => {
    const trimmed = key.trim();
    const val = getNestedValue(data, trimmed);
    return val !== undefined && val !== null ? String(val) : '';
  });

  // 2. Then replace standard escaped tokens: {{key}}
  result = result.replace(/\{\{(.*?)\}\}/g, (match, key) => {
    const trimmed = key.trim();
    const val = getNestedValue(data, trimmed);
    return escapeHtml(val);
  });

  return result;
}

/**
 * Safely access nested keys (e.g., 'user.full_name' or 'stats.totalTitles')
 * @param {Object} obj
 * @param {string} pathStr
 * @returns {*}
 */
function getNestedValue(obj, pathStr) {
  if (!obj) return '';
  const parts = pathStr.split('.');
  let curr = obj;
  for (const p of parts) {
    if (curr === null || curr === undefined) return '';
    curr = curr[p];
  }
  return curr;
}

/**
 * Render Flash Alert Boxes (Error, Success, Info, Warning)
 * @param {Object} flash
 * @returns {string} HTML alert elements
 */
function renderFlashAlerts(flash = {}) {
  if (!flash) return '';
  let html = '';

  if (flash.error) {
    html += `<div class="alert alert-danger"><strong>Error: </strong> ${escapeHtml(flash.error)}</div>`;
  }
  if (flash.success) {
    html += `<div class="alert alert-success"><strong>Notice: </strong> ${escapeHtml(flash.success)}</div>`;
  }
  if (flash.info) {
    html += `<div class="alert alert-info"><strong>Notice: </strong> ${escapeHtml(flash.info)}</div>`;
  }
  if (flash.warning) {
    html += `<div class="alert alert-warning"><strong>Warning: </strong> ${escapeHtml(flash.warning)}</div>`;
  }

  return html;
}

/**
 * Generate Navigation Items for the Sidebar
 * Strictly preserves all existing CSS classes, SVGs, and badge layouts.
 * Zero frontend JavaScript: pure standard HTML5 links.
 * @param {string} role ('admin' | 'student')
 * @param {string} currentPage
 * @param {number} pendingCount
 * @param {number} overdueCount
 * @returns {string} HTML navigation markup
 */
function renderNavItems(role, currentPage = '', pendingCount = 0, overdueCount = 0) {
  const page = currentPage || '';
  let html = '';

  if (role === 'admin') {
    html += `
      <div class="nav-section-title">Overview</div>
      <a href="/admin/dashboard" class="sidebar-link ${page === 'dashboard' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        <span>Admin Dashboard</span>
      </a>

      <div class="nav-section-title">Book Management</div>
      <a href="/admin/books" class="sidebar-link ${page === 'manage_books' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        <span>All Books Catalog</span>
      </a>
      <a href="/admin/books/add" class="sidebar-link ${page === 'add_book' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Add New Book</span>
      </a>

      <div class="nav-section-title">Circulation &amp; Issues</div>
      <a href="/admin/borrow-requests" class="sidebar-link ${page === 'borrow_requests' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
        <span>Borrow Requests</span>
        ${pendingCount > 0 ? `<span class="badge badge-warning" style="margin-left: auto; font-size: 0.7rem; padding: 2px 7px;">${pendingCount}</span>` : ''}
      </a>
      <a href="/admin/circulation/issued" class="sidebar-link ${page === 'issued_books' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
        <span>Issued Books</span>
      </a>
      <a href="/admin/circulation/overdue" class="sidebar-link ${page === 'overdue_books' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span>Overdue Tracker</span>
        ${overdueCount > 0 ? `<span class="badge badge-danger" style="margin-left: auto; font-size: 0.7rem; padding: 2px 7px;">${overdueCount}</span>` : ''}
      </a>

      <div class="nav-section-title">Members &amp; Logs</div>
      <a href="/admin/students" class="sidebar-link ${page === 'manage_students' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        <span>Student Accounts</span>
      </a>
      <a href="/admin/transactions" class="sidebar-link ${page === 'transactions' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
        <span>Transaction History</span>
      </a>
    `;
  } else {
    // Student Role Navigation
    html += `
      <div class="nav-section-title">Student Portal</div>
      <a href="/student/dashboard" class="sidebar-link ${page === 'dashboard' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        <span>My Dashboard</span>
      </a>
      <a href="/student/books" class="sidebar-link ${page === 'books' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        <span>Browse Books</span>
      </a>
      <a href="/student/my-loans" class="sidebar-link ${page === 'my_books' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
        <span>My Borrowed Books</span>
        ${overdueCount > 0 ? `<span class="badge badge-danger" style="margin-left: auto; font-size: 0.7rem; padding: 2px 7px;">Overdue</span>` : ''}
      </a>
      <a href="/student/loan-history" class="sidebar-link ${page === 'borrow_history' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span>Borrowing History</span>
      </a>
      <a href="/student/profile" class="sidebar-link ${page === 'profile' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span>My Profile</span>
      </a>
    `;
  }

  return html;
}

/**
 * Render Sidebar Partial
 * @param {Object} options
 * @returns {string} Rendered sidebar HTML
 */
function renderSidebar(options = {}) {
  const user = options.currentUser || {};
  const role = user.role || 'student';
  const fullName = user.full_name || 'User';
  const userInitial = (fullName ? fullName.charAt(0) : 'U').toUpperCase();
  const studentIdNumber = user.student_id_number || user.student_id || '';
  const userRoleBadge = `${(role || '').toUpperCase()} ${studentIdNumber ? '• ' + studentIdNumber : ''}`;

  const navItems = renderNavItems(
    role,
    options.currentPage,
    options.pendingRequestsCount || 0,
    options.overdueCount || 0
  );

  const sidebarTemplate = readTemplate('partials/sidebar.html');
  return replaceTokens(sidebarTemplate, {
    userInitial,
    userName: fullName,
    userRoleBadge,
    navItems
  });
}

/**
 * Render Public Footer HTML Fragment
 * @param {number} currentYear
 * @returns {string}
 */
function renderPublicFooter(currentYear) {
  return `
  <footer class="public-footer">
    <div class="footer-container">
      <div class="footer-col">
        <div class="brand-logo" style="margin-bottom: 14px;">
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
        <p style="font-size: 0.9rem; line-height: 1.6; color: #94a3b8; max-width: 320px;">
          Where learning goes beyond classrooms. Central academic digital library portal for IIIT Kota students and faculty.
        </p>
      </div>

      <div class="footer-col">
        <h4>Navigation</h4>
        <ul class="footer-links">
          <li><a href="/">Home</a></li>
          <li><a href="/#catalog">Book Catalog</a></li>
          <li><a href="/#categories">Featured Categories</a></li>
          <li><a href="/#features">About The Archive</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4>Portals</h4>
        <ul class="footer-links">
          <li><a href="/login">Student / Admin Login</a></li>
          <li><a href="/register">Student Registration</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4>Library Desk &amp; Support</h4>
        <p style="font-size: 0.88rem; line-height: 1.6; color: #94a3b8;">
          Monday – Saturday: 8:00 AM – 8:00 PM<br>
          Sunday: 10:00 AM – 4:00 PM<br>
          Email: <code>library@iiitkota.ac.in</code>
        </p>
      </div>
    </div>

    <div class="footer-bottom">
      <div>&copy; ${currentYear} THE ARCHIVE · IIIT KOTA DIGITAL LIBRARY.</div>
      <div>Designed with HTML5, CSS3, Express.js &amp; MySQL.</div>
    </div>
  </footer>`;
}

/**
 * Main Page Assembler Function
 * Handles full page rendering: header partial + view body + footer partial.
 * Supports standalone views (views that contain their own <!DOCTYPE html>).
 * @param {string} viewRelativePath (e.g., 'admin/dashboard.html' or 'login.html')
 * @param {Object} options
 * @returns {string} Full HTML document
 */
function renderPage(viewRelativePath, options = {}) {
  // If template is standalone (like login/register), render directly
  if (options.isStandalone) {
    const viewTemplate = readTemplate(viewRelativePath);
    return replaceTokens(viewTemplate, options);
  }

  const isAppLayout = options.isAppLayout !== undefined ? Boolean(options.isAppLayout) : true;
  const pageTitle = options.pageTitle || 'The Archive - Digital Library';
  const headerTitle = options.headerTitle || 'Dashboard';
  const headerSubtitle = options.headerSubtitle || 'Welcome to The Archive Digital Library System';

  const currentDateFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const flashAlerts = renderFlashAlerts(options.flash);

  // 1. Prepare Header Layout
  let layoutTop = '';
  if (isAppLayout) {
    const sidebarHtml = renderSidebar(options);
    layoutTop = `
<div class="app-container">
  ${sidebarHtml}

  <div class="main-content">
    <header class="top-header">
      <div class="header-title-box">
        <h1>${escapeHtml(headerTitle)}</h1>
        <p>${escapeHtml(headerSubtitle)}</p>
      </div>

      <div class="header-actions">
        <span class="badge badge-info" style="font-size: 0.8rem; padding: 6px 12px;">
          ${escapeHtml(currentDateFormatted)}
        </span>
        <a href="/logout" class="btn btn-sm btn-secondary">
          Logout
        </a>
      </div>
    </header>

    <main class="page-body">
      ${flashAlerts}
`;
  }

  const headerTemplate = readTemplate('partials/header.html');
  const headerHtml = replaceTokens(headerTemplate, {
    pageTitle,
    layoutTop
  });

  // 2. Prepare View Body
  const viewTemplate = readTemplate(viewRelativePath);
  const viewContentHtml = replaceTokens(viewTemplate, options);

  // 3. Prepare Footer Layout
  const currentYear = new Date().getFullYear();
  let layoutBottom = '';
  if (isAppLayout) {
    layoutBottom = `
    </main> <!-- end .page-body -->
  </div> <!-- end .main-content -->
</div> <!-- end .app-container -->
`;
  } else {
    layoutBottom = renderPublicFooter(currentYear);
  }

  const footerTemplate = readTemplate('partials/footer.html');
  const footerHtml = replaceTokens(footerTemplate, {
    layoutBottom
  });

  return `${headerHtml}\n${viewContentHtml}\n${footerHtml}`;
}

// =============================================================================
// VIEW BUILDER HELPERS FOR ALL 20 APPLICATION VIEWS
// =============================================================================

function buildLandingPageData(data, currentUser) {
  const stats = data.stats || {};
  const categories = data.categories || [];
  const featured_books = data.featured_books || [];

  let navActions = '';
  let heroRegisterBtn = '';
  let heroPreviewLink = '';
  let catalogViewAllLink = '';

  if (currentUser) {
    if (currentUser.role === 'admin') {
      navActions = '<a href="/admin/dashboard" class="btn btn-gold">Admin Console &rarr;</a>';
      heroPreviewLink = '<a href="/admin/dashboard" class="btn btn-block btn-gold">Go to Portal &rarr;</a>';
    } else {
      navActions = '<a href="/student/dashboard" class="btn btn-gold">Student Dashboard &rarr;</a>';
      heroPreviewLink = '<a href="/student/books" class="btn btn-block btn-gold">Go to Portal &rarr;</a>';
    }
    catalogViewAllLink = '<a href="/student/books" class="btn btn-lg btn-primary">View Entire Catalog in Portal &rarr;</a>';
  } else {
    navActions = '<a href="/login" class="btn btn-outline">Sign In</a>\n<a href="/register" class="btn btn-gold">Student Register</a>';
    heroRegisterBtn = '<a href="/register" class="btn btn-lg btn-outline">Create Student Account</a>';
    heroPreviewLink = '<a href="/login" class="btn btn-block btn-gold">Sign In to Request Books</a>';
    catalogViewAllLink = '<a href="/login" class="btn btn-lg btn-primary">View Entire Catalog in Portal &rarr;</a>';
  }

  const categoryCards = categories.map(cat => `
    <div class="category-card">
      <div class="category-icon">&#128214;</div>
      <h3>${escapeHtml(cat.name)}</h3>
      <p>${escapeHtml(cat.description)}</p>
      <div style="margin-top: 16px;">
        <a href="${currentUser ? `/student/books?category=${cat.id}` : '/login'}" class="btn btn-sm btn-outline-primary">
          Browse Department &rarr;
        </a>
      </div>
    </div>
  `).join('\n');

  const featuredBooksCards = featured_books.map(book => {
    let coverSrc = '/assets/images/covers/default_book.svg';
    if (book.cover_image) {
      coverSrc = '/assets/images/covers/' + encodeURIComponent(book.cover_image);
    }
    const stockBadge = (book.available_copies > 0)
      ? `<span class="badge badge-success">Available (${escapeHtml(book.available_copies)})</span>`
      : '<span class="badge badge-danger">Out of Stock</span>';
    const detailUrl = currentUser ? `/student/books/${book.id}` : '/login';

    return `
      <div class="book-card">
        <div class="book-cover-wrap">
          <img src="${coverSrc}" alt="${escapeHtml(book.title)}" class="book-cover-img">
          <div class="book-badge-pos">
            ${stockBadge}
          </div>
        </div>
        <div class="book-content">
          <div class="book-category">${escapeHtml(book.category_name || '')}</div>
          <h4 class="book-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</h4>
          <div class="book-author">By ${escapeHtml(book.author)}</div>
          <div class="book-meta">
            <span class="copies-info">ISBN: ${escapeHtml((book.isbn || '').substring(0, 13))}</span>
            <a href="${detailUrl}" class="btn btn-sm btn-outline-primary">
              Details
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('\n');

  return {
    isAppLayout: false,
    pageTitle: 'Where Learning Goes Beyond Classrooms',
    currentUser,
    navActions,
    heroRegisterBtn,
    stats: {
      total_books_count: (stats.total_books_count || 0).toLocaleString(),
      available_copies_count: (stats.available_copies_count || 0).toLocaleString(),
      members_count: (stats.members_count || 0).toLocaleString()
    },
    FINE_PER_DAY: (typeof data.FINE_PER_DAY !== 'undefined' ? data.FINE_PER_DAY : Number(FINE_PER_DAY).toFixed(2)),
    heroPreviewLink,
    categoryCards,
    featuredBooksCards,
    catalogViewAllLink
  };
}

function buildLoginData(data) {
  const noticeAlert = data.notice ? `<div class="alert alert-success">${escapeHtml(data.notice)}</div>` : '';
  const errorAlert = data.error ? `<div class="alert alert-danger">${escapeHtml(data.error)}</div>` : '';
  const flashAlerts = renderFlashAlerts(data.flash);

  return {
    isStandalone: true,
    page_title: data.page_title || 'Account Login',
    email_input: data.email_input || '',
    noticeAlert,
    errorAlert,
    flashAlerts
  };
}

function buildRegisterData(data) {
  const errorAlert = data.error ? `<div class="alert alert-danger">${escapeHtml(data.error)}</div>` : '';
  const flashAlerts = renderFlashAlerts(data.flash);
  const formData = data.form_data || {};

  return {
    isStandalone: true,
    page_title: data.page_title || 'Student Registration',
    form_data: {
      full_name: formData.full_name || '',
      student_id: formData.student_id || '',
      phone: formData.phone || '',
      email: formData.email || ''
    },
    errorAlert,
    flashAlerts
  };
}

function buildStudentDashboardData(data, currentUser) {
  const metrics = data.metrics || {};
  const activeBooks = data.active_books || [];
  const myRequests = data.my_requests || [];

  let activeBooksRows = '';
  if (activeBooks.length === 0) {
    activeBooksRows = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 36px; color: #64748b;">
          You currently have no books checked out from the central library.
        </td>
      </tr>
    `;
  } else {
    activeBooksRows = activeBooks.map(b => {
      const coverSrc = b.cover_image ? `/assets/images/covers/${encodeURIComponent(b.cover_image)}` : '/assets/images/covers/default_book.svg';
      const isOverdue = (new Date(b.due_date).getTime() < new Date().setHours(0, 0, 0, 0));
      const daysLeft = Math.ceil((new Date(b.due_date).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
      const statusBadge = isOverdue
        ? '<span class="badge badge-danger">Overdue</span>'
        : '<span class="badge badge-success">Active Loan</span>';
      const daysHtml = isOverdue
        ? `<strong style="color: #ef4444;">${Math.abs(daysLeft)} days late</strong>`
        : `<span style="color: #10b981; font-weight: 600;">${daysLeft} days left</span>`;

      return `
        <tr>
          <td style="width: 50px;">
            <img src="${coverSrc}" alt="Cover" style="width: 44px; height: 60px; object-fit: cover; border-radius: 4px;">
          </td>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHtml(b.title)}</div>
            <div style="font-size: 0.8rem; color: #64748b;">by ${escapeHtml(b.author)}</div>
            <div style="font-size: 0.75rem; color: #94a3b8;">ISBN: ${escapeHtml(b.isbn)}</div>
          </td>
          <td><span class="badge badge-neutral">${escapeHtml(b.category_name || '')}</span></td>
          <td>${formatDate(b.issue_date)}</td>
          <td>
            <div style="font-weight: 700;">${formatDate(b.due_date)}</div>
          </td>
          <td>${statusBadge}</td>
          <td>${daysHtml}</td>
        </tr>
      `;
    }).join('\n');
  }

  let myRequestsRows = '';
  if (myRequests.length === 0) {
    myRequestsRows = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 24px; color: #64748b;">
          You have not submitted any borrow requests recently.
        </td>
      </tr>
    `;
  } else {
    myRequestsRows = myRequests.map(r => {
      let statusBadge = '';
      if (r.status === 'pending') {
        statusBadge = '<span class="badge badge-warning">Awaiting Review</span>';
      } else if (r.status === 'approved') {
        statusBadge = '<span class="badge badge-success">Approved</span>';
      } else {
        statusBadge = '<span class="badge badge-danger">Declined</span>';
      }

      return `
        <tr>
          <td><strong>#BR-${escapeHtml(r.id)}</strong></td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(r.title)}</div>
            <div style="font-size: 0.78rem; color: #64748b;">by ${escapeHtml(r.author)}</div>
          </td>
          <td>${formatDateTime(r.request_date)}</td>
          <td>${statusBadge}</td>
          <td style="font-size: 0.82rem; color: #64748b;">
            ${escapeHtml(r.admin_notes || '—')}
          </td>
        </tr>
      `;
    }).join('\n');
  }

  return {
    isAppLayout: true,
    currentPage: 'dashboard',
    pageTitle: 'Student Dashboard',
    headerTitle: `Welcome, ${currentUser ? currentUser.full_name : 'Student'}`,
    headerSubtitle: 'Your university library account summary and active reading portfolio',
    currentUser,
    metrics: {
      active_loans_count: metrics.active_loans_count || 0,
      pending_requests_count: metrics.pending_requests_count || 0,
      returned_count: metrics.returned_count || 0,
      overdue_count: metrics.overdue_count || 0
    },
    activeLoansCount: activeBooks.length,
    activeBooksRows,
    myRequestsCount: myRequests.length,
    myRequestsRows
  };
}

function buildStudentBooksData(data, currentUser) {
  const books = data.books || [];
  const categories = data.categories || [];
  const search = data.search || '';
  const categoryFilter = parseInt(data.categoryFilter, 10) || 0;

  const categoryOptions = categories.map(cat => `
    <option value="${cat.id}" ${categoryFilter === cat.id ? 'selected' : ''}>
      ${escapeHtml(cat.name)}
    </option>
  `).join('\n');

  const resetFilterBtn = (search || categoryFilter > 0)
    ? '<a href="/student/books" class="btn btn-secondary">Reset Filter</a>'
    : '';

  let booksGridContent = '';
  if (books.length === 0) {
    booksGridContent = `
      <div class="content-card">
        <div class="empty-state">
          <div class="empty-state-icon">&#128218;</div>
          <h3>No Books Found</h3>
          <p>We couldn't find any books matching your query. Try searching with different keywords or choosing a different subject category.</p>
          <a href="/student/books" class="btn btn-primary">Browse All Books</a>
        </div>
      </div>
    `;
  } else {
    const cards = books.map(b => {
      const coverPath = b.cover_image ? `/assets/images/covers/${encodeURIComponent(b.cover_image)}` : '/assets/images/covers/default_book.svg';
      const stockBadge = (b.available_copies > 0)
        ? `<span class="badge badge-success">${b.available_copies} Available</span>`
        : '<span class="badge badge-danger">Out of Stock</span>';

      return `
        <div class="book-card">
          <div class="book-cover-wrap">
            <img src="${coverPath}" alt="${escapeHtml(b.title)}" class="book-cover-img">
            <div class="book-badge-pos">
              ${stockBadge}
            </div>
          </div>
          <div class="book-content">
            <div class="book-category">${escapeHtml(b.category_name || '')}</div>
            <h4 class="book-title" title="${escapeHtml(b.title)}">${escapeHtml(b.title)}</h4>
            <div class="book-author">By ${escapeHtml(b.author)}</div>
            <div class="book-meta">
              <span class="copies-info">ISBN: ${escapeHtml((b.isbn || '').substring(0, 13))}</span>
              <a href="/student/books/${b.id}" class="btn btn-sm btn-outline-primary">
                View &amp; Borrow &rarr;
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('\n');

    booksGridContent = `<div class="book-grid">${cards}</div>`;
  }

  return {
    isAppLayout: true,
    currentPage: 'books',
    pageTitle: 'Browse Library Books',
    headerTitle: 'University Library Catalog',
    headerSubtitle: 'Search and browse academic volumes available for borrow request',
    currentUser,
    search,
    categoryOptions,
    resetFilterBtn,
    booksCount: books.length,
    booksGridContent
  };
}

function buildStudentBookDetailsData(data, currentUser) {
  const book = data.book || {};
  const userBorrowStatus = data.userBorrowStatus || {};
  const coverPath = book.cover_image ? `/assets/images/covers/${encodeURIComponent(book.cover_image)}` : '/assets/images/covers/default_book.svg';

  const stockBadge = (book.available_copies > 0)
    ? `<span class="badge badge-success" style="font-size: 0.85rem; padding: 6px 14px;">&#10003; ${book.available_copies} of ${book.total_copies} Copies Available</span>`
    : '<span class="badge badge-danger" style="font-size: 0.85rem; padding: 6px 14px;">&#10007; Currently Out of Stock</span>';

  let borrowActionBox = '';
  if (userBorrowStatus.hasActiveIssue) {
    const dueFormatted = formatDate(userBorrowStatus.activeIssue && userBorrowStatus.activeIssue.due_date);
    borrowActionBox = `
      <div class="alert alert-info" style="margin-bottom: 0;">
        <strong>Active Circulation:</strong> You currently have an active borrowed copy of this book on loan (Due: ${dueFormatted}). Please return your current copy before submitting another reservation.
      </div>
    `;
  } else if (userBorrowStatus.hasPendingRequest) {
    borrowActionBox = `
      <div class="alert alert-warning" style="margin-bottom: 0;">
        <strong>Request Under Review:</strong> You already have a pending borrow request submitted for this book. The central library staff will process it shortly.
      </div>
    `;
  } else if (book.available_copies <= 0) {
    borrowActionBox = `
      <div class="alert alert-danger" style="margin-bottom: 0;">
        <strong>Inventory Notice:</strong> All copies of this book are currently on loan. Please check back when books are returned to shelves.
      </div>
    `;
  } else {
    borrowActionBox = `
      <form method="POST" action="/student/borrow-requests">
        <input type="hidden" name="book_id" value="${book.id}">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
          <div>
            <div style="font-weight: 700; color: #0f172a;">Reserve This Book Online</div>
            <div style="font-size: 0.85rem; color: #64748b;">14-day loan period upon administrator collection approval.</div>
          </div>
          <button type="submit" class="btn btn-primary btn-lg">
            Submit Borrow Request &rarr;
          </button>
        </div>
      </form>
    `;
  }

  return {
    isAppLayout: true,
    currentPage: 'books',
    pageTitle: book.title,
    headerTitle: 'Book Details & Circulation',
    headerSubtitle: 'Review syllabus references and submit borrowing requests',
    currentUser,
    book,
    coverPath,
    stockBadge,
    borrowActionBox
  };
}

function buildStudentMyLoansData(data, currentUser) {
  const activeLoans = data.activeLoans || [];
  const totalActiveFines = parseFloat(data.totalActiveFines) || 0;

  const overdueNotice = (totalActiveFines > 0)
    ? `<div class="alert alert-danger"><strong>Overdue Notice:</strong> You currently have an accumulated overdue fine of <strong>₹${totalActiveFines.toFixed(2)}</strong>. Please return your overdue books immediately to prevent further fine accrual.</div>`
    : '';

  let activeLoansRows = '';
  if (activeLoans.length === 0) {
    activeLoansRows = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 48px; color: #64748b;">
          <div style="font-size: 2rem; margin-bottom: 8px;">&#128218;</div>
          <p>You have no books currently on loan.</p>
          <a href="/student/books" class="btn btn-primary btn-sm" style="margin-top: 10px;">Browse Catalog</a>
        </td>
      </tr>
    `;
  } else {
    activeLoansRows = activeLoans.map(loan => {
      const coverSrc = loan.cover_image ? `/assets/images/covers/${encodeURIComponent(loan.cover_image)}` : '/assets/images/covers/default_book.svg';
      const daysLeft = Math.ceil((new Date(loan.due_date).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
      const statusBadge = loan.is_overdue
        ? '<span class="badge badge-danger">Overdue</span>'
        : '<span class="badge badge-success">Active Loan</span>';
      const dueInfo = loan.is_overdue
        ? `<div style="color: #ef4444; font-size: 0.78rem; font-weight: 700;">${loan.days_overdue} days past due!</div>`
        : `<div style="color: #10b981; font-size: 0.78rem;">${daysLeft} days remaining</div>`;
      const fineInfo = loan.is_overdue
        ? `<strong style="color: #ef4444; font-size: 0.95rem;">₹${(loan.accrued_fine || 0).toFixed(2)}</strong><div style="font-size: 0.72rem; color: #94a3b8;">₹5.00/day</div>`
        : '<span style="color: #10b981; font-weight: 600;">₹0.00</span>';

      return `
        <tr>
          <td style="width: 50px;">
            <img src="${coverSrc}" alt="Cover" style="width: 44px; height: 60px; object-fit: cover; border-radius: 4px;">
          </td>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHtml(loan.title)}</div>
            <div style="font-size: 0.8rem; color: #64748b;">by ${escapeHtml(loan.author)}</div>
            <div style="font-size: 0.75rem; color: #94a3b8;">ISBN: ${escapeHtml(loan.isbn)}</div>
          </td>
          <td><span class="badge badge-neutral">${escapeHtml(loan.category_name || '')}</span></td>
          <td>${formatDate(loan.issue_date)}</td>
          <td>
            <div style="font-weight: 700;">${formatDate(loan.due_date)}</div>
            ${dueInfo}
          </td>
          <td>${statusBadge}</td>
          <td>${fineInfo}</td>
        </tr>
      `;
    }).join('\n');
  }

  return {
    isAppLayout: true,
    currentPage: 'my_books',
    pageTitle: 'My Borrowed Books',
    headerTitle: 'My Active Borrowed Books',
    headerSubtitle: 'Track your active book issues, return deadlines, and overdue fine status',
    currentUser,
    overdueCount: totalActiveFines > 0 ? 1 : 0,
    overdueNotice,
    activeLoansCount: activeLoans.length,
    activeLoansRows
  };
}

function buildStudentBorrowHistoryData(data, currentUser) {
  const pastLoans = data.pastLoans || [];
  const requestsHistory = data.requestsHistory || [];

  let pastLoansRows = '';
  if (pastLoans.length === 0) {
    pastLoansRows = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 36px; color: #64748b;">
          You have not returned any books yet.
        </td>
      </tr>
    `;
  } else {
    pastLoansRows = pastLoans.map(book => {
      const fineAmount = parseFloat(book.fine_amount) || 0;
      const fineHtml = fineAmount > 0
        ? `<span style="color: #ef4444; font-weight: 600;">₹${fineAmount.toFixed(2)}</span>`
        : '<span style="color: #10b981;">₹0.00 (On Time)</span>';

      return `
        <tr>
          <td><strong>#IB-${escapeHtml(book.id)}</strong></td>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHtml(book.title)}</div>
            <div style="font-size: 0.8rem; color: #64748b;">by ${escapeHtml(book.author)}</div>
          </td>
          <td><span class="badge badge-neutral">${escapeHtml(book.category_name || '')}</span></td>
          <td>${formatDate(book.issue_date)}</td>
          <td>${formatDate(book.due_date)}</td>
          <td>
            <strong style="color: #10b981;">
              ${book.return_date ? formatDate(book.return_date) : ''}
            </strong>
          </td>
          <td><span class="badge badge-success">Returned</span></td>
          <td>${fineHtml}</td>
        </tr>
      `;
    }).join('\n');
  }

  let requestsHistoryRows = '';
  if (requestsHistory.length === 0) {
    requestsHistoryRows = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 36px; color: #64748b;">
          No borrow requests found in your account history.
        </td>
      </tr>
    `;
  } else {
    requestsHistoryRows = requestsHistory.map(req => {
      let statusBadge = '';
      if (req.status === 'pending') {
        statusBadge = '<span class="badge badge-warning">Pending</span>';
      } else if (req.status === 'approved') {
        statusBadge = '<span class="badge badge-success">Approved</span>';
      } else {
        statusBadge = '<span class="badge badge-danger">Rejected</span>';
      }

      return `
        <tr>
          <td><strong>#BR-${escapeHtml(req.id)}</strong></td>
          <td style="font-weight: 600;">${escapeHtml(req.title)}</td>
          <td>${escapeHtml(req.author)}</td>
          <td><code>${escapeHtml(req.isbn)}</code></td>
          <td>${formatDateTime(req.request_date)}</td>
          <td>${statusBadge}</td>
          <td style="font-size: 0.85rem; color: #64748b;">
            ${escapeHtml(req.admin_notes || '—')}
          </td>
        </tr>
      `;
    }).join('\n');
  }

  return {
    isAppLayout: true,
    currentPage: 'borrow_history',
    pageTitle: 'Borrowing History',
    headerTitle: 'My Borrowing & Circulation History',
    headerSubtitle: 'Complete record of your past book loans, returns, and request approvals',
    currentUser,
    pastLoansCount: pastLoans.length,
    pastLoansRows,
    requestsHistoryCount: requestsHistory.length,
    requestsHistoryRows
  };
}

function buildStudentProfileData(data, currentUser) {
  const profile = data.profile || {};
  const profileErrorAlert = (data.error && data.formType === 'profile') ? `<div class="alert alert-danger">${escapeHtml(data.error)}</div>` : '';
  const passwordErrorAlert = (data.error && data.formType === 'password') ? `<div class="alert alert-danger">${escapeHtml(data.error)}</div>` : '';
  const createdDateFormatted = profile.created_at ? formatDateTime(profile.created_at) : '';

  return {
    isAppLayout: true,
    currentPage: 'profile',
    pageTitle: 'My Profile',
    headerTitle: 'Student Account Profile',
    headerSubtitle: 'View and update your registered library details and security credentials',
    currentUser,
    profileErrorAlert,
    passwordErrorAlert,
    createdDateFormatted,
    profile: {
      full_name: profile.full_name || '',
      student_id_number: profile.student_id_number || 'N/A',
      email: profile.email || '',
      phone: profile.phone || ''
    }
  };
}

function buildAdminDashboardData(data, currentUser) {
  const stats = data.stats || {};
  const recentRequests = data.recent_requests || [];
  const recentIssued = data.recent_issued || [];

  let recentRequestsRows = '';
  if (recentRequests.length === 0) {
    recentRequestsRows = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 24px; color: #64748b;">
          Zero pending borrow requests at this time.
        </td>
      </tr>
    `;
  } else {
    recentRequestsRows = recentRequests.map(req => {
      const stockBadge = req.available_copies > 0
        ? `<span class="badge badge-success">${req.available_copies} Left</span>`
        : '<span class="badge badge-danger">Out</span>';

      return `
        <tr>
          <td>
            <div style="font-weight: 600;">${escapeHtml(req.full_name)}</div>
            <div style="font-size: 0.78rem; color: #64748b;">${escapeHtml(req.student_id_number)}</div>
          </td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(req.title)}</div>
            <div style="font-size: 0.78rem; color: #64748b;">by ${escapeHtml(req.author)}</div>
          </td>
          <td>${stockBadge}</td>
          <td>
            <div style="display: flex; gap: 4px;">
              <a href="/admin/borrow-requests/${req.id}/approve" class="btn btn-sm btn-success" style="padding: 4px 8px; font-size: 0.75rem;">
                Approve
              </a>
              <a href="/admin/borrow-requests/${req.id}/reject" class="btn btn-sm btn-danger" style="padding: 4px 8px; font-size: 0.75rem;">
                Reject
              </a>
            </div>
          </td>
        </tr>
      `;
    }).join('\n');
  }

  let recentIssuedRows = '';
  if (recentIssued.length === 0) {
    recentIssuedRows = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 24px; color: #64748b;">
          No books currently on loan.
        </td>
      </tr>
    `;
  } else {
    recentIssuedRows = recentIssued.map(iss => {
      const issueDateStr = formatDateIso(iss.issue_date);
      const dueDateStr = formatDateIso(iss.due_date);

      return `
        <tr>
          <td>
            <div style="font-weight: 600;">${escapeHtml(iss.full_name)}</div>
            <div style="font-size: 0.78rem; color: #64748b;">${escapeHtml(iss.student_id_number)}</div>
          </td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(iss.title)}</div>
            <div style="font-size: 0.78rem; color: #64748b;">by ${escapeHtml(iss.author)}</div>
          </td>
          <td><span style="font-size: 0.85rem;">${issueDateStr}</span></td>
          <td><strong style="font-size: 0.85rem; color: #b45309;">${dueDateStr}</strong></td>
          <td>
            <a href="/admin/circulation/return/${iss.id}" class="btn btn-sm btn-primary" style="padding: 4px 8px; font-size: 0.75rem;">
              Return &rarr;
            </a>
          </td>
        </tr>
      `;
    }).join('\n');
  }

  return {
    isAppLayout: true,
    currentPage: 'dashboard',
    pageTitle: 'Admin Central Console',
    headerTitle: 'Administrator Central Console',
    headerSubtitle: 'Overview of library inventory, circulation activity, and member requests',
    currentUser,
    pendingRequestsCount: stats.pending_requests || 0,
    overdueCount: stats.overdue_count || 0,
    stats: {
      total_copies: (stats.total_copies || 0).toLocaleString(),
      total_titles: stats.total_titles || 0,
      available_copies: (stats.available_copies || 0).toLocaleString(),
      total_students: (stats.total_students || 0).toLocaleString(),
      currently_issued: (stats.currently_issued || 0).toLocaleString(),
      overdue_count: (stats.overdue_count || 0).toLocaleString(),
      pending_requests: (stats.pending_requests || 0).toLocaleString()
    },
    recentRequestsCount: recentRequests.length,
    recentRequestsRows,
    recentIssuedCount: recentIssued.length,
    recentIssuedRows
  };
}

function buildAdminManageBooksData(data, currentUser) {
  const books = data.books || [];
  const categories = data.categories || [];
  const search = data.search || '';
  const categoryFilter = parseInt(data.categoryFilter, 10) || 0;

  const categoryOptions = categories.map(cat => `
    <option value="${cat.id}" ${categoryFilter === cat.id ? 'selected' : ''}>
      ${escapeHtml(cat.name)}
    </option>
  `).join('\n');

  const resetFilterBtn = (search || categoryFilter > 0)
    ? '<a href="/admin/books" class="btn btn-secondary">Reset</a>'
    : '';

  let booksRows = '';
  if (books.length === 0) {
    booksRows = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
          No books matched your search query. Try broadening your criteria or <a href="/admin/books/add">add a new book</a>.
        </td>
      </tr>
    `;
  } else {
    booksRows = books.map(b => {
      const coverPath = b.cover_image ? `/assets/images/covers/${encodeURIComponent(b.cover_image)}` : '/assets/images/covers/default_book.svg';
      let stockBadge = '';
      if (b.available_copies === 0) {
        stockBadge = '<span class="badge badge-danger">Out of Stock</span>';
      } else if (b.available_copies <= 2) {
        stockBadge = '<span class="badge badge-warning">Low Stock</span>';
      } else {
        stockBadge = '<span class="badge badge-success">In Stock</span>';
      }

      const publisherLine = b.publisher ? `<div style="font-size: 0.78rem; color: #94a3b8;">${escapeHtml(b.publisher)} (${escapeHtml(b.publication_year)})</div>` : '';

      return `
        <tr>
          <td style="width: 60px;">
            <img src="${coverPath}" alt="Cover" style="width: 48px; height: 68px; object-fit: cover; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          </td>
          <td>
            <div style="font-weight: 700; font-size: 0.95rem; color: #0f172a;">${escapeHtml(b.title)}</div>
            <div style="font-size: 0.82rem; color: #64748b;">by ${escapeHtml(b.author)}</div>
            ${publisherLine}
          </td>
          <td>
            <span class="badge badge-neutral">${escapeHtml(b.category_name || '')}</span>
          </td>
          <td><code>${escapeHtml(b.isbn)}</code></td>
          <td>${stockBadge}</td>
          <td>
            <strong style="color: ${b.available_copies > 0 ? '#10b981' : '#ef4444'};">
              ${b.available_copies}
            </strong>
            / ${b.total_copies} copies
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
              <a href="/admin/books/${b.id}/edit" class="btn btn-sm btn-secondary" title="Edit Book">
                Edit
              </a>
              <form method="POST" action="/admin/books/${b.id}/delete" style="display: inline;">
                <button type="submit" class="btn btn-sm btn-danger" title="Delete Book">
                  Delete
                </button>
              </form>
            </div>
          </td>
        </tr>
      `;
    }).join('\n');
  }

  return {
    isAppLayout: true,
    currentPage: 'manage_books',
    pageTitle: 'Manage Books',
    headerTitle: 'Library Book Catalog',
    headerSubtitle: 'Search, inspect, update, and manage book inventories',
    currentUser,
    search,
    categoryOptions,
    resetFilterBtn,
    booksCount: books.length,
    booksRows
  };
}

function buildAdminAddBookData(data, currentUser) {
  const categories = data.categories || [];
  const form = data.form || {};
  const errorAlert = data.error ? `<div class="alert alert-danger">${escapeHtml(data.error)}</div>` : '';
  const currentYear = new Date().getFullYear();

  const categoryOptions = categories.map(cat => `
    <option value="${cat.id}" ${(form.category_id == cat.id) ? 'selected' : ''}>
      ${escapeHtml(cat.name)}
    </option>
  `).join('\n');

  return {
    isAppLayout: true,
    currentPage: 'add_book',
    pageTitle: 'Add New Book',
    headerTitle: 'Register New Library Volume',
    headerSubtitle: 'Add academic textbooks, lab manuals, and monographs to library inventory',
    currentUser,
    errorAlert,
    maxYear: currentYear + 1,
    form: {
      title: form.title || '',
      author: form.author || '',
      isbn: form.isbn || '',
      publisher: form.publisher || '',
      publication_year: form.publication_year || currentYear,
      total_copies: form.total_copies || 1,
      description: form.description || ''
    },
    categoryOptions
  };
}

function buildAdminEditBookData(data, currentUser) {
  const book = data.book || {};
  const categories = data.categories || [];
  const errorAlert = data.error ? `<div class="alert alert-danger">${escapeHtml(data.error)}</div>` : '';
  const currentYear = new Date().getFullYear();
  const coverPath = book.cover_image ? `/assets/images/covers/${encodeURIComponent(book.cover_image)}` : '/assets/images/covers/default_book.svg';

  const categoryOptions = categories.map(cat => `
    <option value="${cat.id}" ${(book.category_id == cat.id) ? 'selected' : ''}>
      ${escapeHtml(cat.name)}
    </option>
  `).join('\n');

  return {
    isAppLayout: true,
    currentPage: 'manage_books',
    pageTitle: `Edit Book: ${book.title}`,
    headerTitle: 'Edit Library Book Record',
    headerSubtitle: 'Update catalog details, ISBN, and adjust physical volume stock',
    currentUser,
    errorAlert,
    maxYear: currentYear + 1,
    book,
    coverPath,
    categoryOptions
  };
}

function buildAdminBorrowRequestsData(data, currentUser) {
  const requests = data.requests || [];
  const statusFilter = data.statusFilter || 'all';

  const filterTabs = `
    <a href="/admin/borrow-requests?status=all" class="btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}">
      All Requests
    </a>
    <a href="/admin/borrow-requests?status=pending" class="btn btn-sm ${statusFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}">
      Pending Review
    </a>
    <a href="/admin/borrow-requests?status=approved" class="btn btn-sm ${statusFilter === 'approved' ? 'btn-primary' : 'btn-secondary'}">
      Approved
    </a>
    <a href="/admin/borrow-requests?status=rejected" class="btn btn-sm ${statusFilter === 'rejected' ? 'btn-primary' : 'btn-secondary'}">
      Rejected
    </a>
  `;

  let requestsRows = '';
  if (requests.length === 0) {
    requestsRows = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
          No borrow requests found for this filter.
        </td>
      </tr>
    `;
  } else {
    requestsRows = requests.map(req => {
      const reqDate = req.request_date ? formatDateTime(req.request_date) : '';
      const stockBadge = req.available_copies > 0
        ? `<span class="badge badge-success">${req.available_copies} In Stock</span>`
        : '<span class="badge badge-danger">0 Available</span>';

      let statusBadge = '';
      if (req.status === 'pending') {
        statusBadge = '<span class="badge badge-warning">Pending</span>';
      } else if (req.status === 'approved') {
        statusBadge = '<span class="badge badge-success">Approved</span>';
      } else {
        statusBadge = '<span class="badge badge-danger">Rejected</span>';
      }

      let actionHtml = '';
      if (req.status === 'pending') {
        const approveBtn = req.available_copies > 0
          ? `<a href="/admin/borrow-requests/${req.id}/approve" class="btn btn-sm btn-success">Approve</a>`
          : '<button class="btn btn-sm btn-secondary" disabled title="Out of stock">No Stock</button>';
        actionHtml = `
          <div style="display: flex; gap: 6px;">
            ${approveBtn}
            <a href="/admin/borrow-requests/${req.id}/reject" class="btn btn-sm btn-danger">
              Reject
            </a>
          </div>
        `;
      } else {
        actionHtml = '<span style="color: #94a3b8; font-size: 0.85rem;">Completed</span>';
      }

      return `
        <tr>
          <td><strong>#BR-${escapeHtml(req.id)}</strong></td>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHtml(req.full_name)}</div>
            <div style="font-size: 0.8rem; color: #64748b;">${escapeHtml(req.student_id_number)}</div>
            <div style="font-size: 0.78rem; color: #94a3b8;">${escapeHtml(req.email)}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHtml(req.title)}</div>
            <div style="font-size: 0.8rem; color: #64748b;">by ${escapeHtml(req.author)}</div>
            <div style="font-size: 0.75rem; color: #94a3b8;">ISBN: ${escapeHtml(req.isbn)}</div>
          </td>
          <td>${reqDate}</td>
          <td>${stockBadge}</td>
          <td>${statusBadge}</td>
          <td style="font-size: 0.82rem; color: #64748b; max-width: 180px;">
            ${escapeHtml(req.admin_notes || '—')}
          </td>
          <td>${actionHtml}</td>
        </tr>
      `;
    }).join('\n');
  }

  return {
    isAppLayout: true,
    currentPage: 'borrow_requests',
    pageTitle: 'Borrow Requests',
    headerTitle: 'Student Borrow Requests',
    headerSubtitle: 'Review, approve, or reject book reservation requests from students',
    currentUser,
    filterTabs,
    requestsCount: requests.length,
    requestsRows
  };
}

function buildAdminIssuedBooksData(data, currentUser) {
  const issued = data.issued || [];
  const statusFilter = data.statusFilter || 'active';
  const search = data.search || '';

  const filterTabs = `
    <a href="/admin/circulation/issued?status=active" class="btn btn-sm ${statusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}">
      Active Loans
    </a>
    <a href="/admin/circulation/issued?status=overdue" class="btn btn-sm ${statusFilter === 'overdue' ? 'btn-danger' : 'btn-secondary'}">
      Overdue Only
    </a>
    <a href="/admin/circulation/issued?status=returned" class="btn btn-sm ${statusFilter === 'returned' ? 'btn-primary' : 'btn-secondary'}">
      Returned History
    </a>
    <a href="/admin/circulation/issued?status=all" class="btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}">
      All Records
    </a>
  `;

  let issuedRows = '';
  if (issued.length === 0) {
    issuedRows = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px; color: #64748b;">
          No records found for the selected circulation filter.
        </td>
      </tr>
    `;
  } else {
    issuedRows = issued.map(row => {
      const isActive = (row.status !== 'returned');
      const fineVal = isActive ? (row.calculated_fine || 0) : (parseFloat(row.fine_amount) || 0);

      const overdueSubtext = row.is_overdue
        ? `<div style="color: #ef4444; font-size: 0.78rem; font-weight: 700;">${row.days_overdue} days overdue</div>`
        : '';

      const returnDateText = row.return_date ? formatDate(row.return_date) : '<span style="color: #94a3b8;">Pending</span>';

      let statusBadge = '';
      if (!isActive) {
        statusBadge = '<span class="badge badge-neutral">Returned</span>';
      } else if (row.is_overdue) {
        statusBadge = '<span class="badge badge-danger">Overdue</span>';
      } else {
        statusBadge = '<span class="badge badge-success">Active Loan</span>';
      }

      const fineHtml = (fineVal > 0)
        ? `<strong style="color: #ef4444;">₹${fineVal.toFixed(2)}</strong>`
        : '<span style="color: #10b981;">₹0.00</span>';

      const actionHtml = isActive
        ? `<a href="/admin/circulation/return/${row.id}" class="btn btn-sm btn-primary">Process Return</a>`
        : '<span style="color: #94a3b8; font-size: 0.85rem;">Completed</span>';

      return `
        <tr>
          <td><strong>#IB-${escapeHtml(row.id)}</strong></td>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHtml(row.full_name)}</div>
            <div style="font-size: 0.8rem; color: #64748b;">${escapeHtml(row.student_id_number)}</div>
            <div style="font-size: 0.75rem; color: #94a3b8;">${escapeHtml(row.email)}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHtml(row.title)}</div>
            <div style="font-size: 0.8rem; color: #64748b;">by ${escapeHtml(row.author)}</div>
            <div style="font-size: 0.75rem; color: #94a3b8;">ISBN: ${escapeHtml(row.isbn)}</div>
          </td>
          <td>${formatDate(row.issue_date)}</td>
          <td>
            <strong>${formatDate(row.due_date)}</strong>
            ${overdueSubtext}
          </td>
          <td>${returnDateText}</td>
          <td>${statusBadge}</td>
          <td>${fineHtml}</td>
          <td>${actionHtml}</td>
        </tr>
      `;
    }).join('\n');
  }

  return {
    isAppLayout: true,
    currentPage: 'issued_books',
    pageTitle: 'Issued Books',
    headerTitle: 'Issued Books & Active Circulation',
    headerSubtitle: 'Monitor loan deadlines, track returns, and record fine payments',
    currentUser,
    filterTabs,
    search,
    statusFilter,
    issuedCount: issued.length,
    issuedRows
  };
}

function buildAdminIssueBookData(data, currentUser) {
  const students = data.students || [];
  const books = data.books || [];
  const errorAlert = data.error ? `<div class="alert alert-danger">${escapeHtml(data.error)}</div>` : '';
  const loanDays = data.loanDays || 14;

  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + loanDays);
  const calculatedDueDateFormatted = formatDate(defaultDueDate);

  const studentOptions = students.map(stu => `
    <option value="${stu.id}" ${data.selectedUserId === stu.id ? 'selected' : ''}>
      ${escapeHtml(stu.full_name)} (ID: ${escapeHtml(stu.student_id_number || 'N/A')}) - ${escapeHtml(stu.email)}
    </option>
  `).join('\n');

  const bookOptions = books.map(bk => `
    <option value="${bk.id}" ${data.selectedBookId === bk.id ? 'selected' : ''}>
      ${escapeHtml(bk.title)} (by ${escapeHtml(bk.author)}) - ${bk.available_copies} copies available
    </option>
  `).join('\n');

  return {
    isAppLayout: true,
    currentPage: 'issued_books',
    pageTitle: 'Issue Book to Student',
    headerTitle: 'Direct Book Circulation Desk',
    headerSubtitle: 'Issue a library volume directly to an active registered student',
    currentUser,
    errorAlert,
    loanDays,
    calculatedDueDateFormatted,
    studentOptions,
    bookOptions
  };
}

function buildAdminReturnBookData(data, currentUser) {
  const issue = data.issue || {};
  const errorAlert = data.error ? `<div class="alert alert-danger">${escapeHtml(data.error)}</div>` : '';
  const days_overdue = data.days_overdue || 0;
  const fine_amount = parseFloat(data.fine_amount) || 0;

  const phoneRow = issue.phone ? `<div style="font-size: 0.85rem; color: #64748b;">Phone: ${escapeHtml(issue.phone)}</div>` : '';
  const issueFormatted = formatDate(issue.issue_date);
  const dueFormatted = formatDate(issue.due_date);
  const todayFormatted = formatDate(new Date());

  const overdueSummaryText = (days_overdue > 0)
    ? `<div style="font-weight: 700; color: #0f172a;"><span style="color: #ef4444;">&#9888; Overdue by ${days_overdue} Days</span></div>`
    : '<div style="font-weight: 700; color: #0f172a;"><span style="color: #10b981;">&#10003; Returned On Time</span></div>';

  const fineCollectedCheckbox = (fine_amount > 0)
    ? `
      <div class="form-group" style="background: #fffbeb; border: 1px solid #fde68a; padding: 14px 18px; border-radius: 6px;">
        <label style="display: flex; align-items: center; gap: 10px; font-weight: 600; color: #92400e; cursor: pointer;">
          <input type="checkbox" name="fine_collected" value="1" checked style="width: 18px; height: 18px;">
          Fine of ₹${fine_amount.toFixed(2)} collected from student at library desk.
        </label>
      </div>
    `
    : '';

  return {
    isAppLayout: true,
    currentPage: 'issued_books',
    pageTitle: `Process Book Return: ${issue.title}`,
    headerTitle: 'Process Book Return',
    headerSubtitle: 'Record physical copy check-in, calculate fines, and restore library inventory',
    currentUser,
    issue,
    phoneRow,
    issueFormatted,
    dueFormatted,
    todayFormatted,
    overdueSummaryText,
    fineAmountFormatted: fine_amount.toFixed(2),
    fineColor: fine_amount > 0 ? '#ef4444' : '#10b981',
    fineCollectedCheckbox,
    errorAlert
  };
}

function buildAdminOverdueBooksData(data, currentUser) {
  const metrics = data.metrics || {};
  const overdueList = data.overdueList || [];

  let overdueRows = '';
  if (overdueList.length === 0) {
    overdueRows = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 48px; color: #10b981;">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">&#10003;</div>
          <h3 style="color: #0f172a; margin-bottom: 4px;">Zero Overdue Books!</h3>
          <p style="color: #64748b;">All students have returned books on time or their return dates are active.</p>
        </td>
      </tr>
    `;
  } else {
    overdueRows = overdueList.map(row => {
      const issueDate = formatDate(row.issue_date);
      const dueDate = formatDate(row.due_date);

      return `
        <tr>
          <td><strong>#IB-${escapeHtml(row.id)}</strong></td>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHtml(row.full_name)}</div>
            <div style="font-size: 0.8rem; color: #64748b;">Roll ID: ${escapeHtml(row.student_id_number)}</div>
          </td>
          <td>
            <div style="font-size: 0.85rem;"><a href="mailto:${escapeHtml(row.email)}">${escapeHtml(row.email)}</a></div>
            <div style="font-size: 0.8rem; color: #64748b;">${escapeHtml(row.phone || 'No Phone')}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHtml(row.title)}</div>
            <div style="font-size: 0.8rem; color: #64748b;">by ${escapeHtml(row.author)}</div>
            <div style="font-size: 0.75rem; color: #94a3b8;">ISBN: ${escapeHtml(row.isbn)}</div>
          </td>
          <td>${issueDate}</td>
          <td><strong style="color: #ef4444;">${dueDate}</strong></td>
          <td>
            <span class="badge badge-danger">
              ${row.days_overdue} days late
            </span>
          </td>
          <td>
            <strong style="color: #ef4444; font-size: 1rem;">₹${(row.calculated_fine || 0).toFixed(2)}</strong>
          </td>
          <td>
            <a href="/admin/circulation/return/${row.id}" class="btn btn-sm btn-primary">
              Process Return &rarr;
            </a>
          </td>
        </tr>
      `;
    }).join('\n');
  }

  return {
    isAppLayout: true,
    currentPage: 'overdue_books',
    pageTitle: 'Overdue Books Tracker',
    headerTitle: 'Overdue Books & Fine Management',
    headerSubtitle: 'Automated detection of overdue loans and defaulter tracking',
    currentUser,
    overdueCount: metrics.totalOverdueCount || overdueList.length,
    metrics: {
      totalOverdueCount: metrics.totalOverdueCount || 0,
      totalFinesAccumulated: (metrics.totalFinesAccumulated || 0).toFixed(2),
      maxDaysOverdue: metrics.maxDaysOverdue || 0,
      dailyFineRate: (metrics.dailyFineRate || 5).toFixed(2)
    },
    overdueRows
  };
}

function buildAdminTransactionsData(data, currentUser) {
  const transactions = data.transactions || [];
  const actionFilter = data.actionFilter || 'all';
  const search = data.search || '';

  const actionOptions = [
    { value: 'borrow_request', label: 'Borrow Requests' },
    { value: 'request_approved', label: 'Request Approvals' },
    { value: 'request_rejected', label: 'Request Rejections' },
    { value: 'book_issued', label: 'Books Issued' },
    { value: 'book_returned', label: 'Books Returned' }
  ].map(opt => `
    <option value="${opt.value}" ${actionFilter === opt.value ? 'selected' : ''}>
      ${opt.label}
    </option>
  `).join('\n');

  const resetFilterBtn = (actionFilter !== 'all' || search)
    ? '<a href="/admin/transactions" class="btn btn-secondary">Reset</a>'
    : '';

  let transactionRows = '';
  if (transactions.length === 0) {
    transactionRows = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: #64748b;">
          No transaction entries found matching the specified criteria.
        </td>
      </tr>
    `;
  } else {
    transactionRows = transactions.map(tx => {
      const txDate = tx.transaction_date ? new Date(tx.transaction_date) : null;
      const dateStr = txDate ? formatDate(txDate) : '';
      const timeStr = txDate ? txDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '';

      let badgeHtml = '';
      if (tx.action === 'borrow_request') {
        badgeHtml = '<span class="badge badge-info">Borrow Request</span>';
      } else if (tx.action === 'request_approved') {
        badgeHtml = '<span class="badge badge-success">Approved</span>';
      } else if (tx.action === 'request_rejected') {
        badgeHtml = '<span class="badge badge-danger">Rejected</span>';
      } else if (tx.action === 'book_issued') {
        badgeHtml = '<span class="badge badge-primary" style="background:#dbeafe; color:#1e40af; border:1px solid #93c5fd;">Book Issued</span>';
      } else if (tx.action === 'book_returned') {
        badgeHtml = '<span class="badge badge-success">Book Returned</span>';
      } else {
        badgeHtml = `<span class="badge badge-neutral">${escapeHtml(tx.action)}</span>`;
      }

      return `
        <tr>
          <td><code>#TX-${escapeHtml(tx.id)}</code></td>
          <td>
            <div style="font-weight: 600;">${dateStr}</div>
            <div style="font-size: 0.78rem; color: #64748b;">${timeStr}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHtml(tx.full_name)}</div>
            <div style="font-size: 0.8rem; color: #64748b;">${escapeHtml(tx.student_id_number)}</div>
          </td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(tx.title)}</div>
            <div style="font-size: 0.78rem; color: #64748b;">by ${escapeHtml(tx.author)}</div>
          </td>
          <td>${badgeHtml}</td>
          <td style="font-size: 0.82rem; color: #334155;">
            ${escapeHtml(tx.notes || '—')}
          </td>
        </tr>
      `;
    }).join('\n');
  }

  return {
    isAppLayout: true,
    currentPage: 'transactions',
    pageTitle: 'Transaction History',
    headerTitle: 'Circulation Transaction Ledger',
    headerSubtitle: 'Permanent audit log of all borrow requests, approvals, issues, and returns',
    currentUser,
    actionOptions,
    search,
    resetFilterBtn,
    transactionsCount: transactions.length,
    transactionRows
  };
}

function buildAdminManageStudentsData(data, currentUser) {
  const students = data.students || [];
  const search = data.search || '';

  const resetFilterBtn = search ? '<a href="/admin/students" class="btn btn-secondary">Reset</a>' : '';

  let studentRows = '';
  if (students.length === 0) {
    studentRows = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
          No student records matched the specified search criteria.
        </td>
      </tr>
    `;
  } else {
    studentRows = students.map(s => {
      const regDate = s.created_at ? formatDate(s.created_at) : '';

      const issuesBadge = s.active_issues > 0
        ? `<span class="badge badge-warning">${s.active_issues} Book(s) Held</span>`
        : '<span class="badge badge-neutral">0 Active</span>';

      const requestsBadge = s.pending_requests > 0
        ? `<span class="badge badge-info">${s.pending_requests} Pending</span>`
        : '<span style="color: #94a3b8; font-size: 0.85rem;">None</span>';

      const statusBadge = (s.status === 'active')
        ? '<span class="badge badge-success">Active</span>'
        : '<span class="badge badge-danger">Deactivated</span>';

      const toggleBtn = (s.status === 'active')
        ? '<button type="submit" class="btn btn-sm btn-outline" style="color: #ef4444; border-color: #fca5a5;">Deactivate</button>'
        : '<button type="submit" class="btn btn-sm btn-success">Activate</button>';

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHtml(s.full_name)}</div>
            <div style="font-size: 0.82rem; color: #64748b;">${escapeHtml(s.email)}</div>
          </td>
          <td><code>${escapeHtml(s.student_id_number || 'N/A')}</code></td>
          <td>${escapeHtml(s.phone || 'N/A')}</td>
          <td>${issuesBadge}</td>
          <td>${requestsBadge}</td>
          <td>${regDate}</td>
          <td>${statusBadge}</td>
          <td>
            <form method="POST" action="/admin/students/${s.id}/toggle-status" style="display: inline;">
              ${toggleBtn}
            </form>
          </td>
        </tr>
      `;
    }).join('\n');
  }

  return {
    isAppLayout: true,
    currentPage: 'manage_students',
    pageTitle: 'Manage Students',
    headerTitle: 'Student Accounts Management',
    headerSubtitle: 'View registered students, circulation privileges, and account status',
    currentUser,
    search,
    resetFilterBtn,
    studentsCount: students.length,
    studentRows
  };
}

/**
 * Universal View Dispatcher
 * Replaces res.render() across all Express routes.
 * Strictly generates pure HTML5/CSS3 with zero frontend JavaScript.
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {string} viewName (e.g. 'admin/dashboard' or 'login')
 * @param {Object} data Template context data
 */
function renderView(req, res, viewName, data = {}) {
  const currentUser = data.currentUser || (req && req.session && req.session.user) || null;
  const flash = data.flash || (res && res.locals && res.locals.flash) || (req && req.session && req.session.flash) || {};

  let viewData = { ...data, currentUser, flash };

  switch (viewName) {
    case 'index':
      viewData = { ...buildLandingPageData(data, currentUser), flash };
      break;
    case 'login':
      viewData = buildLoginData({ ...data, flash });
      break;
    case 'register':
      viewData = buildRegisterData({ ...data, flash });
      break;
    case 'student/dashboard':
      viewData = { ...buildStudentDashboardData(data, currentUser), flash };
      break;
    case 'student/books':
      viewData = { ...buildStudentBooksData(data, currentUser), flash };
      break;
    case 'student/book_details':
      viewData = { ...buildStudentBookDetailsData(data, currentUser), flash };
      break;
    case 'student/my_books':
      viewData = { ...buildStudentMyLoansData(data, currentUser), flash };
      break;
    case 'student/borrow_history':
      viewData = { ...buildStudentBorrowHistoryData(data, currentUser), flash };
      break;
    case 'student/profile':
      viewData = { ...buildStudentProfileData(data, currentUser), flash };
      break;
    case 'admin/dashboard':
      viewData = { ...buildAdminDashboardData(data, currentUser), flash };
      break;
    case 'admin/manage_books':
      viewData = { ...buildAdminManageBooksData(data, currentUser), flash };
      break;
    case 'admin/add_book':
      viewData = { ...buildAdminAddBookData(data, currentUser), flash };
      break;
    case 'admin/edit_book':
      viewData = { ...buildAdminEditBookData(data, currentUser), flash };
      break;
    case 'admin/borrow_requests':
      viewData = { ...buildAdminBorrowRequestsData(data, currentUser), flash };
      break;
    case 'admin/issued_books':
      viewData = { ...buildAdminIssuedBooksData(data, currentUser), flash };
      break;
    case 'admin/issue_book':
      viewData = { ...buildAdminIssueBookData(data, currentUser), flash };
      break;
    case 'admin/return_book':
      viewData = { ...buildAdminReturnBookData(data, currentUser), flash };
      break;
    case 'admin/overdue_books':
      viewData = { ...buildAdminOverdueBooksData(data, currentUser), flash };
      break;
    case 'admin/transactions':
      viewData = { ...buildAdminTransactionsData(data, currentUser), flash };
      break;
    case 'admin/manage_students':
      viewData = { ...buildAdminManageStudentsData(data, currentUser), flash };
      break;
    default:
      // Fallback: render template directly with passed data
      viewData = { ...data, currentUser, flash };
      break;
  }

  const html = renderPage(viewName, viewData);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
}

module.exports = {
  escapeHtml,
  readTemplate,
  replaceTokens,
  renderFlashAlerts,
  renderNavItems,
  renderSidebar,
  renderPage,
  renderView,
  VIEWS_DIR
};
