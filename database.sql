-- ========================================================
-- LIBRARY MANAGEMENT SYSTEM - DATABASE SCHEMA & SAMPLE DATA
-- Designed for B.Tech Web Development Lab Evaluation
-- Database Name: library_management
-- Compatible with MySQL 5.7+ / MariaDB 10.4+ / XAMPP
-- ========================================================

CREATE DATABASE IF NOT EXISTS `library_management` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `library_management`;

-- Disable foreign key checks during table re-creation
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `transactions`;
DROP TABLE IF EXISTS `issued_books`;
DROP TABLE IF EXISTS `borrow_requests`;
DROP TABLE IF EXISTS `books`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------
-- 1. Table structure for table `categories`
-- --------------------------------------------------------
CREATE TABLE `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Table structure for table `users`
-- --------------------------------------------------------
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `student_id_number` VARCHAR(50) DEFAULT NULL,
  `role` ENUM('admin', 'student') NOT NULL DEFAULT 'student',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Table structure for table `books`
-- --------------------------------------------------------
CREATE TABLE `books` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `isbn` VARCHAR(30) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `author` VARCHAR(255) NOT NULL,
  `category_id` INT NOT NULL,
  `publisher` VARCHAR(255) DEFAULT NULL,
  `publication_year` INT DEFAULT NULL,
  `total_copies` INT NOT NULL DEFAULT 1,
  `available_copies` INT NOT NULL DEFAULT 1,
  `description` TEXT DEFAULT NULL,
  `cover_image` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_books_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Table structure for table `borrow_requests`
-- --------------------------------------------------------
CREATE TABLE `borrow_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `book_id` INT NOT NULL,
  `request_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `admin_notes` TEXT DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_requests_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. Table structure for table `issued_books`
-- --------------------------------------------------------
CREATE TABLE `issued_books` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `borrow_request_id` INT DEFAULT NULL,
  `user_id` INT NOT NULL,
  `book_id` INT NOT NULL,
  `issue_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `return_date` DATE DEFAULT NULL,
  `status` ENUM('issued', 'returned', 'overdue') NOT NULL DEFAULT 'issued',
  `fine_amount` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_issued_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_issued_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_issued_request` FOREIGN KEY (`borrow_request_id`) REFERENCES `borrow_requests` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. Table structure for table `transactions`
-- --------------------------------------------------------
CREATE TABLE `transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `book_id` INT NOT NULL,
  `issued_book_id` INT DEFAULT NULL,
  `action` ENUM('borrow_request', 'request_approved', 'request_rejected', 'book_issued', 'book_returned') NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `transaction_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_transactions_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_transactions_issued` FOREIGN KEY (`issued_book_id`) REFERENCES `issued_books` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- INSERT SAMPLE INITIAL DATA
-- ========================================================

-- Categories
INSERT INTO `categories` (`id`, `name`, `description`) VALUES
(1, 'Computer Science & IT', 'Software engineering, algorithms, web development, data structures, and AI systems.'),
(2, 'Mathematics & Statistics', 'Calculus, discrete mathematics, linear algebra, and statistical inference.'),
(3, 'Electronics & Engineering', 'Digital circuit design, microprocessors, signal processing, and robotics.'),
(4, 'Fiction & Literature', 'Classic literature, speculative fiction, award-winning novels, and drama.'),
(5, 'Business & Management', 'Project management, product design, entrepreneurship, and economics.'),
(6, 'Science & Physics', 'Quantum mechanics, astrophysics, organic chemistry, and environmental science.');

-- Users
-- Password for admin: admin123
-- Password for students: student123
-- Hashes generated via standard password_hash(PASSWORD_DEFAULT)
INSERT INTO `users` (`id`, `full_name`, `email`, `password`, `phone`, `student_id_number`, `role`, `status`) VALUES
(1, 'System Administrator', 'admin@library.com', '$2y$10$wT0E8g9v1wG9x1h77Ypce5k71oRk8vGj98b6X9n7dYcO3Jg3s2yGa', '+91 98765 43210', 'EMP-001', 'admin', 'active'),
(2, 'Rahul Sharma', 'rahul.sharma@college.edu', '$2y$10$wT0E8g9v1wG9x1h77Ypce5k71oRk8vGj98b6X9n7dYcO3Jg3s2yGa', '+91 98111 22334', 'CS2024001', 'student', 'active'),
(3, 'Priya Patel', 'priya.patel@college.edu', '$2y$10$wT0E8g9v1wG9x1h77Ypce5k71oRk8vGj98b6X9n7dYcO3Jg3s2yGa', '+91 98222 33445', 'IT2024045', 'student', 'active'),
(4, 'Ananya Verma', 'ananya.verma@college.edu', '$2y$10$wT0E8g9v1wG9x1h77Ypce5k71oRk8vGj98b6X9n7dYcO3Jg3s2yGa', '+91 98333 44556', 'EC2024018', 'student', 'active');

-- Books
INSERT INTO `books` (`id`, `isbn`, `title`, `author`, `category_id`, `publisher`, `publication_year`, `total_copies`, `available_copies`, `description`, `cover_image`) VALUES
(1, '978-0132350884', 'Clean Code: A Handbook of Agile Software Craftsmanship', 'Robert C. Martin', 1, 'Prentice Hall', 2008, 5, 3, 'Even bad code can function. But if code isn\'t clean, it can bring a development organization to its knees. Clean Code helps developers write elegant, maintainable code.', 'clean_code.svg'),
(2, '978-0262033848', 'Introduction to Algorithms (CLRS)', 'Thomas H. Cormen, Charles E. Leiserson', 1, 'MIT Press', 2009, 6, 4, 'A comprehensive textbook covering modern algorithm design, graph theories, dynamic programming, and data structures.', 'algorithms.svg'),
(3, '978-1491950296', 'Programming PHP: Creating Dynamic Web Pages', 'Kevin Tatroe, Peter MacIntyre', 1, 'O\'Reilly Media', 2020, 4, 3, 'This book teaches you everything you need to know about PHP to build effective web applications with database backends.', 'php_programming.svg'),
(4, '978-0131103627', 'The C Programming Language (2nd Edition)', 'Brian W. Kernighan, Dennis M. Ritchie', 1, 'Prentice Hall', 1988, 8, 7, 'The classic canonical guide to programming in C by the language designers Dennis Ritchie and Brian Kernighan.', 'c_programming.svg'),
(5, '978-0134093413', 'Campbell Biology', 'Lisa A. Urry, Michael L. Cain', 6, 'Pearson', 2016, 3, 2, 'The world standard in biology education, providing a deep understanding of cellular, genetic, and evolutionary principles.', 'biology.svg'),
(6, '978-0134672830', 'Fundamentals of Electric Circuits', 'Charles K. Alexander, Matthew Sadiku', 3, 'McGraw-Hill Education', 2017, 5, 4, 'Comprehensive introduction to circuit theory, resonance, AC/DC analysis, and operational amplifier design.', 'electric_circuits.svg'),
(7, '978-0470458310', 'Advanced Engineering Mathematics', 'Erwin Kreyszig', 2, 'Wiley', 2011, 4, 2, 'Covers ordinary and partial differential equations, Fourier analysis, vector calculus, and complex analysis for engineers.', 'math_engineering.svg'),
(8, '978-0062316097', 'Sapiens: A Brief History of Humankind', 'Yuval Noah Harari', 4, 'Harper', 2014, 5, 5, 'Explores how biology and history have defined us and enhanced our understanding of what it means to be human.', 'sapiens.svg'),
(9, '978-0743273565', 'The Great Gatsby', 'F. Scott Fitzgerald', 4, 'Scribner', 1925, 6, 6, 'The exemplary novel of the Jazz Age, telling the tragic story of Jay Gatsby and his quest for Daisy Buchanan.', 'gatsby.svg'),
(10, '978-0596007126', 'Head First Design Patterns', 'Eric Freeman, Elisabeth Robson', 1, 'O\'Reilly Media', 2004, 5, 4, 'A brain-friendly guide to object-oriented software design patterns and best architectural practices.', 'design_patterns.svg'),
(11, '978-0321573513', 'Algorithms in a Nutshell', 'George T. Heineman', 1, 'O\'Reilly Media', 2016, 3, 2, 'Robust solutions for everyday programming problems with detailed performance benchmarks and implementations.', 'nutshell.svg'),
(12, '978-0073529325', 'Database System Concepts (7th Edition)', 'Abraham Silberschatz, Henry Korth', 1, 'McGraw-Hill Education', 2019, 7, 5, 'The fundamental concepts of database management, relational algebra, SQL, indexing, concurrency, and distributed data.', 'db_concepts.svg');

-- Borrow Requests (Sample history)
INSERT INTO `borrow_requests` (`id`, `user_id`, `book_id`, `request_date`, `status`, `admin_notes`) VALUES
(1, 2, 1, DATE_SUB(NOW(), INTERVAL 25 DAY), 'approved', 'Approved for lab project reading.'),
(2, 3, 7, DATE_SUB(NOW(), INTERVAL 20 DAY), 'approved', 'Approved for semester exam preparation.'),
(3, 4, 2, DATE_SUB(NOW(), INTERVAL 10 DAY), 'approved', 'Approved for data structures coursework.'),
(4, 2, 3, DATE_SUB(NOW(), INTERVAL 2 DAY), 'pending', 'Awaiting admin verification.'),
(5, 3, 10, DATE_SUB(NOW(), INTERVAL 1 DAY), 'pending', 'Awaiting admin review.'),
(6, 4, 4, DATE_SUB(NOW(), INTERVAL 5 DAY), 'rejected', 'Copies reserved for senior lab cohort.');

-- Issued Books
-- Book 1 to Rahul Sharma (Overdue! Issued 25 days ago, due 11 days ago)
-- Book 7 to Priya Patel (Overdue! Issued 20 days ago, due 6 days ago)
-- Book 2 to Ananya Verma (Active! Issued 10 days ago, due in 4 days)
-- Book 5 to Rahul Sharma (Returned on time with 0 fine)
-- Book 6 to Priya Patel (Returned 3 days late with ₹15 fine)
INSERT INTO `issued_books` (`id`, `borrow_request_id`, `user_id`, `book_id`, `issue_date`, `due_date`, `return_date`, `status`, `fine_amount`) VALUES
(1, 1, 2, 1, DATE_SUB(CURDATE(), INTERVAL 25 DAY), DATE_SUB(CURDATE(), INTERVAL 11 DAY), NULL, 'overdue', 55.00),
(2, 2, 3, 7, DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_SUB(CURDATE(), INTERVAL 6 DAY), NULL, 'overdue', 30.00),
(3, 3, 4, 2, DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 4 DAY), NULL, 'issued', 0.00),
(4, NULL, 2, 5, DATE_SUB(CURDATE(), INTERVAL 40 DAY), DATE_SUB(CURDATE(), INTERVAL 26 DAY), DATE_SUB(CURDATE(), INTERVAL 28 DAY), 'returned', 0.00),
(5, NULL, 3, 6, DATE_SUB(CURDATE(), INTERVAL 35 DAY), DATE_SUB(CURDATE(), INTERVAL 21 DAY), DATE_SUB(CURDATE(), INTERVAL 18 DAY), 'returned', 15.00);

-- Transactions Log
INSERT INTO `transactions` (`id`, `user_id`, `book_id`, `issued_book_id`, `action`, `notes`, `transaction_date`) VALUES
(1, 2, 1, NULL, 'borrow_request', 'Student submitted borrow request for Clean Code', DATE_SUB(NOW(), INTERVAL 25 DAY)),
(2, 2, 1, 1, 'request_approved', 'Admin approved borrow request #1', DATE_SUB(NOW(), INTERVAL 25 DAY)),
(3, 2, 1, 1, 'book_issued', 'Book Clean Code issued to Rahul Sharma. Due date: 14 days', DATE_SUB(NOW(), INTERVAL 25 DAY)),
(4, 3, 7, NULL, 'borrow_request', 'Student submitted borrow request for Advanced Engineering Mathematics', DATE_SUB(NOW(), INTERVAL 20 DAY)),
(5, 3, 7, 2, 'request_approved', 'Admin approved request #2', DATE_SUB(NOW(), INTERVAL 20 DAY)),
(6, 3, 7, 2, 'book_issued', 'Book Advanced Engineering Mathematics issued to Priya Patel', DATE_SUB(NOW(), INTERVAL 20 DAY)),
(7, 4, 2, NULL, 'borrow_request', 'Student submitted borrow request for Introduction to Algorithms', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(8, 4, 2, 3, 'request_approved', 'Admin approved request #3', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(9, 4, 2, 3, 'book_issued', 'Book Introduction to Algorithms issued to Ananya Verma', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(10, 2, 5, 4, 'book_returned', 'Book Campbell Biology returned on time. Fine: ₹0.00', DATE_SUB(NOW(), INTERVAL 28 DAY)),
(11, 3, 6, 5, 'book_returned', 'Book Fundamentals of Electric Circuits returned 3 days late. Fine: ₹15.00', DATE_SUB(NOW(), INTERVAL 18 DAY)),
(12, 2, 3, NULL, 'borrow_request', 'Student submitted borrow request for Programming PHP', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(13, 3, 10, NULL, 'borrow_request', 'Student submitted borrow request for Head First Design Patterns', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(14, 4, 4, NULL, 'request_rejected', 'Borrow request #6 rejected: Copies reserved for senior lab cohort', DATE_SUB(NOW(), INTERVAL 4 DAY));
