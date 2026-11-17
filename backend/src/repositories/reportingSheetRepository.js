import pool from '../config/database.js';

const reportingSheetRepository = {
  async findById(id) {
    const [rows] = await pool.query(
      `SELECT rs.*, p.service_number, p.first_name, p.last_name, r.name as rank_name
       FROM reporting_sheet_entries rs
       JOIN participants p ON p.id = rs.participant_id
       LEFT JOIN ranks r ON r.id = p.rank_id
       WHERE rs.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findOneForParticipant(courseId, participantId) {
    const [rows] = await pool.query(
      `SELECT * FROM reporting_sheet_entries WHERE course_id = ? AND participant_id = ? ORDER BY created_at DESC LIMIT 1`,
      [courseId, participantId]
    );
    return rows[0] || null;
  },

  async findAllByCourse(courseId) {
    // upsertForParticipant guarantees at most one entry per (participant_id, course_id),
    // so a plain LEFT JOIN is sufficient here.
    const [rows] = await pool.query(
      `SELECT p.id as participant_id, p.service_number, p.first_name, p.last_name,
              r.name as rank_name, rs.id, rs.reporting_date, rs.reporting_time, rs.signature_path
       FROM participants p
       LEFT JOIN ranks r ON r.id = p.rank_id
       LEFT JOIN reporting_sheet_entries rs ON rs.participant_id = p.id AND rs.course_id = ?
       WHERE p.course_id = ?
       ORDER BY p.first_name, p.last_name`,
      [courseId, courseId]
    );
    return rows;
  },

  async upsertForParticipant(courseId, participantId, data) {
    const existing = await this.findOneForParticipant(courseId, participantId);
    if (existing) {
      const fields = [];
      const values = [];
      ['reporting_date', 'reporting_time', 'signature_path'].forEach((col) => {
        if (data[col] !== undefined) {
          fields.push(`${col} = ?`);
          values.push(data[col]);
        }
      });
      if (fields.length > 0) {
        values.push(existing.id);
        await pool.query(`UPDATE reporting_sheet_entries SET ${fields.join(', ')} WHERE id = ?`, values);
      }
      return this.findById(existing.id);
    }

    const [result] = await pool.query(
      `INSERT INTO reporting_sheet_entries (participant_id, course_id, reporting_date, reporting_time, signature_path)
       VALUES (?, ?, ?, ?, ?)`,
      [participantId, courseId, data.reporting_date, data.reporting_time || null, data.signature_path || null]
    );
    return this.findById(result.insertId);
  },

  async delete(id) {
    await pool.query('DELETE FROM reporting_sheet_entries WHERE id = ?', [id]);
    return true;
  },
};

export default reportingSheetRepository;
