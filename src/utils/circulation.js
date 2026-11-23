/**
 * Circulation Business Logic, Overdue Calculations & Transaction Audit Logger
 * The Archive - Library Management System (Node.js & Express Migration)
 */

const LOAN_PERIOD_DAYS = 14; // Standard loan duration: 14 days
const FINE_PER_DAY = 5.00;    // Fine rate: ₹5.00 per overdue day

/**
 * Calculate overdue days and fine amount for an issued loan
 * Exact replication of PHP's calculate_overdue_and_fine()
 * 
 * @param {string} dueDateStr - 'YYYY-MM-DD'
 * @param {string|null} returnDateStr - 'YYYY-MM-DD' or null if currently on loan
 * @returns {{ daysOverdue: number, fineAmount: number, fineRate: number, isOverdue: boolean }}
 */
function toDateString(val) {
  if (!val) return null;
  if (typeof val === 'string') return val.substring(0, 10);
  if (val instanceof Date) return val.toISOString().substring(0, 10);
  return String(val).substring(0, 10);
}

function calculateOverdueAndFine(dueDateInput, returnDateInput = null) {
  const dueDateStr = toDateString(dueDateInput);
  const returnDateStr = toDateString(returnDateInput);

  if (!dueDateStr) {
    return { daysOverdue: 0, fineAmount: 0.00, fineRate: FINE_PER_DAY, isOverdue: false };
  }

  // Parse YYYY-MM-DD strings in local Indian Standard Time (+05:30)
  const due = new Date(`${dueDateStr}T00:00:00+05:30`);
  
  let compare;
  if (returnDateStr) {
    compare = new Date(`${returnDateStr}T00:00:00+05:30`);
  } else {
    // Current date in IST
    const nowIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    compare = new Date(`${nowIST}T00:00:00+05:30`);
  }

  const diffTime = compare.getTime() - due.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    const fine = parseFloat((diffDays * FINE_PER_DAY).toFixed(2));
    return {
      daysOverdue: diffDays,
      fineAmount: fine,
      fineRate: FINE_PER_DAY,
      isOverdue: true
    };
  }

  return {
    daysOverdue: 0,
    fineAmount: 0.00,
    fineRate: FINE_PER_DAY,
    isOverdue: false
  };
}

/**
 * Log an event to the immutable transactions audit table
 * 
 * @param {object} connection - MySQL connection or pool
 * @param {object} param1 - { userId, bookId, issuedBookId, action, notes }
 */
async function logTransaction(connection, { userId, bookId, issuedBookId = null, action, notes = null }) {
  const query = `
    INSERT INTO transactions (user_id, book_id, issued_book_id, action, notes, transaction_date)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;
  await connection.query(query, [userId, bookId, issuedBookId, action, notes]);
}

/**
 * Helper to respond with JSON if client requests JSON, or redirect with flash
 */
function respondOrRedirect(req, res, { jsonStatus = 200, jsonData, redirectUrl, flashType = 'success', flashMessage }) {
  const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.query.format === 'json';
  
  if (wantsJson) {
    return res.status(jsonStatus).json(jsonData);
  }

  if (res.redirectWithFlash && flashMessage) {
    return res.redirectWithFlash(redirectUrl, flashType, flashMessage);
  }

  if (req.setFlash && flashMessage) {
    req.setFlash(flashType, flashMessage);
  }
  return res.redirect(redirectUrl);
}

module.exports = {
  LOAN_PERIOD_DAYS,
  FINE_PER_DAY,
  calculateOverdueAndFine,
  logTransaction,
  respondOrRedirect
};
