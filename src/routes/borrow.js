/**
 * Borrow Requests Management Routes
 * The Archive - Library Management System (Node.js & Express Migration)
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { requireLogin, requireAdmin, requireStudent } = require('../middleware/auth');
const { LOAN_PERIOD_DAYS, logTransaction, respondOrRedirect } = require('../utils/circulation');

/**
 * POST /student/borrow-requests
 * Student submits an online borrow request for a book
 */
router.post('/student/borrow-requests', requireStudent, async (req, res) => {
  const bookId = parseInt(req.body?.book_id, 10);
  const userId = req.session.user.id;

  if (!bookId || bookId <= 0) {
    return respondOrRedirect(req, res, {
      jsonStatus: 400,
      jsonData: { status: 'error', message: 'Invalid book selected for borrow request.' },
      redirectUrl: '/student/books',
      flashType: 'error',
      flashMessage: 'Invalid book selected for borrow request.'
    });
  }

  try {
    // 1. Verify student account status
    const [userRows] = await pool.query('SELECT status, full_name FROM users WHERE id = ? LIMIT 1', [userId]);
    if (userRows.length === 0 || userRows[0].status !== 'active') {
      return respondOrRedirect(req, res, {
        jsonStatus: 403,
        jsonData: { status: 'error', message: 'Your student account is currently deactivated. You cannot request books.' },
        redirectUrl: `/books/${bookId}`,
        flashType: 'error',
        flashMessage: 'Your student account is currently deactivated. You cannot request books.'
      });
    }

    // 2. Fetch book details & check available copies
    const [bookRows] = await pool.query('SELECT id, title, available_copies FROM books WHERE id = ? LIMIT 1', [bookId]);
    if (bookRows.length === 0) {
      return respondOrRedirect(req, res, {
        jsonStatus: 404,
        jsonData: { status: 'error', message: 'Book not found in library catalog.' },
        redirectUrl: '/books',
        flashType: 'error',
        flashMessage: 'Book not found in library catalog.'
      });
    }
    const book = bookRows[0];

    if (book.available_copies <= 0) {
      return respondOrRedirect(req, res, {
        jsonStatus: 400,
        jsonData: { status: 'error', message: `Sorry, '${book.title}' is currently out of stock. Please check back when copies are returned.` },
        redirectUrl: `/books/${bookId}`,
        flashType: 'error',
        flashMessage: `Sorry, '${book.title}' is currently out of stock. Please check back when copies are returned.`
      });
    }

    // 3. Prevent duplicate pending borrow request for the same book
    const [pendingRequests] = await pool.query(
      "SELECT id FROM borrow_requests WHERE user_id = ? AND book_id = ? AND status = 'pending' LIMIT 1",
      [userId, bookId]
    );
    if (pendingRequests.length > 0) {
      return respondOrRedirect(req, res, {
        jsonStatus: 409,
        jsonData: { status: 'error', message: `You already have a pending borrow request submitted for '${book.title}'. Awaiting admin review.` },
        redirectUrl: `/books/${bookId}`,
        flashType: 'error',
        flashMessage: `You already have a pending borrow request submitted for '${book.title}'. Awaiting admin review.`
      });
    }

    // 4. Prevent request if student currently has an active issued copy of this book
    const [activeIssues] = await pool.query(
      "SELECT id FROM issued_books WHERE user_id = ? AND book_id = ? AND status IN ('issued', 'overdue') LIMIT 1",
      [userId, bookId]
    );
    if (activeIssues.length > 0) {
      return respondOrRedirect(req, res, {
        jsonStatus: 409,
        jsonData: { status: 'error', message: `You currently have an active borrowed copy of '${book.title}'. Please return it before requesting another copy.` },
        redirectUrl: `/books/${bookId}`,
        flashType: 'error',
        flashMessage: `You currently have an active borrowed copy of '${book.title}'. Please return it before requesting another copy.`
      });
    }

    // 5. Insert new borrow request & log transaction
    const [insertResult] = await pool.query(
      "INSERT INTO borrow_requests (user_id, book_id, status) VALUES (?, ?, 'pending')",
      [userId, bookId]
    );
    const requestId = insertResult.insertId;

    const note = `Student submitted online borrow request #BR-${requestId} for '${book.title}'`;
    await logTransaction(pool, {
      userId,
      bookId,
      issuedBookId: null,
      action: 'borrow_request',
      notes: note
    });

    return respondOrRedirect(req, res, {
      jsonStatus: 201,
      jsonData: {
        status: 'ok',
        message: `Borrow request for '${book.title}' has been submitted successfully! The library administrator will review it.`,
        requestId,
        bookId
      },
      redirectUrl: '/student/borrow-requests',
      flashType: 'success',
      flashMessage: `Borrow request for '${book.title}' has been submitted successfully! The library administrator will review it.`
    });
  } catch (error) {
    console.error('Error submitting borrow request:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to submit borrow request due to a database error.' });
  }
});

/**
 * GET /student/borrow-requests
 * Student views their own borrow requests
 */
router.get('/student/borrow-requests', requireStudent, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const [requests] = await pool.query(
      `SELECT br.*, b.title, b.author, b.isbn, b.cover_image, c.name AS category_name
       FROM borrow_requests br
       JOIN books b ON br.book_id = b.id
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE br.user_id = ?
       ORDER BY br.request_date DESC`,
      [userId]
    );

    const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.query.format === 'json';
    if (wantsJson) {
      return res.status(200).json({ status: 'ok', count: requests.length, requests });
    }

    return res.status(200).json({ status: 'ok', count: requests.length, requests });
  } catch (error) {
    console.error('Error fetching student borrow requests:', error);
    return res.status(500).json({ status: 'error', message: 'Database error fetching borrow requests.' });
  }
});

/**
 * GET /admin/borrow-requests
 * Admin views all student borrow requests (filtered by status)
 */
router.get('/admin/borrow-requests', requireAdmin, async (req, res) => {
  const statusFilter = (req.query.status || 'all').trim();
  const validStatuses = ['pending', 'approved', 'rejected'];

  try {
    let query = `
      SELECT br.*, u.full_name, u.student_id_number, u.email, u.phone,
             b.title, b.author, b.isbn, b.available_copies
      FROM borrow_requests br
      JOIN users u ON br.user_id = u.id
      JOIN books b ON br.book_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (validStatuses.includes(statusFilter)) {
      query += ' AND br.status = ?';
      params.push(statusFilter);
    }

    query += " ORDER BY CASE WHEN br.status = 'pending' THEN 0 ELSE 1 END, br.request_date DESC";

    const [requests] = await pool.query(query, params);

    const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.query.format === 'json';
    if (wantsJson) {
      return res.status(200).json({
        status: 'ok',
        count: requests.length,
        statusFilter,
        requests
      });
    }

    return res.status(200).json({
      status: 'ok',
      count: requests.length,
      statusFilter,
      requests
    });
  } catch (error) {
    console.error('Error fetching borrow requests for admin:', error);
    return res.status(500).json({ status: 'error', message: 'Database error fetching borrow requests.' });
  }
});

/**
 * POST & GET /admin/borrow-requests/:id/approve
 * Admin approves a pending borrow request inside a transaction:
 * - Checks available copies
 * - Sets status = 'approved'
 * - Decrements books.available_copies
 * - Creates issued_books entry with 14-day due date
 * - Logs 'book_issued' to transactions audit log
 */
const handleApprove = async (req, res) => {
  const requestId = parseInt(req.params.id, 10);
  if (!requestId || requestId <= 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid borrow request ID.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Lock request row FOR UPDATE
    const [requestRows] = await connection.query(
      `SELECT br.*, b.title, b.available_copies, u.full_name
       FROM borrow_requests br
       JOIN books b ON br.book_id = b.id
       JOIN users u ON br.user_id = u.id
       WHERE br.id = ? AND br.status = 'pending'
       FOR UPDATE`,
      [requestId]
    );

    if (requestRows.length === 0) {
      await connection.rollback();
      return respondOrRedirect(req, res, {
        jsonStatus: 404,
        jsonData: { status: 'error', message: 'Invalid or already processed borrow request.' },
        redirectUrl: '/admin/borrow-requests',
        flashType: 'error',
        flashMessage: 'Invalid or already processed borrow request.'
      });
    }

    const request = requestRows[0];

    // 2. Lock book row FOR UPDATE and check stock
    const [bookRows] = await connection.query(
      'SELECT id, available_copies FROM books WHERE id = ? FOR UPDATE',
      [request.book_id]
    );

    if (bookRows.length === 0 || bookRows[0].available_copies <= 0) {
      await connection.rollback();
      return respondOrRedirect(req, res, {
        jsonStatus: 400,
        jsonData: { status: 'error', message: `Cannot approve request: All copies of '${request.title}' are currently out of stock.` },
        redirectUrl: '/admin/borrow-requests',
        flashType: 'error',
        flashMessage: `Cannot approve request: All copies of '${request.title}' are currently out of stock.`
      });
    }

    // 3. Update request status to 'approved'
    const today = new Date();
    const adminNote = `Approved by Administrator on ${today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    await connection.query(
      'UPDATE borrow_requests SET status = "approved", admin_notes = ? WHERE id = ?',
      [adminNote, requestId]
    );

    // 4. Decrement available copies
    await connection.query(
      'UPDATE books SET available_copies = available_copies - 1 WHERE id = ? AND available_copies > 0',
      [request.book_id]
    );

    // 5. Create record in issued_books table (issue date = CURDATE(), due date = +14 days)
    const issueDateStr = today.toISOString().substring(0, 10);
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + LOAN_PERIOD_DAYS);
    const dueDateStr = dueDate.toISOString().substring(0, 10);

    const [issueResult] = await connection.query(
      `INSERT INTO issued_books (borrow_request_id, user_id, book_id, issue_date, due_date, status, fine_amount)
       VALUES (?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), 'issued', 0.00)`,
      [requestId, request.user_id, request.book_id, LOAN_PERIOD_DAYS]
    );
    const issuedId = issueResult.insertId;

    // 6. Log to transactions ledger
    const logNote = `Request #BR-${requestId} approved. Book '${request.title}' issued to ${request.full_name} (Due: ${dueDateStr}).`;
    await logTransaction(connection, {
      userId: request.user_id,
      bookId: request.book_id,
      issuedBookId: issuedId,
      action: 'book_issued',
      notes: logNote
    });

    await connection.commit();

    return respondOrRedirect(req, res, {
      jsonStatus: 200,
      jsonData: {
        status: 'ok',
        message: `Borrow request #BR-${requestId} approved successfully! Book issued with due date: ${dueDateStr}`,
        requestId,
        issuedBookId: issuedId,
        dueDate: dueDateStr
      },
      redirectUrl: '/admin/borrow-requests',
      flashType: 'success',
      flashMessage: `Borrow request #BR-${requestId} approved successfully! Book issued with due date: ${dueDateStr}`
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error approving borrow request:', error);
    return res.status(500).json({ status: 'error', message: `Database error during approval: ${error.message}` });
  } finally {
    connection.release();
  }
};

router.post('/admin/borrow-requests/:id/approve', requireAdmin, handleApprove);
router.get('/admin/borrow-requests/:id/approve', requireAdmin, handleApprove);

/**
 * POST & GET /admin/borrow-requests/:id/reject
 * Admin rejects a pending borrow request
 */
const handleReject = async (req, res) => {
  const requestId = parseInt(req.params.id, 10);
  const rejectReason = (req.body?.reason || req.query?.reason || 'Request declined by administrator (e.g. reserved or maintenance).').trim();

  if (!requestId || requestId <= 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid borrow request ID.' });
  }

  try {
    const [requestRows] = await pool.query(
      `SELECT br.*, b.title, u.full_name
       FROM borrow_requests br
       JOIN books b ON br.book_id = b.id
       JOIN users u ON br.user_id = u.id
       WHERE br.id = ? AND br.status = 'pending'
       LIMIT 1`,
      [requestId]
    );

    if (requestRows.length === 0) {
      return respondOrRedirect(req, res, {
        jsonStatus: 404,
        jsonData: { status: 'error', message: 'Invalid or already processed borrow request.' },
        redirectUrl: '/admin/borrow-requests',
        flashType: 'error',
        flashMessage: 'Invalid or already processed borrow request.'
      });
    }

    const request = requestRows[0];

    // Update request status to rejected
    await pool.query(
      'UPDATE borrow_requests SET status = "rejected", admin_notes = ? WHERE id = ?',
      [rejectReason, requestId]
    );

    // Log transaction
    const logNote = `Borrow request #BR-${requestId} for '${request.title}' rejected by admin. Reason: ${rejectReason}`;
    await logTransaction(pool, {
      userId: request.user_id,
      bookId: request.book_id,
      issuedBookId: null,
      action: 'request_rejected',
      notes: logNote
    });

    return respondOrRedirect(req, res, {
      jsonStatus: 200,
      jsonData: {
        status: 'ok',
        message: `Borrow request #BR-${requestId} rejected.`,
        requestId,
        reason: rejectReason
      },
      redirectUrl: '/admin/borrow-requests',
      flashType: 'success',
      flashMessage: `Borrow request #BR-${requestId} rejected.`
    });
  } catch (error) {
    console.error('Error rejecting borrow request:', error);
    return res.status(500).json({ status: 'error', message: `Database error during rejection: ${error.message}` });
  }
};

router.post('/admin/borrow-requests/:id/reject', requireAdmin, handleReject);
router.get('/admin/borrow-requests/:id/reject', requireAdmin, handleReject);

module.exports = router;
