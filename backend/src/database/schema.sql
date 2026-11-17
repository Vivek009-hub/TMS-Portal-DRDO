-- Training Management Portal Database Schema
-- Run via: npm run db:init (initial commands used to run database for first seeding)
--
-- Layout note: lookup/master tables first (normalized — referenced by FK instead of
-- repeating free text across participants/faculty/organization authorities/etc.),
-- then Phase-1 entity tables (Participants, Courses, Faculty, Organization Authorities),
-- then existing unchanged modules, then later-phase tables (Certificates overhaul fields,
-- structured Schedule/Theory-Lecture/Results/Regimental-Fund/Honorarium) which exist for
-- schema stability but have no backend/frontend wired up yet.

CREATE DATABASE IF NOT EXISTS training_portal
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE training_portal;

-- Users (authentication & roles)
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role ENUM('super_admin', 'admin', 'user') NOT NULL DEFAULT 'user',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_active (is_active),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- Master / lookup tables — normalized, referenced by FK from
-- Participants, Faculty, Organization Authorities, Courses, etc.
-- ============================================================

CREATE TABLE IF NOT EXISTS ranks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS departments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS designations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS institutes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50) NULL,
  fax VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  address TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS medical_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Fixed set of document-checklist items for participants (extensible)
CREATE TABLE IF NOT EXISTS document_types (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- Courses (Phase 1 — expanded)
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  instructor VARCHAR(255) NULL,
  venue VARCHAR(255) NULL,
  duration_days INT UNSIGNED DEFAULT 0,
  start_date DATE NULL,
  end_date DATE NULL,
  financial_year VARCHAR(9) NULL COMMENT 'e.g. 2025-2026',
  authorized_seats INT UNSIGNED NULL COMMENT 'sanctioned intake for this course run',
  total_seats INT UNSIGNED DEFAULT 50 COMMENT 'seats actually offered this run',
  status ENUM('draft', 'scheduled', 'running', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_courses_status (status),
  INDEX idx_courses_dates (start_date, end_date),
  INDEX idx_courses_financial_year (financial_year),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Department-wise seat allocation per course
CREATE TABLE IF NOT EXISTS course_seat_allocations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  department_id INT UNSIGNED NOT NULL,
  allocated_seats INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uk_course_department (course_id, department_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- Faculty (Phase 1 — new)
-- ============================================================
CREATE TABLE IF NOT EXISTS faculty (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  rank_id INT UNSIGNED NULL,
  designation_id INT UNSIGNED NULL,
  institute_id INT UNSIGNED NULL,
  mobile VARCHAR(20) NULL,
  email VARCHAR(255) NULL,
  address TEXT NULL,
  expertise VARCHAR(500) NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_faculty_status (status),
  FOREIGN KEY (rank_id) REFERENCES ranks(id) ON DELETE SET NULL,
  FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE SET NULL,
  FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Faculty assignment to courses (many-to-many)
CREATE TABLE IF NOT EXISTS course_faculty (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  faculty_id INT UNSIGNED NOT NULL,
  role VARCHAR(100) NULL COMMENT 'e.g. Lead Instructor, Guest Faculty',
  show_on_certificate BOOLEAN NOT NULL DEFAULT 0 COMMENT 'Included in the faculty signature block on generated certificates',
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_course_faculty (course_id, faculty_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- Organization Authorities (Phase 1 — new)
-- One flexible table for Director / Associate Director / Officer In Charge
-- (institute-wide, course_id NULL) and Course Director / Course Coordinator /
-- Course Supervisor / Course Assistants / Training Instructors / Training Staff
-- (course-scoped, course_id set). Multiple rows per type+course are allowed.
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_authorities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  -- Free-form slug (not an ENUM) so admins can add authority types beyond the
  -- built-in set from the UI. 'director' / 'associate_director' / 'course_director'
  -- are treated as semantically special by certificate generation (see
  -- certificateService.js resolveSignatory) — every other value is purely descriptive.
  authority_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  rank_id INT UNSIGNED NULL,
  designation_id INT UNSIGNED NULL,
  mobile VARCHAR(20) NULL,
  course_id INT UNSIGNED NULL COMMENT 'NULL = institute-wide role',
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_authorities_type (authority_type),
  INDEX idx_authorities_course (course_id),
  FOREIGN KEY (rank_id) REFERENCES ranks(id) ON DELETE SET NULL,
  FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE SET NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- Participants (Phase 1 — expanded to the full spec field set)
-- ============================================================
CREATE TABLE IF NOT EXISTS participants (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL UNIQUE,
  service_number VARCHAR(50) NOT NULL UNIQUE,
  rank_id INT UNSIGNED NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  mobile_number VARCHAR(20) NULL,
  email VARCHAR(255) NULL COMMENT 'retained for optional portal-account linkage',
  date_of_birth DATE NULL,
  educational_qualification VARCHAR(255) NULL,
  qualifying_essential_education TINYINT(1) NULL,
  date_of_appointment DATE NULL,
  date_of_retirement DATE NULL,
  unit_address TEXT NULL,
  pin_code VARCHAR(10) NULL,
  medical_category_id INT UNSIGNED NULL,
  date_of_reporting DATE NULL,
  reporting_time_session ENUM('FN', 'AN') NULL,
  movement_order_number VARCHAR(100) NULL,
  movement_order_date DATE NULL,
  department_id INT UNSIGNED NULL,
  remarks TEXT NULL,
  signature_path VARCHAR(500) NULL,
  eligible TINYINT(1) NULL,
  actual_participation TINYINT(1) NULL,
  reallocation_reason VARCHAR(500) NULL COMMENT 'Reason for department re-allocation, if any',
  course_id INT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_participants_course (course_id),
  INDEX idx_participants_department (department_id),
  INDEX idx_participants_rank (rank_id),
  INDEX idx_participants_name (last_name, first_name),
  INDEX idx_participants_unit (unit_address(100)),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (rank_id) REFERENCES ranks(id) ON DELETE SET NULL,
  FOREIGN KEY (medical_category_id) REFERENCES medical_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Participant document checklist (Qualification / Earlier Course / Medical Fitness / Movement Order)
CREATE TABLE IF NOT EXISTS participant_documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  participant_id INT UNSIGNED NOT NULL,
  document_type_id INT UNSIGNED NOT NULL,
  submitted TINYINT(1) NOT NULL DEFAULT 0,
  submitted_at DATETIME NULL,
  file_path VARCHAR(500) NULL,
  UNIQUE KEY uk_participant_document (participant_id, document_type_id),
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Course enrollments (many-to-many)
CREATE TABLE IF NOT EXISTS course_enrollments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  participant_id INT UNSIGNED NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('enrolled', 'completed', 'withdrawn', 'detained') NOT NULL DEFAULT 'enrolled',
  completion_date DATE NULL,
  UNIQUE KEY uk_course_participant (course_id, participant_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  participant_id INT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('present', 'absent', 'late', 'excused') NOT NULL DEFAULT 'present',
  remarks VARCHAR(500) NULL,
  marked_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_attendance (course_id, participant_id, attendance_date),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Document templates (rich-text editable)
CREATE TABLE IF NOT EXISTS document_templates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type ENUM('course_calendar', 'course_schedule', 'course_circular', 'certificate') NOT NULL,
  name VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL,
  certificate_type ENUM('completion', 'participation', 'detention', 'returned_to_unit', 'appreciation') NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  -- Master Word template support: when source_format = 'docx', docx_path points at the
  -- original uploaded .docx which stays the source of truth for generation (formatting,
  -- images, tables, headers/footers). `content` remains a mammoth-derived HTML preview only.
  source_format ENUM('html', 'docx') NOT NULL DEFAULT 'html',
  docx_path VARCHAR(500) NULL,
  docx_original_name VARCHAR(255) NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_templates_type (type),
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Course circulars
CREATE TABLE IF NOT EXISTS circulars (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NULL,
  title VARCHAR(255) NOT NULL,
  reference_number VARCHAR(100) NULL,
  content LONGTEXT NOT NULL,
  template_id INT UNSIGNED NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_circulars_course (course_id),
  INDEX idx_circulars_status (status),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  FOREIGN KEY (template_id) REFERENCES document_templates(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Course schedules (rich-text document; Phase 3 introduces the structured
-- week/day/time-slot grid in `schedule_slots` below without removing this)
CREATE TABLE IF NOT EXISTS course_schedules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL,
  template_id INT UNSIGNED NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_schedules_course (course_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES document_templates(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Course calendars
CREATE TABLE IF NOT EXISTS course_calendars (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL,
  template_id INT UNSIGNED NULL,
  year INT UNSIGNED NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_calendars_course (course_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES document_templates(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Certificates (expanded — Phase 2 wires up the new fields; kept schema-complete now)
CREATE TABLE IF NOT EXISTS certificates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  certificate_number VARCHAR(100) NOT NULL UNIQUE,
  participant_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  type ENUM('completion', 'participation', 'detention', 'returned_to_unit', 'appreciation') NOT NULL,
  template_id INT UNSIGNED NULL,
  issued_date DATE NOT NULL,
  qr_code_data VARCHAR(500) NULL,
  file_path VARCHAR(500) NULL,
  docx_file_path VARCHAR(500) NULL COMMENT 'Generated DOCX (from master Word template) alongside the PDF, when the template is a docx master',
  remarks TEXT NULL,
  grading VARCHAR(50) NULL,
  sos_date DATE NULL COMMENT 'Struck Off Strength date',
  sos_time TIME NULL,
  rtu_reason TEXT NULL COMMENT 'Reason for Returned To Unit',
  accommodation VARCHAR(255) NULL,
  transport VARCHAR(255) NULL,
  bills_paid TINYINT(1) NULL,
  movement_order_reference VARCHAR(100) NULL,
  director_authority_id INT UNSIGNED NULL,
  associate_director_authority_id INT UNSIGNED NULL,
  course_director_authority_id INT UNSIGNED NULL,
  issued_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_certificates_participant (participant_id),
  INDEX idx_certificates_course (course_id),
  INDEX idx_certificates_type (type),
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES document_templates(id) ON DELETE SET NULL,
  FOREIGN KEY (director_authority_id) REFERENCES organization_authorities(id) ON DELETE SET NULL,
  FOREIGN KEY (associate_director_authority_id) REFERENCES organization_authorities(id) ON DELETE SET NULL,
  FOREIGN KEY (course_director_authority_id) REFERENCES organization_authorities(id) ON DELETE SET NULL,
  FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Leave requests
CREATE TABLE IF NOT EXISTS leaves (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  participant_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NULL,
  leave_type ENUM('casual', 'medical', 'emergency', 'official', 'other') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  admin_remarks TEXT NULL,
  approved_by INT UNSIGNED NULL,
  approved_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_leaves_participant (participant_id),
  INDEX idx_leaves_status (status),
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Course feedback
CREATE TABLE IF NOT EXISTS feedback (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  participant_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  overall_rating TINYINT UNSIGNED NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  content_rating TINYINT UNSIGNED NULL CHECK (content_rating BETWEEN 1 AND 5),
  instructor_rating TINYINT UNSIGNED NULL CHECK (instructor_rating BETWEEN 1 AND 5),
  facility_rating TINYINT UNSIGNED NULL CHECK (facility_rating BETWEEN 1 AND 5),
  -- Named 0-10 categories from the "Feedback by Participants" spec — distinct from the
  -- 1-5 ratings above, which predate that spec and stay for backward compatibility.
  classroom_arrangements TINYINT UNSIGNED NULL CHECK (classroom_arrangements BETWEEN 0 AND 10),
  course_content_kit TINYINT UNSIGNED NULL CHECK (course_content_kit BETWEEN 0 AND 10),
  practical_learning TINYINT UNSIGNED NULL CHECK (practical_learning BETWEEN 0 AND 10),
  faculty_score TINYINT UNSIGNED NULL CHECK (faculty_score BETWEEN 0 AND 10),
  overall_learning TINYINT UNSIGNED NULL CHECK (overall_learning BETWEEN 0 AND 10),
  hostel_stay TINYINT UNSIGNED NULL CHECK (hostel_stay BETWEEN 0 AND 10),
  food TINYINT UNSIGNED NULL CHECK (food BETWEEN 0 AND 10),
  other_facilities TINYINT UNSIGNED NULL CHECK (other_facilities BETWEEN 0 AND 10),
  comments TEXT NULL,
  suggestions TEXT NULL,
  is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_feedback (participant_id, course_id),
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Document center
CREATE TABLE IF NOT EXISTS documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  category ENUM('course_material', 'policy', 'form', 'report', 'other') NOT NULL DEFAULT 'other',
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  course_id INT UNSIGNED NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  uploaded_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_documents_category (category),
  INDEX idx_documents_course (course_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
  link VARCHAR(500) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_read (is_read),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Password reset requests: user submits, super_admin reviews and sets a new password
-- directly (no reset token — the super_admin relays the new password to the user
-- out of band, the same way sendWelcomeEmail already emails a plaintext temp password).
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'completed', 'expired') NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  review_reason TEXT NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_password_reset_requests_user (user_id),
  INDEX idx_password_reset_requests_status (status),
  INDEX idx_password_reset_requests_created (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- System settings
CREATE TABLE IF NOT EXISTS settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NULL,
  description VARCHAR(500) NULL,
  updated_by INT UNSIGNED NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Audit log
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NULL,
  entity_id INT UNSIGNED NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- Later-phase tables — created now for a stable ERD; no
-- repository/controller/route/UI is wired to these until their phase.
-- ============================================================

-- Phase 2: Reporting Sheet
CREATE TABLE IF NOT EXISTS reporting_sheet_entries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  participant_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  reporting_date DATE NOT NULL,
  reporting_time TIME NULL,
  signature_path VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Phase 3: structured 12-week x day x time-slot Course Schedule grid
CREATE TABLE IF NOT EXISTS schedule_slots (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  week_number TINYINT UNSIGNED NOT NULL COMMENT '1-12',
  day_number TINYINT UNSIGNED NOT NULL COMMENT '1-7',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  topic VARCHAR(255) NULL,
  faculty_id INT UNSIGNED NULL,
  remarks VARCHAR(255) NULL,
  UNIQUE KEY uk_schedule_slot (course_id, week_number, day_number, start_time),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Phase 3: Theory Lecture Schedule
CREATE TABLE IF NOT EXISTS theory_lecture_topics (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  topic VARCHAR(255) NOT NULL,
  sessions INT UNSIGNED NOT NULL DEFAULT 1,
  faculty_id INT UNSIGNED NULL,
  confirmed_by_faculty TINYINT(1) NULL COMMENT 'Faculty Management: Confirmation by Faculty Y/N',
  alternate_faculty_id INT UNSIGNED NULL,
  reason_for_change VARCHAR(500) NULL,
  coordinator_authority_id INT UNSIGNED NULL,
  director_authority_id INT UNSIGNED NULL,
  associate_director_authority_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE SET NULL,
  FOREIGN KEY (alternate_faculty_id) REFERENCES faculty(id) ON DELETE SET NULL,
  FOREIGN KEY (coordinator_authority_id) REFERENCES organization_authorities(id) ON DELETE SET NULL,
  FOREIGN KEY (director_authority_id) REFERENCES organization_authorities(id) ON DELETE SET NULL,
  FOREIGN KEY (associate_director_authority_id) REFERENCES organization_authorities(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Phase 4: Result Management — theory exams (exam_category disambiguates the Result
-- Sheet's Phase-1 Theory vs Phase-2 Practical sections, both of which use the same
-- midterm/final structure)
CREATE TABLE IF NOT EXISTS exam_results (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  participant_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  exam_category ENUM('theory', 'practical') NOT NULL DEFAULT 'theory',
  exam_type ENUM('midterm', 'final') NOT NULL,
  max_marks DECIMAL(6,2) NOT NULL DEFAULT 100,
  passing_marks DECIMAL(6,2) NOT NULL DEFAULT 40,
  examiner_id INT UNSIGNED NULL,
  invigilator_id INT UNSIGNED NULL,
  invigilator2_id INT UNSIGNED NULL,
  exam_date DATE NULL,
  marks_obtained DECIMAL(6,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_exam_result (participant_id, course_id, exam_category, exam_type),
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (examiner_id) REFERENCES faculty(id) ON DELETE SET NULL,
  FOREIGN KEY (invigilator_id) REFERENCES faculty(id) ON DELETE SET NULL,
  FOREIGN KEY (invigilator2_id) REFERENCES faculty(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Phase 4: Result Management — practical exam component breakup (per participant per
-- course per exam_type, since "Breakup of Practical Exam" scores each of the 7 parts
-- separately for the Mid Term sitting and the Final sitting)
CREATE TABLE IF NOT EXISTS practical_breakups (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  participant_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  exam_type ENUM('midterm', 'final') NOT NULL DEFAULT 'final',
  examiner_id INT UNSIGNED NULL,
  invigilator_id INT UNSIGNED NULL,
  invigilator2_id INT UNSIGNED NULL,
  pump_drill DECIMAL(5,2) NULL,
  ba_set DECIMAL(5,2) NULL,
  hose DECIMAL(5,2) NULL,
  ert DECIMAL(5,2) NULL,
  viva DECIMAL(5,2) NULL,
  class_notes DECIMAL(5,2) NULL,
  station_duty DECIMAL(5,2) NULL,
  conduct_keenness DECIMAL(5,2) NULL,
  average DECIMAL(5,2) NULL,
  total DECIMAL(6,2) NULL,
  percentage DECIMAL(5,2) NULL,
  grade VARCHAR(10) NULL,
  rank_position INT UNSIGNED NULL,
  result_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_practical_breakup (participant_id, course_id, exam_type),
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (examiner_id) REFERENCES faculty(id) ON DELETE SET NULL,
  FOREIGN KEY (invigilator_id) REFERENCES faculty(id) ON DELETE SET NULL,
  FOREIGN KEY (invigilator2_id) REFERENCES faculty(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Phase 5: Conduct & Keenness Evaluation — the 3-evaluator breakdown that
-- practical_breakups.conduct_keenness (a Phase-3 total feeding the Result Sheet) is
-- computed from
CREATE TABLE IF NOT EXISTS conduct_keenness_evaluations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  participant_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  max_marks DECIMAL(5,2) NOT NULL DEFAULT 20,
  eval_by_course_director DECIMAL(5,2) NULL,
  eval_by_course_coordinator DECIMAL(5,2) NULL,
  eval_by_ic_practical_drills DECIMAL(5,2) NULL,
  average_marks DECIMAL(5,2) NULL,
  evaluation_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_conduct_keenness (participant_id, course_id),
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Phase 4: Leave & Attendance evaluation summary (per participant per course)
CREATE TABLE IF NOT EXISTS attendance_evaluations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  participant_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  no_of_leave_days INT UNSIGNED NULL,
  max_marks DECIMAL(5,2) NOT NULL DEFAULT 10,
  attendance_marks DECIMAL(5,2) NULL,
  evaluation_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_attendance_evaluation (participant_id, course_id),
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Phase 5: Regimental Fund
CREATE TABLE IF NOT EXISTS regimental_fund_entries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  deposit_date DATE NOT NULL,
  amount_per_week DECIMAL(10,2) NOT NULL DEFAULT 0,
  duration_weeks INT UNSIGNED NOT NULL DEFAULT 0,
  strength INT UNSIGNED NOT NULL DEFAULT 0,
  total_collection DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Phase 5: Honorarium (faculty payment)
CREATE TABLE IF NOT EXISTS honorarium_entries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  faculty_id INT UNSIGNED NOT NULL,
  paper_setting DECIMAL(10,2) NOT NULL DEFAULT 0,
  invigilator_duty DECIMAL(10,2) NOT NULL DEFAULT 0,
  theory_exam DECIMAL(10,2) NOT NULL DEFAULT 0,
  practical_exam DECIMAL(10,2) NOT NULL DEFAULT 0,
  evaluation DECIMAL(10,2) NOT NULL DEFAULT 0,
  transport DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Phase 5: Funds Management Part 1 & 2 — one row per course covering both the head-wise
-- sanction (Part 1) and the cash-drawn/refund summary (Part 2); per-bill detail lives in
-- fund_expenditure_items below.
CREATE TABLE IF NOT EXISTS fund_management (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL UNIQUE,
  course_material DECIMAL(12,2) NOT NULL DEFAULT 0,
  hospitality DECIMAL(12,2) NOT NULL DEFAULT 0,
  honorarium DECIMAL(12,2) NOT NULL DEFAULT 0,
  transport DECIMAL(12,2) NOT NULL DEFAULT 0,
  mementoes DECIMAL(12,2) NOT NULL DEFAULT 0,
  consumables DECIMAL(12,2) NOT NULL DEFAULT 0,
  miscellaneous DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_sanctioned DECIMAL(12,2) NOT NULL DEFAULT 0,
  cash_drawn_amount DECIMAL(12,2) NULL,
  cash_drawn_date DATE NULL,
  cash_refunded DECIMAL(12,2) NULL,
  balance_returned_date DATE NULL,
  bills_submission_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Phase 5: Funds Management Part 2 — per-bill expenditure line items ("Bill No. +N")
CREATE TABLE IF NOT EXISTS fund_expenditure_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  bill_no VARCHAR(100) NULL,
  expenditure_date DATE NULL,
  details VARCHAR(500) NULL,
  mode_of_payment VARCHAR(100) NULL,
  expenditure_head VARCHAR(100) NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fund_expenditure_course (course_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Phase 5: Receipt of Course Kit — per participant per course distribution checklist
CREATE TABLE IF NOT EXISTS course_kit_receipts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  participant_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  distribution_date DATE NULL,
  course_material TINYINT(1) NOT NULL DEFAULT 0,
  course_kit TINYINT(1) NOT NULL DEFAULT 0,
  group_photo TINYINT(1) NOT NULL DEFAULT 0,
  remarks VARCHAR(255) NULL,
  signature_path VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_kit_receipt (participant_id, course_id),
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Phase 5: Mementoes Utilisation Certificate — one row per course
CREATE TABLE IF NOT EXISTS mementoes_utilisation (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL UNIQUE,
  distribution_date DATE NULL,
  first_in_merit_participant_id INT UNSIGNED NULL,
  second_in_merit_participant_id INT UNSIGNED NULL,
  third_in_merit_participant_id INT UNSIGNED NULL,
  course_senior_participant_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (first_in_merit_participant_id) REFERENCES participants(id) ON DELETE SET NULL,
  FOREIGN KEY (second_in_merit_participant_id) REFERENCES participants(id) ON DELETE SET NULL,
  FOREIGN KEY (third_in_merit_participant_id) REFERENCES participants(id) ON DELETE SET NULL,
  FOREIGN KEY (course_senior_participant_id) REFERENCES participants(id) ON DELETE SET NULL
) ENGINE=InnoDB;
