/**
 * Comprehensive Phase 4 Test Suite
 * Tests Books, Borrow Requests, Circulation (Issue & Return), Overdue Calculation, and Transactions
 */

const { app, pool } = require('./server');

const BASE_URL = 'http://localhost:3000';

class SessionClient {
  constructor(name) {
    this.name = name;
    this.cookie = null;
  }

  async request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = options.headers || {};
    
    if (this.cookie) {
      headers['Cookie'] = this.cookie;
    }
    headers['Accept'] = 'application/json';

    const res = await fetch(url, {
      ...options,
      headers
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const parts = setCookie.split(';');
      this.cookie = parts[0];
    }

    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    return { status: res.status, data, headers: res.headers };
  }

  async login(email, password) {
    const res = await this.request('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({ email, password }).toString(),
      redirect: 'manual'
    });
    return res;
  }
}

async function runTests() {
  console.log('=====================================================');
  console.log('  STARTING PHASE 4 INTEGRATION TEST SUITE           ');
  console.log('=====================================================\n');

  const adminClient = new SessionClient('Admin');
  const studentClient = new SessionClient('Student');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  let createdBookId = null;
  let createdRequestId = null;
  let createdIssuedId = null;

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: PUBLIC CATALOG & CATEGORIES
    // -------------------------------------------------------------------------
    console.log('\n--- Section 1: Books & Categories Catalog ---');
    
    // Test 1: GET /categories
    const catRes = await adminClient.request('/categories');
    assert(catRes.status === 200 && Array.isArray(catRes.data.categories) && catRes.data.categories.length > 0,
      `GET /categories returns 200 with ${catRes.data.categories?.length} categories.`);

    // Test 2: GET /books (all)
    const booksRes = await adminClient.request('/books?format=json');
    assert(booksRes.status === 200 && Array.isArray(booksRes.data.books) && booksRes.data.books.length > 0,
      `GET /books returns 200 with ${booksRes.data.books?.length} books.`);

    // Test 3: GET /books with search query
    const searchRes = await adminClient.request('/books?search=Clean&format=json');
    assert(searchRes.status === 200 && searchRes.data.books.some(b => b.title.includes('Clean Code')),
      'GET /books?search=Clean finds "Clean Code" volume.');

    // Test 4: GET /books with category filter
    const filterRes = await adminClient.request('/books?category=1&format=json');
    assert(filterRes.status === 200 && filterRes.data.books.every(b => b.category_id === 1),
      'GET /books?category=1 filters books exclusively in category 1.');

    // Test 5: GET /books/:id
    const singleBookRes = await adminClient.request('/books/1');
    assert(singleBookRes.status === 200 && singleBookRes.data.book.id === 1,
      `GET /books/1 returns single book record "${singleBookRes.data.book?.title}".`);

    // -------------------------------------------------------------------------
    // SECTION 2: AUTHENTICATION & ADMIN BOOK MANAGEMENT (CRUD)
    // -------------------------------------------------------------------------
    console.log('\n--- Section 2: Admin Book CRUD & Stock Logic ---');

    // Test 6: Admin login
    const adminLoginRes = await adminClient.login('admin@library.com', 'admin123');
    assert(adminLoginRes.status === 302 || adminLoginRes.status === 200,
      'Admin login succeeds with session creation.');

    // Test 7: Unauthorized student attempting admin add book
    const anonAddRes = await studentClient.request('/admin/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hacker Book', isbn: '999-0000000000' })
    });
    assert(anonAddRes.status === 302 || anonAddRes.status === 403 || anonAddRes.status === 401,
      'Unauthenticated request to /admin/books is blocked.');

    // Test 8: Admin creates a new book
    const testIsbn = `978-TEST-${Date.now().toString().substring(6)}`;
    const newBookPayload = {
      title: 'Automated Test Systems in Node.js',
      author: 'Antigravity AI',
      category_id: '1',
      isbn: testIsbn,
      publisher: 'Lab Evaluation Press',
      publication_year: '2026',
      total_copies: '4',
      description: 'Test volume for circulation validation.'
    };
    const addBookRes = await adminClient.request('/admin/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(newBookPayload).toString()
    });
    assert(addBookRes.status === 201 && addBookRes.data.bookId > 0,
      `Admin successfully added book with ID ${addBookRes.data.bookId}.`);
    createdBookId = addBookRes.data.bookId;

    // Test 9: Prevent duplicate ISBN insertion
    const dupIsbnRes = await adminClient.request('/admin/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(newBookPayload).toString()
    });
    assert(dupIsbnRes.status === 409,
      'Duplicate ISBN book addition correctly rejected with HTTP 409.');

    // Test 10: Admin edits the book and verifies proportional available copies adjustment
    const editBookPayload = {
      ...newBookPayload,
      title: 'Automated Test Systems in Node.js (Updated Edition)',
      total_copies: '6' // increased by 2
    };
    const editBookRes = await adminClient.request(`/admin/books/${createdBookId}/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(editBookPayload).toString()
    });
    assert(editBookRes.status === 200,
      'Admin updated book successfully.');

    // Verify stock adjustment in database: old 4 -> new 6, so available should be 4 + 2 = 6
    const [bookStockCheck] = await pool.query('SELECT total_copies, available_copies FROM books WHERE id = ?', [createdBookId]);
    assert(bookStockCheck[0].total_copies === 6 && bookStockCheck[0].available_copies === 6,
      `Proportional available copies adjusted correctly: total=${bookStockCheck[0].total_copies}, available=${bookStockCheck[0].available_copies}.`);

    // -------------------------------------------------------------------------
    // SECTION 3: STUDENT BORROW REQUESTS & DUPLICATE PREVENTION
    // -------------------------------------------------------------------------
    console.log('\n--- Section 3: Student Borrow Requests & Workflow ---');

    // Test 11: Student login
    const studentLoginRes = await studentClient.login('rahul.sharma@college.edu', 'student123');
    assert(studentLoginRes.status === 302 || studentLoginRes.status === 200,
      'Student login succeeds with student session.');

    // Test 12: Student submits borrow request for newly created book
    const borrowReqRes = await studentClient.request('/student/borrow-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ book_id: String(createdBookId) }).toString()
    });
    assert(borrowReqRes.status === 201 && borrowReqRes.data.requestId > 0,
      `Student successfully submitted borrow request #BR-${borrowReqRes.data.requestId}.`);
    createdRequestId = borrowReqRes.data.requestId;

    // Test 13: Prevent duplicate pending borrow request for the same book
    const dupBorrowReqRes = await studentClient.request('/student/borrow-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ book_id: String(createdBookId) }).toString()
    });
    assert(dupBorrowReqRes.status === 409,
      'Duplicate pending borrow request rejected with HTTP 409 Conflict.');

    // Test 14: Student views their own borrow requests
    const studentReqList = await studentClient.request('/student/borrow-requests');
    assert(studentReqList.status === 200 && studentReqList.data.requests.some(r => r.id === createdRequestId),
      'Student borrow requests endpoint lists the submitted pending request.');

    // -------------------------------------------------------------------------
    // SECTION 4: ADMIN APPROVAL & BOOK ISSUE (TRANSACTIONAL)
    // -------------------------------------------------------------------------
    console.log('\n--- Section 4: Admin Request Approval & Issue ---');

    // Test 15: Admin views pending borrow requests
    const adminReqList = await adminClient.request('/admin/borrow-requests?status=pending');
    assert(adminReqList.status === 200 && adminReqList.data.requests.some(r => r.id === createdRequestId),
      'Admin view of pending borrow requests shows student request.');

    // Test 16: Admin approves the borrow request
    const approveRes = await adminClient.request(`/admin/borrow-requests/${createdRequestId}/approve`, {
      method: 'POST'
    });
    assert(approveRes.status === 200 && approveRes.data.issuedBookId > 0,
      `Admin approved request #BR-${createdRequestId}; Book issued record #IB-${approveRes.data.issuedBookId} generated.`);
    createdIssuedId = approveRes.data.issuedBookId;

    // Test 17: Verify stock decrement and issued_books table state
    const [afterApprovalStock] = await pool.query('SELECT available_copies FROM books WHERE id = ?', [createdBookId]);
    assert(afterApprovalStock[0].available_copies === 5, // Decremented from 6 to 5
      `Inventory available copies accurately decremented from 6 to 5 (currently ${afterApprovalStock[0].available_copies}).`);

    // Test 18: Verify transaction logged for approval & issue
    const [txRows] = await pool.query('SELECT action, notes FROM transactions WHERE issued_book_id = ?', [createdIssuedId]);
    assert(txRows.length > 0 && txRows[0].action === 'book_issued',
      `Audit ledger logged 'book_issued' transaction for issued record #IB-${createdIssuedId}.`);

    // Test 19: Student cannot borrow another copy while already holding active loan
    const activeLoanDupReq = await studentClient.request('/student/borrow-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ book_id: String(createdBookId) }).toString()
    });
    assert(activeLoanDupReq.status === 409,
      'Student request blocked because student currently holds active loan for this book.');

    // -------------------------------------------------------------------------
    // SECTION 5: CIRCULATION DESK (DIRECT ISSUE, LISTING, OVERDUE & FINES)
    // -------------------------------------------------------------------------
    console.log('\n--- Section 5: Circulation Desk, Overdue & Fines Calculation ---');

    // Test 20: Admin direct issue of another book to Priya Patel (user_id = 3)
    const directIssueRes = await adminClient.request('/admin/circulation/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        user_id: '3',
        book_id: String(createdBookId),
        loan_days: '14'
      }).toString()
    });
    assert(directIssueRes.status === 201 && directIssueRes.data.issuedId > 0,
      `Direct issue by admin successful (Issued ID: ${directIssueRes.data.issuedId}).`);
    const directIssuedId = directIssueRes.data.issuedId;

    // Verify stock decremented again (from 5 to 4)
    const [afterDirectStock] = await pool.query('SELECT available_copies FROM books WHERE id = ?', [createdBookId]);
    assert(afterDirectStock[0].available_copies === 4,
      `Inventory available copies decremented from 5 to 4.`);

    // Test 21: Prevent duplicate direct issue to Priya Patel for same book
    const dupDirectIssue = await adminClient.request('/admin/circulation/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        user_id: '3',
        book_id: String(createdBookId),
        loan_days: '14'
      }).toString()
    });
    assert(dupDirectIssue.status === 409,
      'Duplicate direct issue prevented with HTTP 409 Conflict.');

    // Test 22: GET /admin/circulation/issued
    const issuedListRes = await adminClient.request('/admin/circulation/issued?status=active');
    assert(issuedListRes.status === 200 && Array.isArray(issuedListRes.data.issued) && issuedListRes.data.issued.length >= 2,
      `Active circulation list returned ${issuedListRes.data.issued.length} active loans.`);

    // Test 23: GET /admin/circulation/overdue
    const overdueRes = await adminClient.request('/admin/circulation/overdue');
    assert(overdueRes.status === 200 && overdueRes.data.metrics.dailyFineRate === 5.00,
      `Overdue tracker returned metrics: Rate=₹${overdueRes.data.metrics.dailyFineRate}, Total Fines=₹${overdueRes.data.metrics.totalFinesAccumulated}, Overdue Count=${overdueRes.data.metrics.totalOverdueCount}.`);

    // Verify overdue fine computation is exact: days_overdue * 5.00
    for (const ov of overdueRes.data.overdueList) {
      const expectedFine = parseFloat((ov.days_overdue * 5.00).toFixed(2));
      assert(ov.calculated_fine === expectedFine,
        `Fine for #IB-${ov.id} correctly computed: ${ov.days_overdue} days late * ₹5.00 = ₹${ov.calculated_fine}.`);
    }

    // -------------------------------------------------------------------------
    // SECTION 6: BOOK RETURN CLEARANCE & INVENTORY RESTORATION
    // -------------------------------------------------------------------------
    console.log('\n--- Section 6: Book Return Clearance & Inventory Restoration ---');

    // Test 24: Admin processes return for directIssuedId
    const returnRes = await adminClient.request(`/admin/circulation/return/${directIssuedId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ return_notes: 'Returned in pristine condition.' }).toString()
    });
    assert(returnRes.status === 200 && returnRes.data.status === 'ok',
      `Return of #IB-${directIssuedId} processed successfully.`);

    // Test 25: Verify inventory restored to shelf (+1 copy)
    const [restoredStock] = await pool.query('SELECT available_copies FROM books WHERE id = ?', [createdBookId]);
    assert(restoredStock[0].available_copies === 5,
      `Inventory copy returned to shelf: available_copies restored from 4 to 5.`);

    // Test 26: Prevent duplicate return
    const dupReturnRes = await adminClient.request(`/admin/circulation/return/${directIssuedId}`, {
      method: 'POST'
    });
    assert(dupReturnRes.status === 400,
      'Duplicate return attempt on already returned book rejected with HTTP 400.');

    // Also return Rahul's issued book createdIssuedId
    await adminClient.request(`/admin/circulation/return/${createdIssuedId}`, { method: 'POST' });
    const [finalStock] = await pool.query('SELECT available_copies FROM books WHERE id = ?', [createdBookId]);
    assert(finalStock[0].available_copies === 6,
      `Second copy returned: available_copies restored back to full 6 copies.`);

    // -------------------------------------------------------------------------
    // SECTION 7: STUDENT LOANS & HISTORY ENDPOINTS
    // -------------------------------------------------------------------------
    console.log('\n--- Section 7: Student Loans & Circulation History ---');

    // Test 27: Student active loans
    const myLoansRes = await studentClient.request('/student/my-loans');
    assert(myLoansRes.status === 200 && myLoansRes.data.policy.finePerDay === 5.00,
      `Student my-loans endpoint reports policy: ₹${myLoansRes.data.policy.finePerDay}/day.`);

    // Test 28: Student loan history
    const myHistoryRes = await studentClient.request('/student/loan-history');
    assert(myHistoryRes.status === 200 && myHistoryRes.data.pastLoans.some(p => p.id === createdIssuedId),
      `Student loan history reflects returned book #IB-${createdIssuedId}.`);

    // -------------------------------------------------------------------------
    // SECTION 8: TRANSACTIONS AUDIT LEDGER
    // -------------------------------------------------------------------------
    console.log('\n--- Section 8: Transactions Audit Ledger ---');

    // Test 29: Admin views transactions ledger
    const txLedgerRes = await adminClient.request('/admin/transactions?action=all');
    assert(txLedgerRes.status === 200 && txLedgerRes.data.transactions.length > 0,
      `Transactions audit ledger returns ${txLedgerRes.data.transactions.length} audit entries.`);

    // Test 30: Admin filters ledger by action 'book_returned'
    const returnTxRes = await adminClient.request('/admin/transactions?action=book_returned');
    assert(returnTxRes.status === 200 && returnTxRes.data.transactions.every(t => t.action === 'book_returned'),
      'Transaction ledger correctly filters strictly by "book_returned" action.');

    // -------------------------------------------------------------------------
    // SECTION 9: BOOK DELETION SAFETY CHECKS
    // -------------------------------------------------------------------------
    console.log('\n--- Section 9: Book Deletion Guards & Cleanup ---');

    // Test 31: Delete book with active loans is blocked
    const [issuedBook] = await pool.query('SELECT book_id FROM issued_books WHERE status IN ("issued", "overdue") LIMIT 1');
    if (issuedBook.length > 0) {
      const blockedDelete = await adminClient.request(`/admin/books/${issuedBook[0].book_id}/delete`, { method: 'POST' });
      assert(blockedDelete.status === 400,
        `Safety guard: Admin cannot delete book with active loans on students (HTTP 400 rejected).`);
    }

    // Clean up created test records from transactions, issued_books, borrow_requests, and delete test book
    await pool.query('DELETE FROM transactions WHERE book_id = ?', [createdBookId]);
    await pool.query('DELETE FROM issued_books WHERE book_id = ?', [createdBookId]);
    await pool.query('DELETE FROM borrow_requests WHERE book_id = ?', [createdBookId]);
    
    // Test 32: Admin safely deletes test book after all loans cleared
    const deleteTestBookRes = await adminClient.request(`/admin/books/${createdBookId}/delete`, { method: 'POST' });
    assert(deleteTestBookRes.status === 200,
      `Admin successfully removed test book ID ${createdBookId} after complete test run.`);

    console.log('\n=====================================================');
    console.log(`  ALL ${passedTests} OF ${totalTests} INTEGRATION TESTS PASSED!`);
    console.log('=====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n[FATAL ERROR IN TEST SUITE]:', err);
    // Cleanup on failure
    if (createdBookId) {
      await pool.query('DELETE FROM transactions WHERE book_id = ?', [createdBookId]).catch(() => {});
      await pool.query('DELETE FROM issued_books WHERE book_id = ?', [createdBookId]).catch(() => {});
      await pool.query('DELETE FROM borrow_requests WHERE book_id = ?', [createdBookId]).catch(() => {});
      await pool.query('DELETE FROM books WHERE id = ?', [createdBookId]).catch(() => {});
    }
    process.exit(1);
  }
}

// Start server process if not running, then execute tests
runTests();
