/**
 * Authentication Routes (Login, Registration, Logout & Protected Dashboards)
 * The Archive - Library Management System (Node.js & Express Migration)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { requireLogin, requireAdmin, requireStudent, redirectIfLoggedIn } = require('../middleware/auth');

// GET / - Root entry point
router.get('/', (req, res) => {
  if (req.session && req.session.user) {
    const target = req.session.user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
    return res.redirect(target);
  }
  res.redirect('/login');
});

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

// Protected temporary dashboard placeholders (prevents 404s after login until full dashboards are migrated)
router.get('/admin/dashboard', requireAdmin, (req, res) => {
  res.render('dashboard_placeholder', {
    page_title: 'Administrator Console',
    roleTitle: 'ADMINISTRATOR CONSOLE',
    user: req.session.user
  });
});

router.get('/student/dashboard', requireStudent, (req, res) => {
  res.render('dashboard_placeholder', {
    page_title: 'Student Dashboard',
    roleTitle: 'STUDENT DASHBOARD',
    user: req.session.user
  });
});

module.exports = router;
