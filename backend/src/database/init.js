import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function addColumnIfMissing(connection, table, column, alterSql) {
  const [cols] = await connection.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (cols.length === 0) {
    await connection.query(alterSql);
    logger.info(`Migrated: added ${table}.${column}`);
  }
}

async function addIndexIfMissing(connection, table, indexName, alterSql) {
  const [rows] = await connection.query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  );
  if (rows.length === 0) {
    await connection.query(alterSql);
    logger.info(`Migrated: added index ${indexName} on ${table}`);
  }
}

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
  });

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schema);
    logger.info('Database schema initialized successfully');

    // CREATE TABLE IF NOT EXISTS above is a no-op on an existing table, so columns
    // added to schema.sql after first install need an explicit, idempotent check here.
    const [cols] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'course_faculty' AND COLUMN_NAME = 'show_on_certificate'`
    );
    if (cols.length === 0) {
      await connection.query(
        `ALTER TABLE course_faculty ADD COLUMN show_on_certificate BOOLEAN NOT NULL DEFAULT 0
         COMMENT 'Included in the faculty signature block on generated certificates'`
      );
      logger.info('Migrated: added show_on_certificate to course_faculty');
    }

    await addColumnIfMissing(connection, 'document_templates', 'source_format',
      `ALTER TABLE document_templates ADD COLUMN source_format ENUM('html', 'docx') NOT NULL DEFAULT 'html'`);
    await addColumnIfMissing(connection, 'document_templates', 'docx_path',
      `ALTER TABLE document_templates ADD COLUMN docx_path VARCHAR(500) NULL`);
    await addColumnIfMissing(connection, 'document_templates', 'docx_original_name',
      `ALTER TABLE document_templates ADD COLUMN docx_original_name VARCHAR(255) NULL`);
    await addColumnIfMissing(connection, 'certificates', 'docx_file_path',
      `ALTER TABLE certificates ADD COLUMN docx_file_path VARCHAR(500) NULL
       COMMENT 'Generated DOCX (from master Word template) alongside the PDF, when the template is a docx master'`);
    await addIndexIfMissing(connection, 'participants', 'idx_participants_name',
      `ALTER TABLE participants ADD INDEX idx_participants_name (last_name, first_name)`);
    await addIndexIfMissing(connection, 'participants', 'idx_participants_unit',
      `ALTER TABLE participants ADD INDEX idx_participants_unit (unit_address(100))`);

    // organization_authorities.authority_type used to be a fixed ENUM; widen it to a
    // free-form VARCHAR so admins can add custom authority types from the UI. ENUM
    // values round-trip to VARCHAR as their string labels, so no data is lost or changed.
    const [authorityTypeCol] = await connection.query(
      `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organization_authorities' AND COLUMN_NAME = 'authority_type'`
    );
    if (authorityTypeCol[0]?.DATA_TYPE === 'enum') {
      await connection.query(
        `ALTER TABLE organization_authorities MODIFY COLUMN authority_type VARCHAR(50) NOT NULL`
      );
      logger.info('Migrated: organization_authorities.authority_type ENUM -> VARCHAR(50)');
    }

    // Fields added after cross-checking the DB against the full TMS field spec (33-page
    // reference document) so every field named there is available as a template placeholder.
    await addColumnIfMissing(connection, 'institutes', 'phone',
      `ALTER TABLE institutes ADD COLUMN phone VARCHAR(50) NULL`);
    await addColumnIfMissing(connection, 'institutes', 'fax',
      `ALTER TABLE institutes ADD COLUMN fax VARCHAR(50) NULL`);
    await addColumnIfMissing(connection, 'institutes', 'email',
      `ALTER TABLE institutes ADD COLUMN email VARCHAR(255) NULL`);
    await addColumnIfMissing(connection, 'institutes', 'address',
      `ALTER TABLE institutes ADD COLUMN address TEXT NULL`);
    await addColumnIfMissing(connection, 'organization_authorities', 'mobile',
      `ALTER TABLE organization_authorities ADD COLUMN mobile VARCHAR(20) NULL`);
    await addColumnIfMissing(connection, 'participants', 'reallocation_reason',
      `ALTER TABLE participants ADD COLUMN reallocation_reason VARCHAR(500) NULL
       COMMENT 'Reason for department re-allocation, if any'`);

    await addColumnIfMissing(connection, 'exam_results', 'exam_category',
      `ALTER TABLE exam_results ADD COLUMN exam_category ENUM('theory', 'practical') NOT NULL DEFAULT 'theory' AFTER course_id`);
    await addColumnIfMissing(connection, 'exam_results', 'invigilator2_id',
      `ALTER TABLE exam_results ADD COLUMN invigilator2_id INT UNSIGNED NULL,
       ADD FOREIGN KEY (invigilator2_id) REFERENCES faculty(id) ON DELETE SET NULL`);
    const [examResultsUk] = await connection.query(
      `SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as cols FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_results' AND INDEX_NAME = 'uk_exam_result'
       GROUP BY INDEX_NAME`
    );
    if (examResultsUk[0] && examResultsUk[0].cols !== 'participant_id,course_id,exam_category,exam_type') {
      // DROP + ADD must be a single ALTER statement — MySQL refuses a standalone DROP
      // INDEX while the FK constraint on participant_id/course_id still depends on it.
      await connection.query(
        `ALTER TABLE exam_results
         DROP INDEX uk_exam_result,
         ADD UNIQUE KEY uk_exam_result (participant_id, course_id, exam_category, exam_type)`
      );
      logger.info('Migrated: exam_results unique key now includes exam_category');
    }

    await addColumnIfMissing(connection, 'practical_breakups', 'exam_type',
      `ALTER TABLE practical_breakups ADD COLUMN exam_type ENUM('midterm', 'final') NOT NULL DEFAULT 'final' AFTER course_id`);
    await addColumnIfMissing(connection, 'practical_breakups', 'examiner_id',
      `ALTER TABLE practical_breakups ADD COLUMN examiner_id INT UNSIGNED NULL,
       ADD FOREIGN KEY (examiner_id) REFERENCES faculty(id) ON DELETE SET NULL`);
    await addColumnIfMissing(connection, 'practical_breakups', 'invigilator_id',
      `ALTER TABLE practical_breakups ADD COLUMN invigilator_id INT UNSIGNED NULL,
       ADD FOREIGN KEY (invigilator_id) REFERENCES faculty(id) ON DELETE SET NULL`);
    await addColumnIfMissing(connection, 'practical_breakups', 'invigilator2_id',
      `ALTER TABLE practical_breakups ADD COLUMN invigilator2_id INT UNSIGNED NULL,
       ADD FOREIGN KEY (invigilator2_id) REFERENCES faculty(id) ON DELETE SET NULL`);
    const [practicalUk] = await connection.query(
      `SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as cols FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'practical_breakups' AND INDEX_NAME = 'uk_practical_breakup'
       GROUP BY INDEX_NAME`
    );
    if (practicalUk[0] && practicalUk[0].cols !== 'participant_id,course_id,exam_type') {
      await connection.query(
        `ALTER TABLE practical_breakups
         DROP INDEX uk_practical_breakup,
         ADD UNIQUE KEY uk_practical_breakup (participant_id, course_id, exam_type)`
      );
      logger.info('Migrated: practical_breakups unique key now includes exam_type');
    }

    await addColumnIfMissing(connection, 'attendance_evaluations', 'max_marks',
      `ALTER TABLE attendance_evaluations ADD COLUMN max_marks DECIMAL(5,2) NOT NULL DEFAULT 10`);
    await addColumnIfMissing(connection, 'honorarium_entries', 'invigilator_duty',
      `ALTER TABLE honorarium_entries ADD COLUMN invigilator_duty DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER paper_setting`);

    await addColumnIfMissing(connection, 'theory_lecture_topics', 'confirmed_by_faculty',
      `ALTER TABLE theory_lecture_topics ADD COLUMN confirmed_by_faculty TINYINT(1) NULL
       COMMENT 'Faculty Management: Confirmation by Faculty Y/N'`);
    await addColumnIfMissing(connection, 'theory_lecture_topics', 'alternate_faculty_id',
      `ALTER TABLE theory_lecture_topics ADD COLUMN alternate_faculty_id INT UNSIGNED NULL,
       ADD FOREIGN KEY (alternate_faculty_id) REFERENCES faculty(id) ON DELETE SET NULL`);
    await addColumnIfMissing(connection, 'theory_lecture_topics', 'reason_for_change',
      `ALTER TABLE theory_lecture_topics ADD COLUMN reason_for_change VARCHAR(500) NULL`);

    await addColumnIfMissing(connection, 'feedback', 'classroom_arrangements',
      `ALTER TABLE feedback ADD COLUMN classroom_arrangements TINYINT UNSIGNED NULL CHECK (classroom_arrangements BETWEEN 0 AND 10)`);
    await addColumnIfMissing(connection, 'feedback', 'course_content_kit',
      `ALTER TABLE feedback ADD COLUMN course_content_kit TINYINT UNSIGNED NULL CHECK (course_content_kit BETWEEN 0 AND 10)`);
    await addColumnIfMissing(connection, 'feedback', 'practical_learning',
      `ALTER TABLE feedback ADD COLUMN practical_learning TINYINT UNSIGNED NULL CHECK (practical_learning BETWEEN 0 AND 10)`);
    await addColumnIfMissing(connection, 'feedback', 'faculty_score',
      `ALTER TABLE feedback ADD COLUMN faculty_score TINYINT UNSIGNED NULL CHECK (faculty_score BETWEEN 0 AND 10)`);
    await addColumnIfMissing(connection, 'feedback', 'overall_learning',
      `ALTER TABLE feedback ADD COLUMN overall_learning TINYINT UNSIGNED NULL CHECK (overall_learning BETWEEN 0 AND 10)`);
    await addColumnIfMissing(connection, 'feedback', 'hostel_stay',
      `ALTER TABLE feedback ADD COLUMN hostel_stay TINYINT UNSIGNED NULL CHECK (hostel_stay BETWEEN 0 AND 10)`);
    await addColumnIfMissing(connection, 'feedback', 'food',
      `ALTER TABLE feedback ADD COLUMN food TINYINT UNSIGNED NULL CHECK (food BETWEEN 0 AND 10)`);
    await addColumnIfMissing(connection, 'feedback', 'other_facilities',
      `ALTER TABLE feedback ADD COLUMN other_facilities TINYINT UNSIGNED NULL CHECK (other_facilities BETWEEN 0 AND 10)`);
  } catch (error) {
    console.error("========== MYSQL ERROR ==========");
    console.error(error);
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Errno:", error.errno);
    console.error("SQL State:", error.sqlState);
    console.error("===============================");
    process.exit(1);
  } finally {
    await connection.end();
  }
}

initDatabase();
