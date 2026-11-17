import pool from '../config/database.js';

const reportRepository = {
  async participantList({ course_id, department_id }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (course_id) { where += ' AND p.course_id = ?'; params.push(course_id); }
    if (department_id) { where += ' AND p.department_id = ?'; params.push(department_id); }
    const [rows] = await pool.query(
      `SELECT p.service_number, p.first_name, p.last_name, r.name as rank_name,
              d.name as department_name, c.name as course_name, p.mobile_number,
              IF(p.eligible = 1, 'Yes', IF(p.eligible = 0, 'No', '—')) as eligible
       FROM participants p
       LEFT JOIN ranks r ON r.id = p.rank_id
       LEFT JOIN departments d ON d.id = p.department_id
       LEFT JOIN courses c ON c.id = p.course_id
       ${where}
       ORDER BY p.first_name, p.last_name`,
      params
    );
    return rows;
  },

  async departmentWiseSummary() {
    const [rows] = await pool.query(
      `SELECT d.name as department_name,
              COUNT(p.id) as total_participants,
              SUM(CASE WHEN p.eligible = 1 THEN 1 ELSE 0 END) as eligible_count
       FROM departments d
       LEFT JOIN participants p ON p.department_id = d.id
       GROUP BY d.id, d.name
       ORDER BY d.name`
    );
    return rows;
  },

  async eligibleParticipants({ course_id }) {
    let where = 'WHERE p.eligible = 1';
    const params = [];
    if (course_id) { where += ' AND p.course_id = ?'; params.push(course_id); }
    const [rows] = await pool.query(
      `SELECT p.service_number, p.first_name, p.last_name, r.name as rank_name,
              d.name as department_name, c.name as course_name
       FROM participants p
       LEFT JOIN ranks r ON r.id = p.rank_id
       LEFT JOIN departments d ON d.id = p.department_id
       LEFT JOIN courses c ON c.id = p.course_id
       ${where}
       ORDER BY p.first_name, p.last_name`,
      params
    );
    return rows;
  },

  async pendingDocuments({ course_id }) {
    let where = 'WHERE pd.submitted = 0';
    const params = [];
    if (course_id) { where += ' AND p.course_id = ?'; params.push(course_id); }
    const [rows] = await pool.query(
      `SELECT p.service_number, p.first_name, p.last_name, c.name as course_name, dt.label as pending_document
       FROM participant_documents pd
       JOIN participants p ON p.id = pd.participant_id
       JOIN document_types dt ON dt.id = pd.document_type_id
       LEFT JOIN courses c ON c.id = p.course_id
       ${where}
       ORDER BY p.first_name, p.last_name`,
      params
    );
    return rows;
  },

  async attendanceReport({ course_id }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (course_id) { where += ' AND a.course_id = ?'; params.push(course_id); }
    const [rows] = await pool.query(
      `SELECT p.service_number, p.first_name, p.last_name, c.name as course_name,
              SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
              SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
              SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days,
              SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused_days,
              COUNT(*) as total_marked
       FROM attendance a
       JOIN participants p ON p.id = a.participant_id
       JOIN courses c ON c.id = a.course_id
       ${where}
       GROUP BY p.id, c.id
       ORDER BY p.first_name, p.last_name`,
      params
    );
    return rows;
  },

  async leaveReport({ course_id, status }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (course_id) { where += ' AND l.course_id = ?'; params.push(course_id); }
    if (status) { where += ' AND l.status = ?'; params.push(status); }
    const [rows] = await pool.query(
      `SELECT p.service_number, p.first_name, p.last_name, l.leave_type, l.start_date, l.end_date,
              DATEDIFF(l.end_date, l.start_date) + 1 as no_of_days, l.status
       FROM leaves l
       JOIN participants p ON p.id = l.participant_id
       ${where}
       ORDER BY l.start_date DESC`,
      params
    );
    return rows;
  },

  async certificateReport({ course_id, type }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (course_id) { where += ' AND cert.course_id = ?'; params.push(course_id); }
    if (type) { where += ' AND cert.type = ?'; params.push(type); }
    const [rows] = await pool.query(
      `SELECT cert.certificate_number, p.first_name, p.last_name, p.service_number,
              c.name as course_name, cert.type, cert.issued_date
       FROM certificates cert
       JOIN participants p ON p.id = cert.participant_id
       JOIN courses c ON c.id = cert.course_id
       ${where}
       ORDER BY cert.issued_date DESC`,
      params
    );
    return rows;
  },

  async facultyReport() {
    const [rows] = await pool.query(
      `SELECT f.name, r.name as rank_name, des.name as designation_name, i.name as institute_name, f.status,
              (SELECT COUNT(*) FROM course_faculty cf WHERE cf.faculty_id = f.id) as courses_assigned
       FROM faculty f
       LEFT JOIN ranks r ON r.id = f.rank_id
       LEFT JOIN designations des ON des.id = f.designation_id
       LEFT JOIN institutes i ON i.id = f.institute_id
       ORDER BY f.name`
    );
    return rows;
  },

  async honorariumReport({ course_id }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (course_id) { where += ' AND h.course_id = ?'; params.push(course_id); }
    const [rows] = await pool.query(
      `SELECT f.name as faculty_name, c.name as course_name, h.paper_setting, h.theory_exam,
              h.practical_exam, h.evaluation, h.transport, h.total
       FROM honorarium_entries h
       JOIN faculty f ON f.id = h.faculty_id
       JOIN courses c ON c.id = h.course_id
       ${where}
       ORDER BY c.name, f.name`,
      params
    );
    return rows;
  },

  async courseReport({ financial_year }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (financial_year) { where += ' AND c.financial_year = ?'; params.push(financial_year); }
    const [rows] = await pool.query(
      `SELECT c.code, c.name, c.financial_year, c.start_date, c.end_date, c.total_seats,
              (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id) as enrolled_count,
              c.status
       FROM courses c
       ${where}
       ORDER BY c.financial_year DESC, c.start_date DESC`,
      params
    );
    return rows;
  },

  async resultSheetReport({ course_id }) {
    if (!course_id) return [];
    const [rows] = await pool.query(
      `SELECT p.service_number, p.first_name, p.last_name,
              mid.marks_obtained as midterm_marks, fin.marks_obtained as final_marks,
              pb.total as practical_total, pb.percentage as practical_percentage,
              pb.grade as practical_grade, pb.rank_position as practical_rank
       FROM participants p
       LEFT JOIN exam_results mid ON mid.participant_id = p.id AND mid.course_id = ? AND mid.exam_category = 'theory' AND mid.exam_type = 'midterm'
       LEFT JOIN exam_results fin ON fin.participant_id = p.id AND fin.course_id = ? AND fin.exam_category = 'theory' AND fin.exam_type = 'final'
       LEFT JOIN practical_breakups pb ON pb.participant_id = p.id AND pb.course_id = ? AND pb.exam_type = 'final'
       WHERE p.course_id = ?
       ORDER BY pb.rank_position IS NULL, pb.rank_position`,
      [course_id, course_id, course_id, course_id]
    );
    return rows;
  },

  async practicalBreakupReport({ course_id }) {
    let where = 'WHERE 1=1';
    const params = [];
    where += " AND pb.exam_type = 'final'";
    if (course_id) { where += ' AND pb.course_id = ?'; params.push(course_id); }
    const [rows] = await pool.query(
      `SELECT p.service_number, p.first_name, p.last_name, c.name as course_name,
              pb.pump_drill, pb.ba_set, pb.hose, pb.ert, pb.viva, pb.class_notes, pb.station_duty,
              pb.conduct_keenness, pb.average, pb.total, pb.percentage, pb.grade, pb.rank_position
       FROM practical_breakups pb
       JOIN participants p ON p.id = pb.participant_id
       JOIN courses c ON c.id = pb.course_id
       ${where}
       ORDER BY c.name, pb.rank_position IS NULL, pb.rank_position`,
      params
    );
    return rows;
  },

  async fundReport({ course_id }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (course_id) { where += ' AND rf.course_id = ?'; params.push(course_id); }
    const [rows] = await pool.query(
      `SELECT c.name as course_name, rf.deposit_date, rf.amount_per_week, rf.duration_weeks,
              rf.strength, rf.total_collection
       FROM regimental_fund_entries rf
       JOIN courses c ON c.id = rf.course_id
       ${where}
       ORDER BY rf.deposit_date DESC`,
      params
    );
    return rows;
  },
};

export default reportRepository;
