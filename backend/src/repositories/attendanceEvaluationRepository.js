import pool from '../config/database.js';

const attendanceEvaluationRepository = {
  async findAllByCourse(courseId) {
    const [rows] = await pool.query(
      `SELECT p.id as participant_id, p.service_number, p.first_name, p.last_name,
              ae.id, ae.no_of_leave_days, ae.attendance_marks, ae.evaluation_date
       FROM participants p
       LEFT JOIN attendance_evaluations ae ON ae.participant_id = p.id AND ae.course_id = ?
       WHERE p.course_id = ?
       ORDER BY p.first_name, p.last_name`,
      [courseId, courseId]
    );
    return rows;
  },

  async upsertForParticipant(courseId, participantId, data) {
    await pool.query(
      `INSERT INTO attendance_evaluations (participant_id, course_id, no_of_leave_days, attendance_marks, evaluation_date)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         no_of_leave_days = VALUES(no_of_leave_days), attendance_marks = VALUES(attendance_marks),
         evaluation_date = VALUES(evaluation_date)`,
      [participantId, courseId, data.no_of_leave_days ?? null, data.attendance_marks ?? null, data.evaluation_date || null]
    );
    const [rows] = await pool.query(
      `SELECT p.id as participant_id, p.service_number, p.first_name, p.last_name,
              ae.id, ae.no_of_leave_days, ae.attendance_marks, ae.evaluation_date
       FROM participants p
       JOIN attendance_evaluations ae ON ae.participant_id = p.id AND ae.course_id = ?
       WHERE p.id = ?`,
      [courseId, participantId]
    );
    return rows[0];
  },
};

export default attendanceEvaluationRepository;
