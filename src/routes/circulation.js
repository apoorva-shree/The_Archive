/**
 * Book Circulation Management Routes (Issue, Return, Overdue Tracking)
 * The Archive - Library Management System (Node.js & Express Migration)
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { requireLogin, requireAdmin, requireStudent } = require('../middleware/auth');
const {
  LOAN_PERIOD_DAYS,
  FINE_PER_DAY,
  calculateOverdueAndFine,
  logTransaction,
  respondOrRedirect
} = require('../utils/circulation');
const { renderView } = require('../utils/htmlRenderer');

/**
 * POST /admin/circulation/issue
 * Admin direct issue of a book to a registered student
 */
router.post('/admin/circulation/issue', requireAdmin, async (req, res) => {
  const userId = parseInt(req.body?.user_id, 10);
  const bookId = parseInt(req.body?.book_id, 10);
  const loanDays = parseInt(req.body?.loan_days, 10) || LOAN_PERIOD_DAYS;

  if (!userId || userId <= 0 || !bookId || bookId <= 0 || loanDays <= 0) {
    return respondOrRedirect(req, res, {
      jsonStatus: 400,
      jsonData: { status: 'error', message: 'Please select a valid student, book, and loan period.' },
      redirectUrl: '/admin/circulation/issue',
      flashType: 'error',
      flashMessage: 'Please select a valid student, book, and loan period.'
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Verify student account status
    const [studentRows] = await connection.query(
      "SELECT id, full_name, status FROM users WHERE id = ? AND role = 'student' LIMIT 1 FOR UPDATE",
      [userId]
    );

    if (studentRows.length === 0 || studentRows[0].status !== 'active') {
      await connection.rollback();
      return respondOrRedirect(req, res, {
        jsonStatus: 400,
        jsonData: { status: 'error', message: 'Selected student account is not active or does not exist.' },
        redirectUrl: '/admin/circulation/issue',
        flashType: 'error',
        flashMessage: 'Selected student account is not active or does not exist.'
      });
    }
    const student = studentRows[0];

    // 2. Verify book stock with row lock
    const [bookRows] = await connection.query(
      'SELECT id, title, available_copies FROM books WHERE id = ? FOR UPDATE',
      [bookId]
    );

    if (bookRows.length === 0 || bookRows[0].available_copies <= 0) {
      await connection.rollback();
      return respondOrRedirect(req, res, {
        jsonStatus: 400,
        jsonData: { status: 'error', message: 'Selected book is out of stock.' },
        redirectUrl: '/admin/circulation/issue',
        flashType: 'error',
        flashMessage: 'Selected book is out of stock.'
      });
    }
    const book = bookRows[0];

    // 3. Prevent duplicate active loan for the same student and book
    const [activeLoans] = await connection.query(
      "SELECT id FROM issued_books WHERE user_id = ? AND book_id = ? AND status IN ('issued', 'overdue') LIMIT 1 FOR UPDATE",
      [userId, bookId]
    );

    if (activeLoans.length > 0) {
      await connection.rollback();
      return respondOrRedirect(req, res, {
        jsonStatus: 409,
        jsonData: {
          status: 'error',
          message: `Student '${student.full_name}' already holds an active borrowed copy of '${book.title}'.`
        },
        redirectUrl: '/admin/circulation/issue',
        flashType: 'error',
        flashMessage: `Student '${student.full_name}' already holds an active borrowed copy of '${book.title}'.`
      });
    }

    // 4. Decrement available copies
    await connection.query(
      'UPDATE books SET available_copies = available_copies - 1 WHERE id = ? AND available_copies > 0',
      [bookId]
    );

    // 5. Insert into issued_books
    const [issueResult] = await connection.query(
      `INSERT INTO issued_books (borrow_request_id, user_id, book_id, issue_date, due_date, status, fine_amount)
       VALUES (NULL, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), 'issued', 0.00)`,
      [userId, bookId, loanDays]
    );
    const issuedId = issueResult.insertId;

    // Fetch computed due date
    const [issuedRow] = await connection.query(
      'SELECT issue_date, due_date FROM issued_books WHERE id = ?',
      [issuedId]
    );
    const dueDateStr = issuedRow[0].due_date.toISOString ? issuedRow[0].due_date.toISOString().substring(0, 10) : issuedRow[0].due_date;

    // 6. Log transaction
    const note = `Direct issue by admin: '${book.title}' issued to ${student.full_name} (Due: ${dueDateStr})`;
    await logTransaction(connection, {
      userId,
      bookId,
      issuedBookId: issuedId,
      action: 'book_issued',
      notes: note
    });

    await connection.commit();

    return respondOrRedirect(req, res, {
      jsonStatus: 201,
      jsonData: {
        status: 'ok',
        message: `Book '${book.title}' successfully issued to ${student.full_name}. Due Date: ${dueDateStr}`,
        issuedId,
        studentName: student.full_name,
        bookTitle: book.title,
        dueDate: dueDateStr
      },
      redirectUrl: '/admin/circulation/issued',
      flashType: 'success',
      flashMessage: `Book '${book.title}' successfully issued to ${student.full_name}. Due Date: ${dueDateStr}`
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error issuing book directly:', error);
    return res.status(500).json({ status: 'error', message: `Database error during book issue: ${error.message}` });
  } finally {
    connection.release();
  }
});

/**
 * GET /admin/circulation/issued
 * View all issued books & active circulation (filter: active, overdue, returned, all)
 */
router.get('/admin/circulation/issued', requireAdmin, async (req, res) => {
  const statusFilter = (req.query.status || 'active').trim();
  const search = (req.query.search || '').trim();

  try {
    let query = `
      SELECT ib.*, u.full_name, u.student_id_number, u.email, u.phone,
             b.title, b.author, b.isbn, c.name AS category_name
      FROM issued_books ib
      JOIN users u ON ib.user_id = u.id
      JOIN books b ON ib.book_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (statusFilter === 'active') {
      query += " AND ib.status IN ('issued', 'overdue')";
    } else if (statusFilter === 'overdue') {
      query += " AND ib.status IN ('issued', 'overdue') AND ib.due_date < CURDATE()";
    } else if (statusFilter === 'returned') {
      query += " AND ib.status = 'returned'";
    }

    if (search) {
      query += " AND (u.full_name LIKE ? OR u.student_id_number LIKE ? OR b.title LIKE ? OR b.isbn LIKE ?)";
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    query += " ORDER BY CASE WHEN ib.status IN ('issued', 'overdue') THEN 0 ELSE 1 END, ib.due_date ASC";

    const [rows] = await pool.query(query, params);

    // Compute dynamic overdue fine for each record
    const issuedList = rows.map((item) => {
      const dueDateStr = item.due_date ? (item.due_date.toISOString ? item.due_date.toISOString().substring(0, 10) : String(item.due_date).substring(0, 10)) : null;
      const returnDateStr = item.return_date ? (item.return_date.toISOString ? item.return_date.toISOString().substring(0, 10) : String(item.return_date).substring(0, 10)) : null;

      const calc = calculateOverdueAndFine(dueDateStr, returnDateStr);

      return {
        ...item,
        due_date_formatted: dueDateStr,
        return_date_formatted: returnDateStr,
        days_overdue: calc.daysOverdue,
        calculated_fine: item.status === 'returned' ? parseFloat(item.fine_amount) : calc.fineAmount,
        is_overdue: calc.isOverdue
      };
    });

    const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.query.format === 'json';
    if (wantsJson) {
      return res.status(200).json({
        status: 'ok',
        count: issuedList.length,
        statusFilter,
        search,
        issued: issuedList
      });
    }

    return renderView(req, res, 'admin/issued_books', {
      issued: issuedList,
      statusFilter,
      search
    });
  } catch (error) {
    console.error('Error fetching issued books:', error);
    return res.status(500).json({ status: 'error', message: 'Database error fetching issued books.' });
  }
});

/**
 * GET /admin/circulation/issue
 * Show Direct Issue Book Form
 */
router.get('/admin/circulation/issue', requireAdmin, async (req, res) => {
  const selectedUserId = parseInt(req.query.user_id, 10) || 0;
  const selectedBookId = parseInt(req.query.book_id, 10) || 0;

  try {
    const [students] = await pool.query(
      "SELECT id, full_name, email, student_id_number FROM users WHERE role = 'student' AND status = 'active' ORDER BY full_name ASC"
    );
    const [books] = await pool.query(
      'SELECT id, title, author, isbn, available_copies, total_copies FROM books WHERE available_copies > 0 ORDER BY title ASC'
    );

    return renderView(req, res, 'admin/issue_book', {
      students,
      books,
      selectedUserId,
      selectedBookId,
      loanDays: LOAN_PERIOD_DAYS,
      error: ''
    });
  } catch (error) {
    console.error('Error loading issue book form:', error);
    res.status(500).send('Database error loading circulation desk.');
  }
});

/**
 * GET /admin/circulation/overdue
 * Overdue books tracker & fine management analytics
 * Correctly calculates accumulated fines (days_overdue * ₹5.00) and displays summary metrics
 */
router.get('/admin/circulation/overdue', requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT ib.*, u.full_name, u.student_id_number, u.email, u.phone,
             b.title, b.author, b.isbn, c.name AS category_name
      FROM issued_books ib
      JOIN users u ON ib.user_id = u.id
      JOIN books b ON ib.book_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE ib.status IN ('issued', 'overdue') AND ib.due_date < CURDATE()
      ORDER BY ib.due_date ASC
    `;
    const [rows] = await pool.query(query);

    let totalFinesAccumulated = 0.00;
    let maxDaysOverdue = 0;

    const overdueList = rows.map((item) => {
      const dueDateStr = item.due_date ? (item.due_date.toISOString ? item.due_date.toISOString().substring(0, 10) : String(item.due_date).substring(0, 10)) : null;
      const calc = calculateOverdueAndFine(dueDateStr, null);

      totalFinesAccumulated += calc.fineAmount;
      if (calc.daysOverdue > maxDaysOverdue) {
        maxDaysOverdue = calc.daysOverdue;
      }

      return {
        ...item,
        due_date_formatted: dueDateStr,
        days_overdue: calc.daysOverdue,
        calculated_fine: calc.fineAmount,
        fine_rate: calc.fineRate
      };
    });

    totalFinesAccumulated = parseFloat(totalFinesAccumulated.toFixed(2));

    const responseData = {
      status: 'ok',
      metrics: {
        totalOverdueCount: overdueList.length,
        totalFinesAccumulated,
        maxDaysOverdue,
        dailyFineRate: FINE_PER_DAY
      },
      overdueList
    };

    const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.query.format === 'json';
    if (wantsJson) {
      return res.status(200).json(responseData);
    }

    return renderView(req, res, 'admin/overdue_books', responseData);
  } catch (error) {
    console.error('Error fetching overdue books:', error);
    return res.status(500).json({ status: 'error', message: 'Database error fetching overdue books.' });
  }
});

/**
 * GET /admin/circulation/return/:id
 * Show Process Return Page
 */
router.get('/admin/circulation/return/:id', requireAdmin, async (req, res) => {
  const issuedId = parseInt(req.params.id, 10);
  if (!issuedId || issuedId <= 0) {
    return res.redirect('/admin/circulation/issued');
  }

  try {
    const [rows] = await pool.query(
      `SELECT ib.*, u.full_name, u.student_id_number, u.email, u.phone,
              b.title, b.author, b.isbn, b.total_copies, b.available_copies
       FROM issued_books ib
       JOIN users u ON ib.user_id = u.id
       JOIN books b ON ib.book_id = b.id
       WHERE ib.id = ? LIMIT 1`,
      [issuedId]
    );

    if (rows.length === 0) {
      if (res.redirectWithFlash) {
        return res.redirectWithFlash('/admin/circulation/issued', 'error', 'Issued book record not found.');
      }
      return res.redirect('/admin/circulation/issued');
    }

    const issue = rows[0];
    if (issue.status === 'returned') {
      if (res.redirectWithFlash) {
        return res.redirectWithFlash('/admin/circulation/issued', 'error', 'This book has already been marked as returned.');
      }
      return res.redirect('/admin/circulation/issued');
    }

    const dueDateStr = issue.due_date ? (issue.due_date.toISOString ? issue.due_date.toISOString().substring(0, 10) : String(issue.due_date).substring(0, 10)) : null;
    const calc = calculateOverdueAndFine(dueDateStr, null);

    return renderView(req, res, 'admin/return_book', {
      issue,
      days_overdue: calc.daysOverdue,
      fine_amount: calc.fineAmount,
      error: ''
    });
  } catch (error) {
    console.error('Error loading return book page:', error);
    res.status(500).send('Database error loading return book page.');
  }
});

/**
 * POST /admin/circulation/return/:id
 * Process book return, assess exact overdue fine, and restore inventory stock
 */
router.post('/admin/circulation/return/:id', requireAdmin, async (req, res) => {
  const issuedId = parseInt(req.params.id, 10);
  const notes = (req.body?.return_notes || '').trim();

  if (!issuedId || issuedId <= 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid Issued Record ID.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Fetch and lock issued record
    const [issueRows] = await connection.query(
      `SELECT ib.*, u.full_name, b.title, b.total_copies, b.available_copies
       FROM issued_books ib
       JOIN users u ON ib.user_id = u.id
       JOIN books b ON ib.book_id = b.id
       WHERE ib.id = ? FOR UPDATE`,
      [issuedId]
    );

    if (issueRows.length === 0) {
      await connection.rollback();
      return respondOrRedirect(req, res, {
        jsonStatus: 404,
        jsonData: { status: 'error', message: 'Issued book record not found.' },
        redirectUrl: '/admin/circulation/issued',
        flashType: 'error',
        flashMessage: 'Issued book record not found.'
      });
    }

    const issue = issueRows[0];

    if (issue.status === 'returned') {
      await connection.rollback();
      return respondOrRedirect(req, res, {
        jsonStatus: 400,
        jsonData: { status: 'error', message: 'This book has already been marked as returned.' },
        redirectUrl: '/admin/circulation/issued',
        flashType: 'error',
        flashMessage: 'This book has already been marked as returned.'
      });
    }

    // 2. Calculate overdue days and fine amount
    const dueDateStr = issue.due_date ? (issue.due_date.toISOString ? issue.due_date.toISOString().substring(0, 10) : String(issue.due_date).substring(0, 10)) : null;
    const calc = calculateOverdueAndFine(dueDateStr, null);
    const fineAmount = calc.fineAmount;

    // 3. Update issued_books record to 'returned' with return_date and fine_amount
    await connection.query(
      'UPDATE issued_books SET status = "returned", return_date = CURDATE(), fine_amount = ? WHERE id = ?',
      [fineAmount, issuedId]
    );

    // 4. Increment book available copies (safely clamped to total_copies)
    await connection.query(
      'UPDATE books SET available_copies = LEAST(total_copies, available_copies + 1) WHERE id = ?',
      [issue.book_id]
    );

    // 5. Log into transactions audit ledger
    const logNote = `Book '${issue.title}' returned by ${issue.full_name}. Fine assessed: ₹${fineAmount.toFixed(2)}. ${notes}`.trim();
    await logTransaction(connection, {
      userId: issue.user_id,
      bookId: issue.book_id,
      issuedBookId: issuedId,
      action: 'book_returned',
      notes: logNote
    });

    await connection.commit();

    return respondOrRedirect(req, res, {
      jsonStatus: 200,
      jsonData: {
        status: 'ok',
        message: `Book '${issue.title}' returned successfully! Inventory copy restored to shelf.`,
        issuedId,
        fineAssessed: fineAmount,
        daysOverdue: calc.daysOverdue
      },
      redirectUrl: '/admin/circulation/issued',
      flashType: 'success',
      flashMessage: `Book '${issue.title}' returned successfully! Fine assessed: ₹${fineAmount.toFixed(2)}.`
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error processing book return:', error);
    return res.status(500).json({ status: 'error', message: `Database error during return: ${error.message}` });
  } finally {
    connection.release();
  }
});

/**
 * GET /student/my-loans
 * Student views active borrowed books, remaining days, and overdue fine status
 */
router.get('/student/my-loans', requireStudent, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const query = `
      SELECT ib.*, b.title, b.author, b.isbn, b.cover_image, c.name AS category_name
      FROM issued_books ib
      JOIN books b ON ib.book_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE ib.user_id = ? AND ib.status IN ('issued', 'overdue')
      ORDER BY ib.due_date ASC
    `;
    const [rows] = await pool.query(query, [userId]);

    let totalActiveFines = 0.00;

    const activeLoans = rows.map((loan) => {
      const dueDateStr = loan.due_date ? (loan.due_date.toISOString ? loan.due_date.toISOString().substring(0, 10) : String(loan.due_date).substring(0, 10)) : null;
      const calc = calculateOverdueAndFine(dueDateStr, null);
      totalActiveFines += calc.fineAmount;

      return {
        ...loan,
        due_date_formatted: dueDateStr,
        days_overdue: calc.daysOverdue,
        accrued_fine: calc.fineAmount,
        is_overdue: calc.isOverdue,
        loan_period_days: LOAN_PERIOD_DAYS,
        daily_fine_rate: FINE_PER_DAY
      };
    });

    totalActiveFines = parseFloat(totalActiveFines.toFixed(2));

    const responseData = {
      status: 'ok',
      count: activeLoans.length,
      policy: {
        loanPeriodDays: LOAN_PERIOD_DAYS,
        finePerDay: FINE_PER_DAY
      },
      totalActiveFines,
      activeLoans
    };

    const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.query.format === 'json';
    if (wantsJson) {
      return res.status(200).json(responseData);
    }

    return renderView(req, res, 'student/my_books', responseData);
  } catch (error) {
    console.error('Error fetching student active loans:', error);
    return res.status(500).json({ status: 'error', message: 'Database error fetching active loans.' });
  }
});

/**
 * GET /student/loan-history
 * Student views past returned loans and full request history
 */
router.get('/student/loan-history', requireStudent, async (req, res) => {
  const userId = req.session.user.id;

  try {
    // 1. Fetch Past Returned Books
    const [pastLoans] = await pool.query(
      `SELECT ib.*, b.title, b.author, b.isbn, c.name AS category_name
       FROM issued_books ib
       JOIN books b ON ib.book_id = b.id
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE ib.user_id = ? AND ib.status = 'returned'
       ORDER BY ib.return_date DESC`,
      [userId]
    );

    // 2. Fetch All Borrow Requests
    const [requestsHistory] = await pool.query(
      `SELECT br.*, b.title, b.author, b.isbn
       FROM borrow_requests br
       JOIN books b ON br.book_id = b.id
       WHERE br.user_id = ?
       ORDER BY br.request_date DESC`,
      [userId]
    );

    const responseData = {
      status: 'ok',
      returnedLoansCount: pastLoans.length,
      requestsHistoryCount: requestsHistory.length,
      pastLoans,
      requestsHistory
    };

    const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.query.format === 'json';
    if (wantsJson) {
      return res.status(200).json(responseData);
    }

    return renderView(req, res, 'student/borrow_history', responseData);
  } catch (error) {
    console.error('Error fetching student loan history:', error);
    return res.status(500).json({ status: 'error', message: 'Database error fetching loan history.' });
  }
});

module.exports = router;
