import pool from '../config/database.js';

const scheduleRepository = {
  async findById(id) {
    const [rows] = await pool.query(
      `SELECT s.*, c.name as course_name, c.code as course_code
       FROM course_schedules s
       JOIN courses c ON c.id = s.course_id
       WHERE s.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findAll({ course_id, limit, offset }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (course_id) {
      where += ' AND s.course_id = ?';
      params.push(course_id);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM course_schedules s ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT s.*, c.name as course_name, c.code as course_code
       FROM course_schedules s
       JOIN courses c ON c.id = s.course_id
       ${where}
       ORDER BY s.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { data: rows, total: countResult[0].total };
  },

  async create(data) {
    const [result] = await pool.query(
      `INSERT INTO course_schedules (course_id, title, content, template_id, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [data.course_id, data.title, data.content, data.template_id || null, data.created_by]
    );
    return this.findById(result.insertId);
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await pool.query(`UPDATE course_schedules SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async delete(id) {
    await pool.query('DELETE FROM course_schedules WHERE id = ?', [id]);
    return true;
  },
};

export default scheduleRepository;
