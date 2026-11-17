import pool from '../config/database.js';

const examResultRepository = {
  async findAllByCourse(courseId, examCategory, examType) {
    const category = examCategory || 'theory';
    const type = examType || 'midterm';
    const [rows] = await pool.query(
      `SELECT p.id as participant_id, p.service_number, p.first_name, p.last_name,
              er.id, er.exam_category, er.exam_type, er.max_marks, er.passing_marks, er.marks_obtained, er.exam_date,
              er.examiner_id, er.invigilator_id, er.invigilator2_id,
              ex.name as examiner_name, inv.name as invigilator_name, inv2.name as invigilator2_name
       FROM participants p
       LEFT JOIN exam_results er ON er.participant_id = p.id AND er.course_id = ? AND er.exam_category = ? AND er.exam_type = ?
       LEFT JOIN faculty ex ON ex.id = er.examiner_id
       LEFT JOIN faculty inv ON inv.id = er.invigilator_id
       LEFT JOIN faculty inv2 ON inv2.id = er.invigilator2_id
       WHERE p.course_id = ?
       ORDER BY p.first_name, p.last_name`,
      [courseId, category, type, courseId]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT er.*, p.service_number, p.first_name, p.last_name,
              ex.name as examiner_name, inv.name as invigilator_name, inv2.name as invigilator2_name
       FROM exam_results er
       JOIN participants p ON p.id = er.participant_id
       LEFT JOIN faculty ex ON ex.id = er.examiner_id
       LEFT JOIN faculty inv ON inv.id = er.invigilator_id
       LEFT JOIN faculty inv2 ON inv2.id = er.invigilator2_id
       WHERE er.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async upsertForParticipant(courseId, participantId, examCategory, examType, data) {
    const category = examCategory || 'theory';
    const type = examType || 'midterm';
    await pool.query(
      `INSERT INTO exam_results
       (participant_id, course_id, exam_category, exam_type, max_marks, passing_marks,
        examiner_id, invigilator_id, invigilator2_id, exam_date, marks_obtained)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         max_marks = VALUES(max_marks), passing_marks = VALUES(passing_marks),
         examiner_id = VALUES(examiner_id), invigilator_id = VALUES(invigilator_id), invigilator2_id = VALUES(invigilator2_id),
         exam_date = VALUES(exam_date), marks_obtained = VALUES(marks_obtained)`,
      [
        participantId, courseId, category, type,
        data.max_marks ?? 100, data.passing_marks ?? 40,
        data.examiner_id || null, data.invigilator_id || null, data.invigilator2_id || null,
        data.exam_date || null, data.marks_obtained ?? null,
      ]
    );
    const [rows] = await pool.query(
      'SELECT id FROM exam_results WHERE participant_id = ? AND course_id = ? AND exam_category = ? AND exam_type = ?',
      [participantId, courseId, category, type]
    );
    return this.findById(rows[0].id);
  },

  async delete(id) {
    await pool.query('DELETE FROM exam_results WHERE id = ?', [id]);
    return true;
  },
};

export default examResultRepository;
