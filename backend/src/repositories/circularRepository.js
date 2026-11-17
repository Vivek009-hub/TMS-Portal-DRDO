import pool from '../config/database.js';

const circularRepository = {
  async findById(id) {
    const [rows] = await pool.query(
      `SELECT circ.*, c.name as course_name, u.first_name as created_by_name
       FROM circulars circ
       LEFT JOIN courses c ON c.id = circ.course_id
       LEFT JOIN users u ON u.id = circ.created_by
       WHERE circ.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findAll({ search, status, course_id, limit, offset }) {
    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (circ.title LIKE ? OR circ.reference_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      where += ' AND circ.status = ?';
      params.push(status);
    }
    if (course_id) {
      where += ' AND circ.course_id = ?';
      params.push(course_id);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM circulars circ ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT circ.*, c.name as course_name
       FROM circulars circ
       LEFT JOIN courses c ON c.id = circ.course_id
       ${where}
       ORDER BY circ.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { data: rows, total: countResult[0].total };
  },

  async create(data) {
    const [result] = await pool.query(
      `INSERT INTO circulars (course_id, title, reference_number, content, template_id, status, created_by, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.course_id || null,
        data.title,
        data.reference_number || null,
        data.content,
        data.template_id || null,
        data.status || 'draft',
        data.created_by,
        data.status === 'published' ? new Date() : null,
      ]
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
    if (data.status === 'published') {
      fields.push('published_at = NOW()');
    }
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await pool.query(`UPDATE circulars SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async delete(id) {
    await pool.query('DELETE FROM circulars WHERE id = ?', [id]);
    return true;
  },
};

export default circularRepository;
