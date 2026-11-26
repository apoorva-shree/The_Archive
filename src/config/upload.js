/**
 * Multer File Upload Configuration for Book Covers
 * The Archive - Library Management System (Node.js & Express Migration)
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const coversDir = path.join(__dirname, '../../assets/images/covers');

// Ensure destination directory exists
if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, coversDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `book_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, uniqueSuffix);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only images (.jpg, .jpeg, .png, .webp, .svg) are allowed for book covers.'), false);
  }
};

const uploadCover = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = uploadCover;
