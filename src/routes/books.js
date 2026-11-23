/**
 * Books and Categories Management Routes
 * The Archive - Library Management System (Node.js & Express Migration)
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { requireLogin, requireAdmin, requireStudent } = require('../middleware/auth');
const uploadCover = require('../config/upload');
const { respondOrRedirect } = require('../utils/circulation');

// Helper to fetch filtered catalog
async function fetchCatalog(search, categoryFilter) {
  let query = `
    SELECT b.*, c.name AS category_name, c.description AS category_description
    FROM books b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ' AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  if (categoryFilter > 0) {
    query += ' AND b.category_id = ?';
    params.push(categoryFilter);
  }

  query += ' ORDER BY b.title ASC';

  const [books] = await pool.query(query, params);
  const [categories] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
  return { books, categories };
}

// GET /categories - Retrieve all category departments
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.status(200).json({ status: 'ok', count: categories.length, categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ status: 'error', message: 'Database error fetching categories.' });
  }
});

// GET /books - Search and list book catalog (Universal)
router.get('/books', async (req, res) => {
  const search = (req.query.search || '').trim();
  const categoryFilter = parseInt(req.query.category, 10) || 0;

  try {
    const { books, categories } = await fetchCatalog(search, categoryFilter);

    const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.query.format === 'json';
    if (wantsJson) {
      return res.status(200).json({
        status: 'ok',
        count: books.length,
        search,
        categoryFilter,
        books,
        categories
      });
    }

    if (req.session && req.session.user && req.session.user.role === 'admin') {
      return res.render('admin/manage_books', { books, categories, search, categoryFilter });
    }
    return res.render('student/books', { books, categories, search, categoryFilter });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ status: 'error', message: 'Database error while searching catalog.' });
  }
});

// GET /admin/books - Manage Books Catalog (Admin)
router.get('/admin/books', requireAdmin, async (req, res) => {
  const search = (req.query.search || '').trim();
  const categoryFilter = parseInt(req.query.category, 10) || 0;

  try {
    const { books, categories } = await fetchCatalog(search, categoryFilter);

    const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.query.format === 'json';
    if (wantsJson) {
      return res.status(200).json({ status: 'ok', count: books.length, search, categoryFilter, books, categories });
    }

    res.render('admin/manage_books', { books, categories, search, categoryFilter });
  } catch (error) {
    console.error('Error loading admin books:', error);
    res.status(500).send('Database error loading books management.');
  }
});

// GET /admin/books/add - Show Add Book Form (Admin)
router.get('/admin/books/add', requireAdmin, async (req, res) => {
  try {
    const [categories] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.render('admin/add_book', { categories, form: {}, error: '' });
  } catch (error) {
    console.error('Error loading add book form:', error);
    res.status(500).send('Database error loading add book form.');
  }
});

// GET /admin/books/:id/edit - Show Edit Book Form (Admin)
router.get('/admin/books/:id/edit', requireAdmin, async (req, res) => {
  const bookId = parseInt(req.params.id, 10);
  if (!bookId || bookId <= 0) {
    return res.redirect('/admin/books');
  }

  try {
    const [rows] = await pool.query('SELECT * FROM books WHERE id = ? LIMIT 1', [bookId]);
    if (rows.length === 0) {
      return res.redirect('/admin/books');
    }
    const [categories] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.render('admin/edit_book', { book: rows[0], categories, error: '' });
  } catch (error) {
    console.error('Error loading edit book form:', error);
    res.status(500).send('Database error loading edit book form.');
  }
});

// GET /student/books - Browse Books (Student)
router.get('/student/books', requireStudent, async (req, res) => {
  const search = (req.query.search || '').trim();
  const categoryFilter = parseInt(req.query.category, 10) || 0;

  try {
    const { books, categories } = await fetchCatalog(search, categoryFilter);

    const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.query.format === 'json';
    if (wantsJson) {
      return res.status(200).json({ status: 'ok', count: books.length, search, categoryFilter, books, categories });
    }

    res.render('student/books', { books, categories, search, categoryFilter });
  } catch (error) {
    console.error('Error loading student books:', error);
    res.status(500).send('Database error loading books catalog.');
  }
});

// Helper for single book details
async function fetchSingleBookDetails(bookId, userId) {
  const [rows] = await pool.query(
    `SELECT b.*, c.name AS category_name, c.description AS category_description
     FROM books b
     LEFT JOIN categories c ON b.category_id = c.id
     WHERE b.id = ? LIMIT 1`,
    [bookId]
  );

  if (rows.length === 0) return null;
  const book = rows[0];

  let userBorrowStatus = { hasActiveIssue: false, hasPendingRequest: false };

  if (userId) {
    const [issues] = await pool.query(
      "SELECT id, due_date FROM issued_books WHERE user_id = ? AND book_id = ? AND status IN ('issued', 'overdue') LIMIT 1",
      [userId, bookId]
    );
    if (issues.length > 0) {
      userBorrowStatus.hasActiveIssue = true;
      userBorrowStatus.activeIssue = issues[0];
    }

    const [requests] = await pool.query(
      "SELECT id, request_date FROM borrow_requests WHERE user_id = ? AND book_id = ? AND status = 'pending' LIMIT 1",
      [userId, bookId]
    );
    if (requests.length > 0) {
      userBorrowStatus.hasPendingRequest = true;
      userBorrowStatus.pendingRequest = requests[0];
    }
  }

  return { book, userBorrowStatus };
}

// GET /student/books/:id - Book Details View (Student)
router.get('/student/books/:id', requireStudent, async (req, res) => {
  const bookId = parseInt(req.params.id, 10);
  if (!bookId || bookId <= 0) {
    return res.redirect('/student/books');
  }

  try {
    const result = await fetchSingleBookDetails(bookId, req.session.user.id);
    if (!result) {
      return res.redirect('/student/books');
    }

    const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.query.format === 'json';
    if (wantsJson) {
      return res.status(200).json({ status: 'ok', book: result.book, userBorrowStatus: result.userBorrowStatus });
    }

    res.render('student/book_details', { book: result.book, userBorrowStatus: result.userBorrowStatus });
  } catch (error) {
    console.error('Error fetching student book details:', error);
    res.status(500).send('Database error fetching book details.');
  }
});

// GET /books/:id - Get details of a single volume
router.get('/books/:id', async (req, res) => {
  const bookId = parseInt(req.params.id, 10);
  if (!bookId || bookId <= 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid Book ID provided.' });
  }

  try {
    const userId = (req.session && req.session.user && req.session.user.role === 'student') ? req.session.user.id : null;
    const result = await fetchSingleBookDetails(bookId, userId);

    if (!result) {
      return res.status(404).json({ status: 'error', message: 'Book not found in library catalog.' });
    }

    const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.query.format === 'json';
    if (wantsJson) {
      return res.status(200).json({
        status: 'ok',
        book: result.book,
        userBorrowStatus: result.userBorrowStatus
      });
    }

    res.render('student/book_details', { book: result.book, userBorrowStatus: result.userBorrowStatus });
  } catch (error) {
    console.error('Error fetching book details:', error);
    res.status(500).json({ status: 'error', message: 'Database error fetching book details.' });
  }
});

// POST /admin/books - Add a new book (Admin Only)
router.post('/admin/books', requireAdmin, (req, res) => {
  uploadCover.single('cover_image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ status: 'error', message: err.message });
    }

    const title = (req.body.title || '').trim();
    const author = (req.body.author || '').trim();
    const categoryId = parseInt(req.body.category_id, 10) || 0;
    const isbn = (req.body.isbn || '').trim();
    const publisher = (req.body.publisher || '').trim();
    const publicationYear = parseInt(req.body.publication_year, 10) || new Date().getFullYear();
    const totalCopies = parseInt(req.body.total_copies, 10) || 1;
    const description = (req.body.description || '').trim();

    if (!title || !author || categoryId <= 0 || !isbn) {
      return res.status(400).json({
        status: 'error',
        message: 'Please fill in all mandatory fields (Title, Author, Category, and ISBN).'
      });
    }

    if (totalCopies < 1) {
      return res.status(400).json({ status: 'error', message: 'Total copies must be at least 1.' });
    }

    try {
      // Validate ISBN uniqueness
      const [existing] = await pool.query('SELECT id FROM books WHERE isbn = ? LIMIT 1', [isbn]);
      if (existing.length > 0) {
        return res.status(409).json({ status: 'error', message: 'A book with this ISBN already exists in the catalog.' });
      }

      const coverImage = req.file ? req.file.filename : 'default_book.svg';
      const availableCopies = totalCopies;

      const [result] = await pool.query(
        `INSERT INTO books (isbn, title, author, category_id, publisher, publication_year, total_copies, available_copies, description, cover_image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [isbn, title, author, categoryId, publisher || null, publicationYear, totalCopies, availableCopies, description || null, coverImage]
      );

      return respondOrRedirect(req, res, {
        jsonStatus: 201,
        jsonData: {
          status: 'ok',
          message: `Book '${title}' added successfully to the catalog.`,
          bookId: result.insertId
        },
        redirectUrl: '/admin/books',
        flashType: 'success',
        flashMessage: `Book '${title}' added successfully to the catalog.`
      });
    } catch (error) {
      console.error('Database error adding book:', error);
      res.status(500).json({ status: 'error', message: 'Database error while saving the book.' });
    }
  });
});

// POST /admin/books/:id/edit - Edit existing book (Admin Only)
router.post('/admin/books/:id/edit', requireAdmin, (req, res) => {
  uploadCover.single('cover_image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ status: 'error', message: err.message });
    }

    const bookId = parseInt(req.params.id, 10);
    if (!bookId || bookId <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid Book ID provided.' });
    }

    const title = (req.body.title || '').trim();
    const author = (req.body.author || '').trim();
    const categoryId = parseInt(req.body.category_id, 10) || 0;
    const isbn = (req.body.isbn || '').trim();
    const publisher = (req.body.publisher || '').trim();
    const publicationYear = parseInt(req.body.publication_year, 10) || new Date().getFullYear();
    const totalCopies = parseInt(req.body.total_copies, 10) || 1;
    const description = (req.body.description || '').trim();

    if (!title || !author || categoryId <= 0 || !isbn) {
      return res.status(400).json({
        status: 'error',
        message: 'Please fill in all mandatory fields (Title, Author, Category, and ISBN).'
      });
    }

    if (totalCopies < 1) {
      return res.status(400).json({ status: 'error', message: 'Total copies must be at least 1.' });
    }

    try {
      // 1. Fetch current book record
      const [existing] = await pool.query('SELECT * FROM books WHERE id = ? LIMIT 1', [bookId]);
      if (existing.length === 0) {
        return res.status(404).json({ status: 'error', message: 'Book record not found.' });
      }
      const currentBook = existing[0];

      // 2. Check ISBN uniqueness excluding this book
      const [duplicate] = await pool.query('SELECT id FROM books WHERE isbn = ? AND id != ? LIMIT 1', [isbn, bookId]);
      if (duplicate.length > 0) {
        return res.status(409).json({ status: 'error', message: 'Another book in the catalog already uses this ISBN.' });
      }

      // 3. Proportional available copies adjustment (replicates PHP edit_book.php lines 69-73)
      const diff = totalCopies - currentBook.total_copies;
      const newAvailable = Math.min(totalCopies, Math.max(0, currentBook.available_copies + diff));

      const coverImage = req.file ? req.file.filename : currentBook.cover_image;

      await pool.query(
        `UPDATE books SET 
           isbn = ?, title = ?, author = ?, category_id = ?, publisher = ?, 
           publication_year = ?, total_copies = ?, available_copies = ?, description = ?, cover_image = ?
         WHERE id = ?`,
        [isbn, title, author, categoryId, publisher || null, publicationYear, totalCopies, newAvailable, description || null, coverImage, bookId]
      );

      return respondOrRedirect(req, res, {
        jsonStatus: 200,
        jsonData: {
          status: 'ok',
          message: `Book '${title}' updated successfully.`,
          bookId
        },
        redirectUrl: '/admin/books',
        flashType: 'success',
        flashMessage: `Book '${title}' updated successfully.`
      });
    } catch (error) {
      console.error('Database error editing book:', error);
      res.status(500).json({ status: 'error', message: 'Database error updating book record.' });
    }
  });
});

// POST /admin/books/:id/delete - Delete book with safety checks (Admin Only)
router.post('/admin/books/:id/delete', requireAdmin, async (req, res) => {
  const bookId = parseInt(req.params.id, 10);
  if (!bookId || bookId <= 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid Book ID provided.' });
  }

  try {
    // 1. Safety Check: Are any copies currently on loan?
    const [issuedCheck] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM issued_books WHERE book_id = ? AND status IN ('issued', 'overdue')",
      [bookId]
    );
    if (issuedCheck[0].cnt > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Deletion rejected: Active copies of this book are currently on loan to students. Record returns before deleting.'
      });
    }

    // 2. Safety Check: Are there pending borrow requests?
    const [requestCheck] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM borrow_requests WHERE book_id = ? AND status = 'pending'",
      [bookId]
    );
    if (requestCheck[0].cnt > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Deletion rejected: There are pending borrow requests for this book. Review or reject requests before deleting.'
      });
    }

    // 3. Fetch title for confirmation message
    const [bookRows] = await pool.query('SELECT title FROM books WHERE id = ? LIMIT 1', [bookId]);
    if (bookRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Book record not found.' });
    }
    const bookTitle = bookRows[0].title;

    // 4. Perform deletion
    await pool.query('DELETE FROM books WHERE id = ?', [bookId]);

    return respondOrRedirect(req, res, {
      jsonStatus: 200,
      jsonData: {
        status: 'ok',
        message: `Book '${bookTitle}' was successfully removed from the catalog.`
      },
      redirectUrl: '/admin/books',
      flashType: 'success',
      flashMessage: `Book '${bookTitle}' was successfully removed from the catalog.`
    });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({
      status: 'error',
      message: 'Could not delete book due to relational database integrity constraints.'
    });
  }
});

module.exports = router;
