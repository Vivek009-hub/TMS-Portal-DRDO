import pool from '../config/database.js';

const attendanceRepository = {
  async findAll({ course_id, participant_id, date_from, date_to, limit, offset }) {
    let where = 'WHERE 1=1';
    const params = [];

    if (course_id) {
      where += ' AND a.course_id = ?';
      params.push(course_id);
    }
    if (participant_id) {
      where += ' AND a.participant_id = ?';
      params.push(participant_id);
    }
    if (date_from) {
      where += ' AND a.attendance_date >= ?';
      params.push(date_from);
    }
    if (date_to) {
      where += ' AND a.attendance_date <= ?';
      params.push(date_to);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM attendance a ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT a.*, p.first_name, p.last_name, p.service_number, c.name as course_name
       FROM attendance a
       JOIN participants p ON p.id = a.participant_id
       JOIN courses c ON c.id = a.course_id
       ${where}
       ORDER BY a.attendance_date DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { data: rows, total: countResult[0].total };
  },

  async upsert(data) {
    await pool.query(
      `INSERT INTO attendance (course_id, participant_id, attendance_date, status, remarks, marked_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), remarks = VALUES(remarks), marked_by = VALUES(marked_by)`,
      [data.course_id, data.participant_id, data.attendance_date, data.status, data.remarks || null, data.marked_by]
    );
    return true;
  },

  async bulkMark(courseId, date, records, markedBy) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const record of records) {
        await connection.query(
          `INSERT INTO attendance (course_id, participant_id, attendance_date, status, marked_by)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by)`,
          [courseId, record.participant_id, date, record.status, markedBy]
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return true;
  },
};

export default attendanceRepository;
