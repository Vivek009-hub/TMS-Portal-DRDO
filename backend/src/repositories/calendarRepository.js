import pool from '../config/database.js';

const calendarRepository = {
  async findById(id) {
    const [rows] = await pool.query(
      `SELECT cal.*, c.name as course_name, c.code as course_code
       FROM course_calendars cal
       JOIN courses c ON c.id = cal.course_id
       WHERE cal.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  buildFilterClause({ course_id, year }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (course_id) {
      where += ' AND cal.course_id = ?';
      params.push(course_id);
    }
    if (year) {
      where += ' AND cal.year = ?';
      params.push(year);
    }
    return { where, params };
  },

  async findAll({ course_id, year, limit, offset }) {
    const { where, params } = this.buildFilterClause({ course_id, year });

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM course_calendars cal ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT cal.*, c.name as course_name, c.code as course_code
       FROM course_calendars cal
       JOIN courses c ON c.id = cal.course_id
       ${where}
       ORDER BY cal.year DESC, cal.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { data: rows, total: countResult[0].total };
  },

  /** Same filters as findAll but unpaginated — used by list-level exports. */
  async findAllForExport({ course_id, year }) {
    const { where, params } = this.buildFilterClause({ course_id, year });

    const [rows] = await pool.query(
      `SELECT cal.*, c.name as course_name, c.code as course_code
       FROM course_calendars cal
       JOIN courses c ON c.id = cal.course_id
       ${where}
       ORDER BY cal.year DESC, cal.updated_at DESC`,
      params
    );

    return rows;
  },

  async create(data) {
    const [result] = await pool.query(
      `INSERT INTO course_calendars (course_id, title, content, template_id, year, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.course_id, data.title, data.content, data.template_id || null, data.year || new Date().getFullYear(), data.created_by]
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
    await pool.query(`UPDATE course_calendars SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async delete(id) {
    await pool.query('DELETE FROM course_calendars WHERE id = ?', [id]);
    return true;
  },
};

export default calendarRepository;
