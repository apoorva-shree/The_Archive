/**
 * Transaction Audit Ledger Routes (Admin Only)
 * The Archive - Library Management System (Node.js & Express Migration)
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

/**
 * GET /admin/transactions
 * Retrieve immutable audit logs of all circulation operations
 * Supports filtering by action type and free-text search across students and books
 */
router.get('/admin/transactions', requireAdmin, async (req, res) => {
  const actionFilter = (req.query.action || 'all').trim();
  const search = (req.query.search || '').trim();

  const validActions = [
    'borrow_request',
    'request_approved',
    'request_rejected',
    'book_issued',
    'book_returned'
  ];

  try {
    let query = `
      SELECT t.*, u.full_name, u.student_id_number, u.email,
             b.title, b.author, b.isbn
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      JOIN books b ON t.book_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (validActions.includes(actionFilter)) {
      query += ' AND t.action = ?';
      params.push(actionFilter);
    }

    if (search) {
      query += ' AND (u.full_name LIKE ? OR u.student_id_number LIKE ? OR b.title LIKE ? OR t.notes LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    query += ' ORDER BY t.transaction_date DESC';

    const [transactions] = await pool.query(query, params);

    const formattedList = transactions.map((tx) => ({
      ...tx,
      transaction_date_formatted: tx.transaction_date ? (tx.transaction_date.toISOString ? tx.transaction_date.toISOString() : String(tx.transaction_date)) : null
    }));

    const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.query.format === 'json';
    if (wantsJson) {
      return res.status(200).json({
        status: 'ok',
        count: formattedList.length,
        actionFilter,
        search,
        transactions: formattedList
      });
    }

    return res.status(200).json({
      status: 'ok',
      count: formattedList.length,
      actionFilter,
      search,
      transactions: formattedList
    });
  } catch (error) {
    console.error('Error fetching transactions ledger:', error);
    return res.status(500).json({ status: 'error', message: 'Database error fetching transactions audit ledger.' });
  }
});

module.exports = router;
