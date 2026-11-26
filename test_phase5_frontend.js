/**
 * Phase 5 Comprehensive Frontend & Dashboard Integration Test Suite
 * Validates full HTML view rendering, navigation, legacy redirects,
 * student ownership, admin console, and UI state across all migrated pages.
 */

const { app, pool } = require('./server');

const BASE_URL = 'http://localhost:3000';

class WebClient {
  constructor(name) {
    this.name = name;
    this.cookie = null;
  }

  async get(path, options = {}) {
    return this.request(path, { method: 'GET', ...options });
  }

  async post(path, body = {}, options = {}) {
    const isUrlEncoded = !(body instanceof FormData);
    const headers = options.headers || {};
    let reqBody;

    if (isUrlEncoded) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      reqBody = new URLSearchParams(body).toString();
    } else {
      reqBody = body;
    }

    return this.request(path, {
      method: 'POST',
      headers,
      body: reqBody,
      ...options
    });
  }

  async request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = options.headers || {};

    if (this.cookie) {
      headers['Cookie'] = this.cookie;
    }

    const res = await fetch(url, {
      ...options,
      headers,
      redirect: options.redirect || 'manual' // default to manual to test 302s
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const parts = setCookie.split(';');
      this.cookie = parts[0];
    }

    const html = await res.text();
    return {
      status: res.status,
      headers: res.headers,
      location: res.headers.get('location'),
      html
    };
  }

  async login(email, password) {
    const res = await this.post('/login', { email, password });
    return res;
  }
}

async function runFrontendTests() {
  console.log('=====================================================');
  console.log('  STARTING PHASE 5 FRONTEND INTEGRATION TEST SUITE   ');
  console.log('=====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  [PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] Test ${total}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  const anonClient = new WebClient('Anonymous');
  const adminClient = new WebClient('Admin');
  const studentClient = new WebClient('Student');

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: PUBLIC LANDING PAGE & AUTHENTICATION FORMS
    // -------------------------------------------------------------------------
    console.log('\n--- Section 1: Public Landing Page & Auth Views ---');

    // Test 1: GET / (Public Landing Page)
    const homeRes = await anonClient.get('/');
    assert(homeRes.status === 200 &&
           homeRes.html.includes('Where Learning Goes') &&
           homeRes.html.includes('IIIT KOTA · DIGITAL LIBRARY') &&
           homeRes.html.includes('Academic Disciplines'),
           'GET / renders public landing page with Hero, Brand, and Departments.');

    // Test 2: GET /index.php (Legacy route compatibility)
    const indexPhpRes = await anonClient.get('/index.php');
    assert(indexPhpRes.status === 200 && indexPhpRes.html.includes('Featured Academic Volumes'),
           'GET /index.php serves the public landing page.');

    // Test 3: GET /login
    const loginRes = await anonClient.get('/login');
    assert(loginRes.status === 200 &&
           loginRes.html.includes('Sign in to your library management account') &&
           loginRes.html.includes('type="email"') &&
           loginRes.html.includes('type="password"'),
           'GET /login renders the authentication form.');

    // Test 4: GET /register
    const registerRes = await anonClient.get('/register');
    assert(registerRes.status === 200 &&
           registerRes.html.includes('Create Scholar Account') &&
           registerRes.html.includes('name="student_id"') &&
           registerRes.html.includes('name="phone"'),
           'GET /register renders student registration form.');

    // Test 5: Legacy PHP Auth redirects
    const loginPhp = await anonClient.get('/login.php');
    const registerPhp = await anonClient.get('/register.php');
    assert(loginPhp.status === 302 && loginPhp.location === '/login' &&
           registerPhp.status === 302 && registerPhp.location === '/register',
           'Legacy /login.php and /register.php redirect cleanly to /login and /register.');

    // -------------------------------------------------------------------------
    // SECTION 2: ADMIN AUTHENTICATION & CONSOLE DASHBOARD
    // -------------------------------------------------------------------------
    console.log('\n--- Section 2: Admin Dashboard & Overview ---');

    // Test 6: Admin login
    const adminLoginRes = await adminClient.login('admin@library.com', 'admin123');
    assert(adminLoginRes.status === 302 && adminLoginRes.location === '/admin/dashboard',
           'Admin login authenticates and redirects to /admin/dashboard.');

    // Test 7: GET /admin/dashboard
    const adminDashRes = await adminClient.get('/admin/dashboard');
    assert(adminDashRes.status === 200 &&
           adminDashRes.html.includes('Administrator Central Console') &&
           adminDashRes.html.includes('Total Book Volumes') &&
           adminDashRes.html.includes('Administrative Quick Actions') &&
           adminDashRes.html.includes('Recent Borrow Requests'),
           'GET /admin/dashboard renders admin dashboard with stats grid and tables.');

    // Test 8: Unauthenticated access to /admin/dashboard
    const anonAdminDash = await anonClient.get('/admin/dashboard');
    assert(anonAdminDash.status === 302 && anonAdminDash.location.includes('/login'),
           'Unauthenticated request to /admin/dashboard redirects to /login.');

    // -------------------------------------------------------------------------
    // SECTION 3: ADMIN BOOK MANAGEMENT (LIST, ADD, EDIT)
    // -------------------------------------------------------------------------
    console.log('\n--- Section 3: Admin Book Management Views ---');

    // Test 9: GET /admin/books
    const adminBooksRes = await adminClient.get('/admin/books');
    assert(adminBooksRes.status === 200 &&
           adminBooksRes.html.includes('Library Book Catalog') &&
           adminBooksRes.html.includes('Book Repository') &&
           adminBooksRes.html.includes('+ Add New Book'),
           'GET /admin/books renders books catalog management table.');

    // Test 10: GET /admin/books/add
    const addBookRes = await adminClient.get('/admin/books/add');
    assert(addBookRes.status === 200 &&
           addBookRes.html.includes('Register New Library Volume') &&
           addBookRes.html.includes('name="isbn"') &&
           addBookRes.html.includes('enctype="multipart/form-data"'),
           'GET /admin/books/add renders book registration form with multipart upload.');

    // Test 11: GET /admin/books/1/edit
    const editBookRes = await adminClient.get('/admin/books/1/edit');
    assert(editBookRes.status === 200 &&
           editBookRes.html.includes('Editing: Clean Code') &&
           editBookRes.html.includes('name="total_copies"'),
           'GET /admin/books/1/edit renders pre-populated book edit form.');

    // -------------------------------------------------------------------------
    // SECTION 4: ADMIN BORROW REQUESTS & CIRCULATION VIEWS
    // -------------------------------------------------------------------------
    console.log('\n--- Section 4: Admin Borrow Requests & Circulation ---');

    // Test 12: GET /admin/borrow-requests
    const adminRequestsRes = await adminClient.get('/admin/borrow-requests');
    assert(adminRequestsRes.status === 200 &&
           adminRequestsRes.html.includes('Student Borrow Requests') &&
           adminRequestsRes.html.includes('All Requests') &&
           adminRequestsRes.html.includes('Pending Review'),
           'GET /admin/borrow-requests renders student reservation ledger.');

    // Test 13: GET /admin/circulation/issued
    const issuedRes = await adminClient.get('/admin/circulation/issued');
    assert(issuedRes.status === 200 &&
           (issuedRes.html.includes('Issued Books & Active Circulation') || issuedRes.html.includes('Issued Books &amp; Active Circulation')) &&
           issuedRes.html.includes('Active Loans') &&
           issuedRes.html.includes('Process Return'),
           'GET /admin/circulation/issued renders circulation management table.');

    // Test 14: GET /admin/circulation/issue
    const directIssueFormRes = await adminClient.get('/admin/circulation/issue');
    assert(directIssueFormRes.status === 200 &&
           directIssueFormRes.html.includes('Direct Book Circulation Desk') &&
           directIssueFormRes.html.includes('Select Registered Student') &&
           directIssueFormRes.html.includes('Select Available Book'),
           'GET /admin/circulation/issue renders direct desk checkout form.');

    // Test 15: GET /admin/circulation/overdue
    const overdueRes = await adminClient.get('/admin/circulation/overdue');
    assert(overdueRes.status === 200 &&
           (overdueRes.html.includes('Overdue Books & Fine Management') || overdueRes.html.includes('Overdue Books &amp; Fine Management')) &&
           overdueRes.html.includes('Overdue Books on Loan') &&
           overdueRes.html.includes('Total Accumulated Fines') &&
           overdueRes.html.includes('Daily Overdue Fine Rate'),
           'GET /admin/circulation/overdue renders overdue analytics cards and table.');

    // Test 16: GET /admin/circulation/return/1 (Overdue loan return clearance)
    const returnClearanceRes = await adminClient.get('/admin/circulation/return/1');
    assert(returnClearanceRes.status === 200 &&
           returnClearanceRes.html.includes('Process Book Return') &&
           (returnClearanceRes.html.includes('Return Clearance & Fine Summary') || returnClearanceRes.html.includes('Return Clearance &amp; Fine Summary')) &&
           returnClearanceRes.html.includes('Circulation Audit Timeline') &&
           returnClearanceRes.html.includes('Total Overdue Fine'),
           'GET /admin/circulation/return/1 renders return clearance fine summary.');

    // Test 17: GET /admin/transactions
    const txRes = await adminClient.get('/admin/transactions');
    assert(txRes.status === 200 &&
           txRes.html.includes('Circulation Transaction Ledger') &&
           txRes.html.includes('Audit History') &&
           txRes.html.includes('Filter Ledger'),
           'GET /admin/transactions renders immutable transactions audit ledger.');

    // Test 18: GET /admin/students
    const studentsRes = await adminClient.get('/admin/students');
    assert(studentsRes.status === 200 &&
           studentsRes.html.includes('Student Accounts Management') &&
           studentsRes.html.includes('Registered Students') &&
           studentsRes.html.includes('Account Control'),
           'GET /admin/students renders student members management table.');

    // -------------------------------------------------------------------------
    // SECTION 5: STUDENT AUTHENTICATION & PERSONAL DASHBOARD
    // -------------------------------------------------------------------------
    console.log('\n--- Section 5: Student Dashboard & Portfolio ---');

    // Test 19: Student login
    const studentLoginRes = await studentClient.login('rahul.sharma@college.edu', 'student123');
    assert(studentLoginRes.status === 302 && studentLoginRes.location === '/student/dashboard',
           'Student login authenticates and redirects to /student/dashboard.');

    // Test 20: GET /student/dashboard
    const studentDashRes = await studentClient.get('/student/dashboard');
    assert(studentDashRes.status === 200 &&
           studentDashRes.html.includes('Welcome, Rahul Sharma') &&
           studentDashRes.html.includes('Books Currently Borrowed') &&
           studentDashRes.html.includes('Pending Borrow Requests') &&
           studentDashRes.html.includes('My Active Book Loans'),
           'GET /student/dashboard renders student personal metrics and reading portfolio.');

    // Test 21: Student blocked from /admin/dashboard
    const studentBlockedRes = await studentClient.get('/admin/dashboard');
    assert(studentBlockedRes.status === 302 && studentBlockedRes.location === '/student/dashboard',
           'Role protection: Student accessing /admin/dashboard redirected to student dashboard.');

    // -------------------------------------------------------------------------
    // SECTION 6: STUDENT CATALOG, BOOK DETAILS, LOANS & HISTORY
    // -------------------------------------------------------------------------
    console.log('\n--- Section 6: Student Catalog, Loan Portfolio & Profile ---');

    // Test 22: GET /student/books
    const studentCatalogRes = await studentClient.get('/student/books');
    assert(studentCatalogRes.status === 200 &&
           studentCatalogRes.html.includes('University Library Catalog') &&
           (studentCatalogRes.html.includes('All Disciplines & Categories') || studentCatalogRes.html.includes('All Disciplines &amp; Categories')) &&
           (studentCatalogRes.html.includes('View & Borrow') || studentCatalogRes.html.includes('View &amp; Borrow')),
           'GET /student/books renders student searchable book catalog.');

    // Test 23: GET /student/books/1
    const bookDetailRes = await studentClient.get('/student/books/1');
    assert(bookDetailRes.status === 200 &&
           bookDetailRes.html.includes('Clean Code') &&
           bookDetailRes.html.includes('Active Circulation') &&
           bookDetailRes.html.includes('Copies Available'),
           'GET /student/books/1 renders single book details with dynamic circulation status.');

    // Test 24: GET /student/my-loans
    const myLoansRes = await studentClient.get('/student/my-loans');
    assert(myLoansRes.status === 200 &&
           myLoansRes.html.includes('My Active Borrowed Books') &&
           myLoansRes.html.includes('Library Circulation Policy') &&
           myLoansRes.html.includes('Active Book Loans'),
           'GET /student/my-loans renders student active loans table.');

    // Test 25: GET /student/loan-history
    const historyRes = await studentClient.get('/student/loan-history');
    assert(historyRes.status === 200 &&
           (historyRes.html.includes('My Borrowing & Circulation History') || historyRes.html.includes('My Borrowing &amp; Circulation History')) &&
           historyRes.html.includes('Returned Books History') &&
           historyRes.html.includes('All Borrow Requests'),
           'GET /student/loan-history renders returned books log and requests history.');

    // Test 26: GET /student/profile
    const profileRes = await studentClient.get('/student/profile');
    assert(profileRes.status === 200 &&
           profileRes.html.includes('Student Account Profile') &&
           profileRes.html.includes('Rahul Sharma') &&
           profileRes.html.includes('Change Security Password'),
           'GET /student/profile renders personal info and password change form.');

    // -------------------------------------------------------------------------
    // SECTION 7: LEGACY PHP URL REDIRECTS (ZERO BROKEN LINKS)
    // -------------------------------------------------------------------------
    console.log('\n--- Section 7: Legacy PHP Route Compatibility ---');

    const legacyChecks = [
      { url: '/admin/dashboard.php', target: '/admin/dashboard' },
      { url: '/admin/manage_books.php', target: '/admin/books' },
      { url: '/admin/add_book.php', target: '/admin/books/add' },
      { url: '/admin/edit_book.php?id=1', target: '/admin/books/1/edit' },
      { url: '/admin/borrow_requests.php', target: '/admin/borrow-requests' },
      { url: '/admin/issued_books.php', target: '/admin/circulation/issued' },
      { url: '/admin/issue_book.php', target: '/admin/circulation/issue' },
      { url: '/admin/overdue_books.php', target: '/admin/circulation/overdue' },
      { url: '/admin/transactions.php', target: '/admin/transactions' },
      { url: '/admin/manage_students.php', target: '/admin/students' },
      { url: '/student/dashboard.php', target: '/student/dashboard' },
      { url: '/student/books.php', target: '/student/books' },
      { url: '/student/book_details.php?id=1', target: '/student/books/1' },
      { url: '/student/my_books.php', target: '/student/my-loans' },
      { url: '/student/borrow_history.php', target: '/student/loan-history' },
      { url: '/student/profile.php', target: '/student/profile' },
    ];

    for (const item of legacyChecks) {
      const res = await anonClient.get(item.url);
      assert(res.status === 302 && res.location === item.target,
             `Legacy URL '${item.url}' cleanly redirects to '${item.target}'.`);
    }

    // -------------------------------------------------------------------------
    // SECTION 8: FORM SUBMISSION & FLASH NOTIFICATION TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- Section 8: Interactive Forms & Flash Messages ---');

    // Test 27: Student updates profile phone number (guaranteed cleanup with try/finally)
    const [studentRowBefore] = await pool.query('SELECT phone, full_name FROM users WHERE id = 2');
    const originalPhone = studentRowBefore[0].phone;
    const originalFullName = studentRowBefore[0].full_name;

    try {
      const updatedPhone = '9998887777';
      const profileUpdateRes = await studentClient.post('/student/profile', {
        update_profile: '1',
        full_name: originalFullName,
        phone: updatedPhone
      });
      assert(profileUpdateRes.status === 302, 'Profile update post successfully accepted with 302 redirect.');

      // Follow redirect to /student/profile and check flash message
      const profileAfterRes = await studentClient.get('/student/profile');
      assert(profileAfterRes.status === 200 &&
             profileAfterRes.html.includes('Profile information updated successfully.') &&
             profileAfterRes.html.includes(updatedPhone),
             'Flash message rendered on redirect and phone number updated.');
    } finally {
      // Guaranteed restoration of student phone and full_name to exact pre-test values
      await pool.query('UPDATE users SET phone = ?, full_name = ? WHERE id = ?', [originalPhone, originalFullName, 2]);
    }

    // Test 28: Admin toggles student status (guaranteed cleanup with try/finally)
    const [student7Before] = await pool.query('SELECT status FROM users WHERE id = 7');
    const originalStatus = student7Before[0].status;

    try {
      const toggleRes = await adminClient.post('/admin/students/7/toggle-status');
      assert(toggleRes.status === 302, 'Student toggle status accepted with 302 redirect.');
      const [toggledStudent] = await pool.query('SELECT status FROM users WHERE id = 7');
      const expectedToggledStatus = (originalStatus === 'active') ? 'inactive' : 'active';
      assert(toggledStudent[0].status === expectedToggledStatus, `Student account status toggled to ${expectedToggledStatus}.`);

      // Toggle back to original status
      await adminClient.post('/admin/students/7/toggle-status');
      const [restoredStudent] = await pool.query('SELECT status FROM users WHERE id = 7');
      assert(restoredStudent[0].status === originalStatus, `Student account status restored to ${originalStatus}.`);
    } finally {
      // Guaranteed restoration of student status to exact pre-test value
      await pool.query('UPDATE users SET status = ? WHERE id = 7', [originalStatus]);
    }

    // -------------------------------------------------------------------------
    // SECTION 9: LOGOUT AND NOTIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- Section 9: Sign Out Verification ---');

    // Test 29: Admin logout
    const logoutRes = await adminClient.get('/logout');
    assert(logoutRes.status === 302 && logoutRes.location === '/login?logged_out=1',
           'GET /logout destroys session and redirects to /login?logged_out=1.');

    // Test 30: Followed logout landing page
    const loginLoggedOutRes = await adminClient.get('/login?logged_out=1');
    assert(loginLoggedOutRes.status === 200 && loginLoggedOutRes.html.includes('You have been successfully signed out.'),
           'Login page confirms successful sign-out message.');

    console.log('\n=====================================================');
    console.log(`  ALL ${passed} OF ${total} FRONTEND INTEGRATION TESTS PASSED!`);
    console.log('=====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n[FATAL ERROR IN TEST SUITE]:', err);
    process.exit(1);
  }
}

runFrontendTests();
