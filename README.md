# The Archive - IIIT Kota Digital Library
> **Where Learning Goes Beyond Classrooms.**  
> *Your gateway to knowledge, discovery and academic excellence.*

A complete, modern, and production-grade **Library Management System** built for the **B.Tech Web Development Lab Evaluation**.

Engineered using **HTML5, CSS3, Core PHP, and MySQL** for local deployment on **XAMPP**. Built with clean code, standard security practices (session authentication, bcrypt password hashing, and prepared SQL statements), zero external frameworks, and modern SaaS-inspired UI/UX design.

---

## 1. System Credentials for Evaluation & Testing

The database comes pre-seeded with sample records, categories, books, borrow requests, active circulation loans, overdue records, and transaction logs.

| Role | Email Address | Password | Student / Roll ID | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **System Admin** | `admin@library.com` | `admin123` | `EMP-001` | Full administrative control & circulation management |
| **Student 1** | `rahul.sharma@college.edu` | `student123` | `CS2024001` | Holds an overdue book (*Clean Code*) with fine |
| **Student 2** | `priya.patel@college.edu` | `student123` | `IT2024045` | Holds an overdue book (*Adv. Math*) with fine |
| **Student 3** | `ananya.verma@college.edu` | `student123` | `EC2024018` | Holds an active on-loan book (*Algorithms*) |

> **Note:** New students can also register their own accounts through the public [register.php](register.php) page.

---

## 2. Technology Stack & Design Architecture

- **Frontend:** Semantic HTML5, Native CSS3 (Responsive Grid/Flexbox, Custom Design System, No Bootstrap/Tailwind dependencies).
- **Backend:** Pure Core PHP (Procedural & Clean OOP, Session State Management, MySQLi Prepared Statements).
- **Database:** MySQL / MariaDB (Relational schema with Foreign Keys and Cascading Integrity).
- **Environment:** Local Apache & MySQL on **XAMPP**.
- **Offline Ready:** Zero external CDNs or remote font dependencies; crisp inline vector SVGs ensure 100% functionality without internet connection.

---

## 3. Step-by-Step Installation & Setup Guide

### Step 1: Place the Project in XAMPP
1. Copy or move this `libs` folder into your XAMPP web root directory:
   ```text
   C:\xampp\htdocs\libs
   ```

### Step 2: Start Apache and MySQL Services
1. Open the **XAMPP Control Panel**.
2. Click the **Start** button next to **Apache**.
3. Click the **Start** button next to **MySQL**.
4. Ensure both services show green status indicators.

### Step 3: Import the Database via phpMyAdmin
1. Open your web browser and navigate to:
   ```text
   http://localhost/phpmyadmin
   ```
2. In the top navigation bar, click on **Databases**.
3. Under **Create database**, enter `library_management` and click **Create**.
4. Select the newly created `library_management` database from the left sidebar.
5. Click on the **Import** tab in the top menu.
6. Click **Choose File** (or **Browse**) and select `database.sql` located inside your project folder (`C:\xampp\htdocs\libs\database.sql`).
7. Scroll to the bottom and click **Import** (or **Go**).
8. phpMyAdmin will execute the script and display: *"Import has been successfully finished"*.

### Step 4: Launch the Application
1. Open your web browser and visit:
   ```text
   http://localhost/libs/
   ```
2. You will be greeted by the landing page (*"Your Gateway to Knowledge"*).
3. Click **Sign In** to log in as either Admin or Student using the demo credentials provided above.

---

## 4. Key Implemented Features

### A. Public Portal
- **Hero Section:** University library branding, call-to-action buttons, real-time dynamic statistics counter.
- **Academic Disciplines:** Category cards highlighting departments (Computer Science, Mathematics, Electronics, Fiction, Science, Business).
- **Featured Volumes Preview:** Visual book grid showing covers, titles, authors, and availability status pills.
- **Why Libraria:** Highlights key benefits of the digital system.
- **Authentication Pages:** Styled login and registration forms with client and server-side validation.

### B. Administrator Dashboard & Functionalities
1. **Analytics Dashboard:**
   - Real-time KPI cards: Total Book Volumes, Books Available on Shelves, Registered Students, Books Currently Issued, and Overdue Books.
   - Quick action shortcuts for immediate circulation operations.
   - Recent pending borrow requests queue with 1-click approval/rejection.
   - Active loan circulation overview.
2. **Book Inventory Management:**
   - **View All Books:** Tabular catalog with search (title/author/ISBN) and category filters.
   - **Add New Book:** Complete metadata form with ISBN uniqueness validation, initial copy inventory, syllabus summary, and optional book cover image upload.
   - **Edit Book:** Modify titles, authors, categories, descriptions, or adjust total copy counts (automatically recalibrates available stock).
   - **Delete Book:** Safety checks prevent accidental deletion if any copy is currently on loan or has pending requests.
3. **Student Account Management:**
   - View registered students with student roll ID, contact details, active loan counts, and pending request metrics.
   - Account status toggle: One-click suspension/reactivation of student borrowing privileges.
4. **Circulation & Loan Operations:**
   - **Borrow Requests:** Review online requests submitted by students. Approve to decrement stock and create active loan record, or reject with custom feedback remarks.
   - **Direct Book Issue:** Issue any physical book copy directly to a student at the counter without requiring an online request.
   - **Issued Books Ledger:** Comprehensive tracking of all checked-out books, due dates, and return statuses.
   - **Return Clearance:** Calculate overdue duration and accumulated fine. Record physical copy check-in, collect fines, and automatically increment available shelf stock.
   - **Overdue Tracker:** Real-time defaulters table calculating late days and penalty fees per day with student contact info.
   - **Transaction Audit History:** Permanent log of every transaction (`borrow_request`, `request_approved`, `request_rejected`, `book_issued`, `book_returned`).

### C. Student Dashboard & Functionalities
1. **Student Dashboard:**
   - Personalized metric cards: Active Loans, Pending Requests, Completed Returns, and Overdue Count.
   - Active borrowed books table displaying issue dates, return deadlines, and overdue warnings.
   - Quick preview of recent request statuses.
2. **Catalog Browsing & Search:**
   - Search books by title, author, or ISBN.
   - Filter by academic disciplines/departments.
   - Availability badges: *In Stock (X Available)* vs *Out of Stock*.
3. **Detailed Book Page & Request Submission:**
   - Full textbook syllabus scope and synopsis.
   - One-click **"Request to Borrow This Book"** button.
   - Intelligent business rules:
     - Prevents requesting when copies are out of stock.
     - Prevents duplicate pending requests for the same book.
     - Prevents borrowing if student already holds an active copy.
4. **My Borrowed Books:**
   - Displays all currently held books with live due date tracking, days remaining, or days overdue.
   - Clear fine notifications.
5. **Borrowing History:**
   - Full historical log of all returned books, return dates, and past fines.
   - Record of all submitted borrow requests with admin remarks.
6. **Student Profile & Security:**
   - View student roll number, college email, and registration timestamp.
   - Update full name and contact phone number.
   - Secure password change form with current password verification and new password hashing.

---

## 5. Database Schema & Architecture

The database `library_management` uses 6 relational tables with foreign key constraints:

```text
       +---------------+             +------------------+
       |  categories   | 1         * |      books       |
       |---------------+-------------<|------------------|
       | id (PK)       |             | id (PK)          |
       | name          |             | category_id (FK) |
       +---------------+             | isbn (UNIQUE)    |
                                     | available_copies |
                                     +--------+---------+
                                              | 1
                                              |
      +---------------+                       |
      |     users     | 1                     |
      |---------------|                       |
      | id (PK)       |                       |
      | email (UNIQUE)|                       |
      | student_id    |                       |
      | role (ENUM)   |                       |
      +-------+-------+                       |
              | 1                             | *
              +-------+-----------------------+
                      |                       |
                      | 1                     | 1
              +-------v-----------------------v--------+
              |            borrow_requests             |
              |----------------------------------------|
              | id (PK), user_id (FK), book_id (FK)    |
              | status: 'pending','approved','rejected'|
              +-------------------+--------------------+
                                  | 1
                                  |
                      +-----------v-----------+
                      |     issued_books      |
                      |-----------------------|
                      | id (PK)               |
                      | borrow_request_id (FK)|
                      | user_id (FK)          |
                      | book_id (FK)          |
                      | issue_date, due_date  |
                      | return_date           |
                      | status, fine_amount   |
                      +-----------+-----------+
                                  | 1
                                  |
                      +-----------v-----------+
                      |     transactions      |
                      |-----------------------|
                      | id (PK)               |
                      | user_id, book_id (FK) |
                      | issued_book_id (FK)   |
                      | action (ENUM), notes  |
                      +-----------------------+
```

---

## 6. Viva Questions & Code Explanation Guide

Here is a quick cheat-sheet for explaining this project during your lab viva:

### Q1: How does authentication and session management work?
> **Answer:** When a user logs in via `login.php`, their email is verified using a prepared statement against the `users` table. The password is authenticated using PHP's native `password_verify($password, $user['password'])`. Upon successful match, `session_regenerate_id(true)` is called to prevent session fixation attacks, and user credentials (`user_id`, `user_name`, `user_role`) are stored in `$_SESSION`. The helper file `includes/auth.php` guards pages using `require_admin()` or `require_student()`, redirecting unauthorized users.

### Q2: How does the system prevent SQL Injection?
> **Answer:** All database interactions across the project use MySQLi prepared statements (`$stmt = $conn->prepare(...)`, `$stmt->bind_param(...)`, `$stmt->execute()`). User inputs are never concatenated directly into SQL query strings, separating SQL execution logic from user-supplied data.

### Q3: How is XSS (Cross-Site Scripting) prevented on the frontend?
> **Answer:** All dynamic outputs displayed in HTML use the custom helper function `e($string)` defined in `config/database.php`, which wraps PHP's `htmlspecialchars($value, ENT_QUOTES, 'UTF-8')`. This converts characters like `<`, `>`, `&`, and quotes into safe HTML entities.

### Q4: How is overdue detection and fine calculation handled?
> **Answer:** The function `calculate_overdue_and_fine($due_date, $return_date)` in `config/database.php` calculates the difference between the return date (or `CURDATE()` if currently issued) and the scheduled `due_date`. If the comparison date is past the due date, it calculates:
> $$\text{Fine Amount} = (\text{Days Overdue}) \times \text{FINE\_PER\_DAY}$$
> where `FINE_PER_DAY` is configurable (default ₹5.00/day) and standard loan duration is 14 days.

### Q5: How is stock concurrency managed when books are issued or returned?
> **Answer:** 
> - When a book is issued (either via approving a request or direct issue), `available_copies` is safely decremented (`available_copies = available_copies - 1 WHERE available_copies > 0`).
> - When a book is returned, `available_copies` is incremented up to the total capacity (`LEAST(total_copies, available_copies + 1)`).
> - All critical issue and return sequences are wrapped inside MySQL transactions (`$conn->begin_transaction()`, `$conn->commit()`, and `$conn->rollback()`) to ensure atomicity.

---

## 7. Folder and File Structure

```text
libs/
├── assets/
│   ├── css/
│   │   └── style.css                 # 100% Native responsive stylesheet
│   └── images/
│       └── covers/                   # Vector SVG covers and uploaded images
├── config/
│   └── database.php                  # Database connection, constants & helpers
├── includes/
│   ├── auth.php                      # RBAC, session guards & access control
│   ├── header.php                    # Top layout, meta tags & flash alerts
│   ├── footer.php                    # Bottom layout & copyright
│   └── sidebar.php                   # Context-aware admin/student sidebar
├── admin/
│   ├── dashboard.php                 # Admin KPI metrics & quick circulation
│   ├── manage_books.php              # Books table with search & category filter
│   ├── add_book.php                  # Book creation form with cover upload
│   ├── edit_book.php                 # Book update form with stock sync
│   ├── delete_book.php               # Book deletion controller with safeguards
│   ├── manage_students.php           # Student account privileges & status toggle
│   ├── borrow_requests.php           # Request approval & rejection workflow
│   ├── issue_book.php                # Direct physical book issue desk
│   ├── issued_books.php              # Active and returned loans tracker
│   ├── return_book.php               # Book return clearance & fine collection
│   ├── overdue_books.php             # Overdue tracker with defaulter contacts
│   └── transactions.php              # Complete system audit log
├── student/
│   ├── dashboard.php                 # Student portal with personal stats
│   ├── books.php                     # Book browsing with search & filter
│   ├── book_details.php              # Single book view & request submission
│   ├── request_borrow.php            # Request submission controller
│   ├── my_books.php                  # Active borrowed books & due dates
│   ├── borrow_history.php            # History of returned books & requests
│   └── profile.php                   # Profile information & password change
├── index.php                         # Public landing page
├── login.php                         # Single login page for admin & students
├── register.php                      # Student registration page
├── logout.php                        # Session destruction & sign out
├── database.sql                      # Complete SQL dump with schema & sample data
└── README.md                         # Project documentation & setup manual
```
