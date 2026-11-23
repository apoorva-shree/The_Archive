/**
 * Authentication Routes (Login, Registration, Logout & Protected Dashboards)
 * The Archive - Library Management System (Node.js & Express Migration)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { requireLogin, requireAdmin, requireStudent, redirectIfLoggedIn } = require('../middleware/auth');

// GET / and /index.php - Public Landing Page
const renderLandingPage = async (req, res) => {
  try {
    // 1. Dynamic Statistics Query
    const [statsRows] = await pool.query(
      'SELECT SUM(total_copies) AS total_copies, SUM(available_copies) AS available_copies, COUNT(*) AS titles FROM books'
    );
    const [studentRows] = await pool.query(
      "SELECT COUNT(*) AS total_students FROM users WHERE role = 'student'"
    );

    const stats = {
      total_books_count: parseInt(statsRows[0]?.total_copies, 10) || 0,
      available_copies_count: parseInt(statsRows[0]?.available_copies, 10) || 0,
      total_titles_count: parseInt(statsRows[0]?.titles, 10) || 0,
      members_count: parseInt(studentRows[0]?.total_students, 10) || 0
    };

    // 2. Fetch top 6 Categories for Cards
    const [categories] = await pool.query('SELECT * FROM categories ORDER BY id ASC LIMIT 6');

    // 3. Fetch top 8 featured books for catalog preview
    const [featured_books] = await pool.query(`
      SELECT b.*, c.name AS category_name 
      FROM books b 
      LEFT JOIN categories c ON b.category_id = c.id 
      ORDER BY b.id ASC 
      LIMIT 8
    `);

    res.render('index', {
      stats,
      categories,
      featured_books
    });
  } catch (error) {
    console.error('Error rendering landing page:', error);
    res.status(500).send('Internal server error loading The Archive portal.');
  }
};

router.get('/', renderLandingPage);
router.get('/index.php', renderLandingPage);

// GET /login - Show login page
router.get('/login', redirectIfLoggedIn, (req, res) => {
  let notice = '';
  if (req.query.logged_out === '1') {
    notice = 'You have been successfully signed out.';
  }

  res.render('login', {
    page_title: 'Account Login',
    email_input: '',
    error: '',
    notice
  });
});

// POST /login - Handle login submission
router.post('/login', redirectIfLoggedIn, async (req, res) => {
  const email = (req.body.email || '').trim();
  const password = req.body.password || '';

  if (!email || !password) {
    return res.render('login', {
      page_title: 'Account Login',
      email_input: email,
      error: 'Please enter both your email address and password.',
      notice: ''
    });
  }

  // Basic email syntax check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.render('login', {
      page_title: 'Account Login',
      email_input: email,
      error: 'Please enter a valid email address.',
      notice: ''
    });
  }

  try {
    // 1. Query user from MySQL users table
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);

    if (rows.length === 0) {
      return res.render('login', {
        page_title: 'Account Login',
        email_input: email,
        error: 'No registered user account found with that email address.',
        notice: ''
      });
    }

    const user = rows[0];

    // 2. Check active status
    if (user.status !== 'active') {
      return res.render('login', {
        page_title: 'Account Login',
        email_input: email,
        error: 'Your account has been deactivated. Please contact the administrator.',
        notice: ''
      });
    }

    // 3. Verify password hash using bcryptjs strictly against user's stored hash
    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      return res.render('login', {
        page_title: 'Account Login',
        email_input: email,
        error: 'Invalid credentials. The password you entered is incorrect.',
        notice: ''
      });
    }

    // 4. Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.render('login', {
          page_title: 'Account Login',
          email_input: email,
          error: 'An internal session error occurred. Please try again.',
          notice: ''
        });
      }

      // Store authenticated user in session
      req.session.user = {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        student_id: user.student_id_number || ''
      };

      const targetUrl = user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
      res.redirectWithFlash(targetUrl, 'success', `Welcome back, ${user.full_name}!`);
    });

  } catch (error) {
    console.error('Login database error:', error);
    return res.render('login', {
      page_title: 'Account Login',
      email_input: email,
      error: 'Database connection error. Please try again later.',
      notice: ''
    });
  }
});

// GET /register - Show registration page
router.get('/register', redirectIfLoggedIn, (req, res) => {
  res.render('register', {
    page_title: 'Student Registration',
    form_data: { full_name: '', student_id: '', email: '', phone: '' },
    error: ''
  });
});

// POST /register - Handle registration submission
router.post('/register', redirectIfLoggedIn, async (req, res) => {
  const fullName = (req.body.full_name || '').trim();
  const studentId = (req.body.student_id || '').trim().toUpperCase();
  const email = (req.body.email || '').trim();
  const phone = (req.body.phone || '').trim();
  const password = req.body.password || '';
  const confirmPassword = req.body.confirm_password || '';

  const formData = { full_name: fullName, student_id: studentId, email, phone };

  // Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!fullName || !studentId || !email || !password || !confirmPassword) {
    return res.render('register', {
      page_title: 'Student Registration',
      form_data: formData,
      error: 'Please fill in all mandatory fields.'
    });
  }

  if (!emailRegex.test(email)) {
    return res.render('register', {
      page_title: 'Student Registration',
      form_data: formData,
      error: 'Please enter a valid email address.'
    });
  }

  if (password.length < 6) {
    return res.render('register', {
      page_title: 'Student Registration',
      form_data: formData,
      error: 'Password must be at least 6 characters long.'
    });
  }

  if (password !== confirmPassword) {
    return res.render('register', {
      page_title: 'Student Registration',
      form_data: formData,
      error: 'Passwords do not match. Please verify and retype.'
    });
  }

  try {
    // Check if email already registered
    const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existingEmail.length > 0) {
      return res.render('register', {
        page_title: 'Student Registration',
        form_data: formData,
        error: 'An account with this email address is already registered.'
      });
    }

    // Check if Student ID already registered (case-insensitive normalized check)
    const [existingStudentId] = await pool.query('SELECT id FROM users WHERE UPPER(student_id_number) = ? LIMIT 1', [studentId]);
    if (existingStudentId.length > 0) {
      return res.render('register', {
        page_title: 'Student Registration',
        form_data: formData,
        error: 'A student with this Roll / Student ID Number is already registered.'
      });
    }

    // Hash password using bcryptjs (compatible with PHP)
    const hashedPassword = await bcrypt.hash(password, 10);
    const role = 'student'; // Always student, never admin
    const status = 'active';

    // Insert into MySQL users table
    await pool.query(
      'INSERT INTO users (full_name, email, password, phone, student_id_number, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [fullName, email, hashedPassword, phone || null, studentId, role, status]
    );

    // Redirect to login with success flash message
    res.redirectWithFlash('/login', 'success', 'Registration successful! You can now sign in with your credentials.');

  } catch (error) {
    console.error('Registration database error:', error);
    return res.render('register', {
      page_title: 'Student Registration',
      form_data: formData,
      error: 'Registration failed due to a database error. Please try again.'
    });
  }
});

// GET /logout - Sign out user
router.get('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) console.error('Session destroy error on logout:', err);
      res.clearCookie('the_archive_sid');
      res.redirect('/login?logged_out=1');
    });
  } else {
    res.clearCookie('the_archive_sid');
    res.redirect('/login?logged_out=1');
  }
});

// GET /admin/dashboard - Admin Central Console
router.get('/admin/dashboard', requireAdmin, async (req, res) => {
  try {
    // 1. Fetch Dynamic Statistics
    const [bookStats] = await pool.query(
      'SELECT SUM(total_copies) AS total_copies, SUM(available_copies) AS available_copies, COUNT(*) AS titles FROM books'
    );
    const [studentStats] = await pool.query(
      "SELECT COUNT(*) AS total_students FROM users WHERE role = 'student'"
    );
    const [issuedStats] = await pool.query(
      "SELECT COUNT(*) AS issued_count FROM issued_books WHERE status IN ('issued', 'overdue')"
    );
    const [overdueStats] = await pool.query(
      "SELECT COUNT(*) AS overdue_count FROM issued_books WHERE status IN ('issued', 'overdue') AND due_date < CURDATE()"
    );
    const [requestStats] = await pool.query(
      "SELECT COUNT(*) AS pending_count FROM borrow_requests WHERE status = 'pending'"
    );

    const stats = {
      total_copies: parseInt(bookStats[0]?.total_copies, 10) || 0,
      available_copies: parseInt(bookStats[0]?.available_copies, 10) || 0,
      total_titles: parseInt(bookStats[0]?.titles, 10) || 0,
      total_students: parseInt(studentStats[0]?.total_students, 10) || 0,
      currently_issued: parseInt(issuedStats[0]?.issued_count, 10) || 0,
      overdue_count: parseInt(overdueStats[0]?.overdue_count, 10) || 0,
      pending_requests: parseInt(requestStats[0]?.pending_count, 10) || 0
    };

    // 2. Fetch Recent Pending Borrow Requests (Limit 5)
    const [recent_requests] = await pool.query(`
      SELECT br.*, u.full_name, u.student_id_number, u.email, b.title, b.author, b.available_copies 
      FROM borrow_requests br
      JOIN users u ON br.user_id = u.id
      JOIN books b ON br.book_id = b.id
      WHERE br.status = 'pending'
      ORDER BY br.request_date DESC
      LIMIT 5
    `);

    // 3. Fetch Recently Issued Books (Limit 5)
    const [recent_issued] = await pool.query(`
      SELECT ib.*, u.full_name, u.student_id_number, b.title, b.author 
      FROM issued_books ib
      JOIN users u ON ib.user_id = u.id
      JOIN books b ON ib.book_id = b.id
      WHERE ib.status IN ('issued', 'overdue')
      ORDER BY ib.issue_date DESC
      LIMIT 5
    `);

    res.render('admin/dashboard', {
      stats,
      recent_requests,
      recent_issued
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    res.status(500).send('Database error loading admin dashboard.');
  }
});

// GET /student/dashboard - Student Personal Dashboard
router.get('/student/dashboard', requireStudent, async (req, res) => {
  const userId = req.session.user.id;

  try {
    // 1. Fetch Student Metrics
    const [activeRows] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM issued_books WHERE user_id = ? AND status IN ('issued', 'overdue')",
      [userId]
    );
    const [pendingRows] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM borrow_requests WHERE user_id = ? AND status = 'pending'",
      [userId]
    );
    const [returnedRows] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM issued_books WHERE user_id = ? AND status = 'returned'",
      [userId]
    );
    const [overdueRows] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM issued_books WHERE user_id = ? AND status IN ('issued', 'overdue') AND due_date < CURDATE()",
      [userId]
    );

    const metrics = {
      active_loans_count: activeRows[0]?.cnt || 0,
      pending_requests_count: pendingRows[0]?.cnt || 0,
      returned_count: returnedRows[0]?.cnt || 0,
      overdue_count: overdueRows[0]?.cnt || 0
    };

    // 2. Fetch Active Borrowed Books
    const [active_books] = await pool.query(`
      SELECT ib.*, b.title, b.author, b.isbn, b.cover_image, c.name AS category_name
      FROM issued_books ib
      JOIN books b ON ib.book_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE ib.user_id = ? AND ib.status IN ('issued', 'overdue')
      ORDER BY ib.due_date ASC
    `, [userId]);

    // 3. Fetch Recent Borrow Requests (Limit 5)
    const [my_requests] = await pool.query(`
      SELECT br.*, b.title, b.author, b.isbn, b.available_copies
      FROM borrow_requests br
      JOIN books b ON br.book_id = b.id
      WHERE br.user_id = ?
      ORDER BY br.request_date DESC
      LIMIT 5
    `, [userId]);

    res.render('student/dashboard', {
      metrics,
      active_books,
      my_requests
    });
  } catch (error) {
    console.error('Error loading student dashboard:', error);
    res.status(500).send('Database error loading student dashboard.');
  }
});

// GET /student/profile - View student profile & password form
router.get('/student/profile', requireStudent, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    if (rows.length === 0) {
      return res.redirect('/login');
    }

    res.render('student/profile', {
      profile: rows[0],
      error: '',
      formType: ''
    });
  } catch (error) {
    console.error('Error loading profile:', error);
    res.status(500).send('Database error loading profile.');
  }
});

// POST /student/profile - Update profile or change password
router.post('/student/profile', requireStudent, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    if (rows.length === 0) {
      return res.redirect('/login');
    }
    const profile = rows[0];

    // Case 1: Update personal information
    if (req.body.update_profile) {
      const fullName = (req.body.full_name || '').trim();
      const phone = (req.body.phone || '').trim();

      if (!fullName) {
        return res.render('student/profile', {
          profile,
          error: 'Full name cannot be left blank.',
          formType: 'profile'
        });
      }

      await pool.query(
        'UPDATE users SET full_name = ?, phone = ? WHERE id = ?',
        [fullName, phone, userId]
      );

      req.session.user.full_name = fullName;
      if (res.redirectWithFlash) {
        return res.redirectWithFlash('/student/profile', 'success', 'Profile information updated successfully.');
      }
      return res.redirect('/student/profile');
    }

    // Case 2: Change password
    if (req.body.change_password) {
      const currentPassword = req.body.current_password || '';
      const newPassword = req.body.new_password || '';
      const confirmPassword = req.body.confirm_password || '';

      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.render('student/profile', {
          profile,
          error: 'Please fill in all password fields.',
          formType: 'password'
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, profile.password);
      if (!isMatch) {
        return res.render('student/profile', {
          profile,
          error: 'Current password is incorrect.',
          formType: 'password'
        });
      }

      if (newPassword.length < 6) {
        return res.render('student/profile', {
          profile,
          error: 'New password must be at least 6 characters long.',
          formType: 'password'
        });
      }

      if (newPassword !== confirmPassword) {
        return res.render('student/profile', {
          profile,
          error: 'New password and confirmation password do not match.',
          formType: 'password'
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

      if (res.redirectWithFlash) {
        return res.redirectWithFlash('/student/profile', 'success', 'Password changed successfully! Please use your new password next time you sign in.');
      }
      return res.redirect('/student/profile');
    }

    res.redirect('/student/profile');
  } catch (error) {
    console.error('Error saving profile changes:', error);
    res.status(500).send('Database error saving profile changes.');
  }
});

// GET /admin/students - Manage Student Accounts
router.get('/admin/students', requireAdmin, async (req, res) => {
  const search = (req.query.search || '').trim();

  try {
    let query = `
      SELECT u.*, 
        (SELECT COUNT(*) FROM issued_books ib WHERE ib.user_id = u.id AND ib.status IN ('issued', 'overdue')) AS active_issues,
        (SELECT COUNT(*) FROM borrow_requests br WHERE br.user_id = u.id AND br.status = 'pending') AS pending_requests
      FROM users u 
      WHERE u.role = 'student'
    `;
    const params = [];

    if (search) {
      query += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.student_id_number LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    query += ' ORDER BY u.created_at DESC';

    const [students] = await pool.query(query, params);

    const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.query.format === 'json';
    if (wantsJson) {
      return res.status(200).json({ status: 'ok', count: students.length, search, students });
    }

    res.render('admin/manage_students', {
      students,
      search
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).send('Database error loading student accounts.');
  }
});

// POST & GET /admin/students/:id/toggle-status - Activate/Deactivate student account
const handleToggleStudentStatus = async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  if (!studentId || studentId <= 0) {
    return res.redirect('/admin/students');
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, full_name, status FROM users WHERE id = ? AND role = 'student' LIMIT 1",
      [studentId]
    );

    if (rows.length === 0) {
      return res.redirect('/admin/students');
    }

    const student = rows[0];
    const newStatus = (student.status === 'active') ? 'inactive' : 'active';

    await pool.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, studentId]);

    const msg = `Student account status for '${student.full_name}' changed to ${newStatus.toUpperCase()}.`;
    if (res.redirectWithFlash) {
      return res.redirectWithFlash('/admin/students', 'success', msg);
    }
    res.redirect('/admin/students');
  } catch (error) {
    console.error('Error toggling student status:', error);
    res.redirect('/admin/students');
  }
};

router.post('/admin/students/:id/toggle-status', requireAdmin, handleToggleStudentStatus);
router.get('/admin/students/:id/toggle-status', requireAdmin, handleToggleStudentStatus);

module.exports = router;
