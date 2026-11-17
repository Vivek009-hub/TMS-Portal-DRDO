import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const RANKS = [
  'Sepoy', 'Lance Naik', 'Naik', 'Havildar', 'Naib Subedar', 'Subedar', 'Subedar Major',
  'Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel',
  'Flying Officer', 'Flight Lieutenant', 'Squadron Leader', 'Wing Commander', 'Group Captain',
  'Civilian',
];

const DEPARTMENTS = [
  'Indian Army', 'Indian Navy', 'Indian Air Force', 'DRDO', 'CISF',
  'State Fire Service', 'Civil Defence',
];

const DESIGNATIONS = [
  'Director', 'Associate Director', 'Deputy Director', 'Assistant Director',
  'Commandant', 'Adjutant', 'Chief Instructor', 'Senior Instructor', 'Instructor',
];

const INSTITUTES = [
  'Defence Fire Services Training Institute', 'National Fire Service College',
  'CISF Fire Training Institute', 'State Disaster Response Academy',
];

const MEDICAL_CATEGORIES = [
  'A (Fit for all duties)', 'BEE (Fit with minor limitation)',
  'CEE (Restricted duties)', 'Temporary Medical Category', 'Permanent Low Medical Category',
];

const DOCUMENT_TYPES = [
  { code: 'qualification', label: 'Qualification Certificate Submitted' },
  { code: 'earlier_course', label: 'Earlier Course Certificate Submitted' },
  { code: 'medical_fitness', label: 'Medical Fitness Certificate Submitted' },
  { code: 'movement_order', label: 'Movement Order Submitted' },
];

const DEFAULT_TEMPLATES = [
  {
    type: 'course_calendar',
    name: 'Default Course Calendar',
    content: `<h2>Course Calendar - {{course_name}}</h2>
<p><strong>Course Code:</strong> {{course_code}}</p>
<p><strong>Duration:</strong> {{start_date}} to {{end_date}}</p>
<p><strong>Location:</strong> {{location}}</p>
<p><strong>Instructor:</strong> {{instructor}}</p>
<hr/>
<p>This calendar outlines the training schedule for all participants enrolled in {{course_name}}.</p>`,
  },
  {
    type: 'course_schedule',
    name: 'Default Course Schedule',
    content: `<h2>Course Schedule - {{course_name}}</h2>
<p><strong>Reference:</strong> {{course_code}}</p>
<table border="1" cellpadding="8" style="width:100%; border-collapse:collapse;">
<tr><th>Day</th><th>Session</th><th>Topic</th><th>Time</th></tr>
<tr><td>Day 1</td><td>Morning</td><td>Introduction & Orientation</td><td>09:00 - 12:00</td></tr>
<tr><td>Day 1</td><td>Afternoon</td><td>Core Training Module</td><td>14:00 - 17:00</td></tr>
</table>`,
  },
  {
    type: 'course_circular',
    name: 'Default Course Circular',
    content: `<h2 style="text-align:center;">OFFICIAL CIRCULAR</h2>
<p><strong>Reference No:</strong> {{reference_number}}</p>
<p><strong>Date:</strong> {{date}}</p>
<p><strong>Subject:</strong> {{title}}</p>
<hr/>
<p>Dear Participants,</p>
<p>This is to inform all participants of {{course_name}} regarding the following:</p>
<p>{{content}}</p>
<p>All participants are requested to comply with the instructions mentioned herein.</p>
<br/>
<p>Authorized Signatory</p>`,
  },
  {
    type: 'certificate',
    name: 'Completion Certificate',
    certificate_type: 'completion',
    content: `<div style="text-align:center; padding:40px;">
<h1>CERTIFICATE OF COMPLETION</h1>
<p>This is to certify that</p>
<h2>{{participant_name}}</h2>
<p><strong>{{military_rank}}</strong> | Service No: {{service_number}}</p>
<p>Department: {{department}} | Unit: {{unit}}</p>
<p>has successfully completed the training course</p>
<h3>{{course_name}}</h3>
<p>Conducted from {{start_date}} to {{end_date}}</p>
<p>Certificate No: {{certificate_number}}</p>
<p>Issued on: {{issued_date}}</p>
</div>`,
  },
  {
    type: 'certificate',
    name: 'Completion Certificate (with Faculty Signature)',
    certificate_type: 'completion',
    is_default: false,
    content: `<div style="text-align:center; padding:40px;">
<h1>CERTIFICATE OF COMPLETION</h1>
<p>This is to certify that</p>
<h2>{{participant_name}}</h2>
<p><strong>{{military_rank}}</strong> | Service No: {{service_number}}</p>
<p>Department: {{department}} | Unit: {{unit}}</p>
<p>has successfully completed the training course</p>
<h3>{{course_name}}</h3>
<p>Conducted from {{start_date}} to {{end_date}}</p>
<p>Certificate No: {{certificate_number}}</p>
<p>Issued on: {{issued_date}}</p>
<div style="margin-top:70px; text-align:center;">
<p style="display:inline-block; border-top:1px solid #000; padding-top:6px; min-width:240px;">{{faculty_name}}</p>
<p style="font-size:0.85em; margin-top:-6px;">{{faculty_designation}}</p>
</div>
</div>`,
  },
  {
    type: 'certificate',
    name: 'Participation Certificate',
    certificate_type: 'participation',
    content: `<div style="text-align:center; padding:40px;">
<h1>CERTIFICATE OF PARTICIPATION</h1>
<p>This is to certify that</p>
<h2>{{participant_name}}</h2>
<p><strong>{{military_rank}}</strong> | Service No: {{service_number}}</p>
<p>has participated in the training course</p>
<h3>{{course_name}}</h3>
<p>Certificate No: {{certificate_number}}</p>
<p>Issued on: {{issued_date}}</p>
</div>`,
  },
  {
    type: 'certificate',
    name: 'Detention Certificate',
    certificate_type: 'detention',
    content: `<div style="text-align:center; padding:40px;">
<h1>CERTIFICATE OF DETENTION</h1>
<p>This is to certify that</p>
<h2>{{participant_name}}</h2>
<p><strong>{{military_rank}}</strong> | Service No: {{service_number}}</p>
<p>has been detained during the training course</p>
<h3>{{course_name}}</h3>
<p>Grading: {{grading}}</p>
<p>Certificate No: {{certificate_number}}</p>
<p>Issued on: {{issued_date}}</p>
</div>`,
  },
  {
    type: 'certificate',
    name: 'Returned To Unit Certificate',
    certificate_type: 'returned_to_unit',
    content: `<div style="text-align:center; padding:40px;">
<h1>RETURNED TO UNIT CERTIFICATE</h1>
<p>This is to certify that</p>
<h2>{{participant_name}}</h2>
<p><strong>{{military_rank}}</strong> | Service No: {{service_number}}</p>
<p>has been returned to unit from the training course</p>
<h3>{{course_name}}</h3>
<p>Reason: {{rtu_reason}}</p>
<p>Struck Off Strength Date: {{sos_date}}</p>
<p>Certificate No: {{certificate_number}}</p>
<p>Issued on: {{issued_date}}</p>
</div>`,
  },
];

const DEFAULT_SETTINGS = [
  { key: 'portal_name', value: 'Training Management Portal', description: 'Portal display name' },
  { key: 'organization_name', value: 'Training Directorate', description: 'Organization name' },
  { key: 'certificate_prefix', value: 'CERT', description: 'Certificate number prefix' },
  { key: 'enable_qr_verification', value: 'true', description: 'Enable QR code on certificates' },
  { key: 'email_notifications', value: 'true', description: 'Enable email notifications' },
];

async function seedLookup(connection, table, names, withSortOrder = false) {
  const ids = {};
  for (let i = 0; i < names.length; i++) {
    if (withSortOrder) {
      await connection.query(`INSERT IGNORE INTO ${table} (name, sort_order) VALUES (?, ?)`, [names[i], i]);
    } else {
      await connection.query(`INSERT IGNORE INTO ${table} (name) VALUES (?)`, [names[i]]);
    }
    const [rows] = await connection.query(`SELECT id FROM ${table} WHERE name = ?`, [names[i]]);
    ids[names[i]] = rows[0].id;
  }
  return ids;
}

async function seed() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [
      config.superAdmin.email,
    ]);

    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash(config.superAdmin.password, 12);
      await connection.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
         VALUES (?, ?, 'Super', 'Admin', 'super_admin', 1)`,
        [config.superAdmin.email, passwordHash]
      );
      logger.info(`Super Admin created: ${config.superAdmin.email}`);
    }

    const rankIds = await seedLookup(connection, 'ranks', RANKS, true);
    const departmentIds = await seedLookup(connection, 'departments', DEPARTMENTS);
    const designationIds = await seedLookup(connection, 'designations', DESIGNATIONS);
    const instituteIds = await seedLookup(connection, 'institutes', INSTITUTES);
    const medicalCategoryIds = await seedLookup(connection, 'medical_categories', MEDICAL_CATEGORIES);

    for (let i = 0; i < DOCUMENT_TYPES.length; i++) {
      await connection.query(
        'INSERT IGNORE INTO document_types (code, label, sort_order) VALUES (?, ?, ?)',
        [DOCUMENT_TYPES[i].code, DOCUMENT_TYPES[i].label, i]
      );
    }

    // Demo course so Faculty/Organization Authority/Participant dropdowns have data to reference
    const [existingCourse] = await connection.query('SELECT id FROM courses WHERE code = ?', ['FST-25-01']);
    let demoCourseId = existingCourse[0]?.id;
    if (!demoCourseId) {
      const [courseResult] = await connection.query(
        `INSERT INTO courses
         (code, name, description, venue, duration_days, start_date, end_date,
          financial_year, authorized_seats, total_seats, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'FST-25-01', 'Basic Fire & Safety Training Course',
          'Twelve-week residential training course covering fire-fighting drills, BA set handling and emergency response.',
          'Main Training Campus', 84, '2025-09-01', '2025-11-24',
          '2025-2026', 60, 50, 'scheduled',
        ]
      );
      demoCourseId = courseResult.insertId;

      await connection.query(
        `INSERT INTO course_seat_allocations (course_id, department_id, allocated_seats) VALUES (?, ?, ?), (?, ?, ?)`,
        [demoCourseId, departmentIds['Indian Army'], 25, demoCourseId, departmentIds['CISF'], 15]
      );
    }

    // Demo faculty
    const demoFaculty = [
      { name: 'A. K. Sharma', rank: 'Subedar Major', designation: 'Chief Instructor', institute: INSTITUTES[0], mobile: '9800000001', email: 'ak.sharma@training.gov.in', expertise: 'Pump Drill, BA Set Handling' },
      { name: 'R. Menon', rank: 'Major', designation: 'Senior Instructor', institute: INSTITUTES[0], mobile: '9800000002', email: 'r.menon@training.gov.in', expertise: 'Fire Hose Techniques, ERT' },
    ];
    for (const f of demoFaculty) {
      const [existingFaculty] = await connection.query('SELECT id FROM faculty WHERE email = ?', [f.email]);
      if (existingFaculty.length === 0) {
        await connection.query(
          `INSERT INTO faculty (name, rank_id, designation_id, institute_id, mobile, email, expertise, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
          [f.name, rankIds[f.rank], designationIds[f.designation], instituteIds[f.institute], f.mobile, f.email, f.expertise]
        );
      }
    }

    // Demo organization authorities (institute-wide)
    const demoAuthorities = [
      { authority_type: 'director', name: 'V. P. Rao', rank: 'Colonel', designation: 'Director' },
      { authority_type: 'associate_director', name: 'S. Iyer', rank: 'Lieutenant Colonel', designation: 'Associate Director' },
      { authority_type: 'officer_in_charge', name: 'M. Deshpande', rank: 'Major', designation: 'Deputy Director' },
    ];
    for (const a of demoAuthorities) {
      const [existingAuthority] = await connection.query(
        'SELECT id FROM organization_authorities WHERE authority_type = ? AND name = ?',
        [a.authority_type, a.name]
      );
      if (existingAuthority.length === 0) {
        await connection.query(
          `INSERT INTO organization_authorities (authority_type, name, rank_id, designation_id, course_id)
           VALUES (?, ?, ?, ?, NULL)`,
          [a.authority_type, a.name, rankIds[a.rank], designationIds[a.designation]]
        );
      }
    }

    // Demo participant exercising the full field set
    const [existingParticipant] = await connection.query('SELECT id FROM participants WHERE service_number = ?', ['SVC-10234']);
    if (existingParticipant.length === 0) {
      const [pResult] = await connection.query(
        `INSERT INTO participants
         (service_number, rank_id, first_name, last_name, mobile_number, date_of_birth,
          educational_qualification, qualifying_essential_education, date_of_appointment,
          unit_address, pin_code, medical_category_id, date_of_reporting, reporting_time_session,
          movement_order_number, movement_order_date, department_id, eligible, actual_participation,
          course_id, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          'SVC-10234', rankIds['Havildar'], 'Ramesh', 'Kumar', '9811122233', '1995-04-12',
          'B.Sc.', 1, '2015-06-01',
          'Fire Station, Cantonment Area, Pune', '411001', medicalCategoryIds['A (Fit for all duties)'],
          '2025-08-31', 'FN', 'MO/2025/0451', '2025-08-25', departmentIds['Indian Army'], 1, 1,
          demoCourseId,
        ]
      );
      const [docTypeRows] = await connection.query('SELECT id FROM document_types');
      for (const dt of docTypeRows) {
        await connection.query(
          'INSERT IGNORE INTO participant_documents (participant_id, document_type_id, submitted) VALUES (?, ?, 0)',
          [pResult.insertId, dt.id]
        );
      }
    }

    for (const template of DEFAULT_TEMPLATES) {
      const [exists] = await connection.query(
        'SELECT id FROM document_templates WHERE name = ? AND type = ?',
        [template.name, template.type]
      );
      if (exists.length === 0) {
        await connection.query(
          `INSERT INTO document_templates (type, name, content, certificate_type, is_default)
           VALUES (?, ?, ?, ?, ?)`,
          [template.type, template.name, template.content, template.certificate_type || null, template.is_default === false ? 0 : 1]
        );
      }
    }

    for (const setting of DEFAULT_SETTINGS) {
      await connection.query(
        `INSERT IGNORE INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?)`,
        [setting.key, setting.value, setting.description]
      );
    }

    await connection.commit();
    logger.info('Database seeded successfully');
  } catch (error) {
    await connection.rollback();
    console.error("========== SEED ERROR ==========");
    console.error(error);
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("SQL:", error.sql);
    console.error("SQL Message:", error.sqlMessage);
    console.error("=================================");
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
}

seed();
