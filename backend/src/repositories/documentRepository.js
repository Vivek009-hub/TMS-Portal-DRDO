import pool from '../config/database.js';

const documentRepository = {
  async findById(id) {
    const [rows] = await pool.query(
      `SELECT d.*, c.name as course_name, u.first_name as uploaded_by_name
       FROM documents d
       LEFT JOIN courses c ON c.id = d.course_id
       LEFT JOIN users u ON u.id = d.uploaded_by
       WHERE d.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findAll({ search, category, course_id, is_public, limit, offset }) {
    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (d.title LIKE ? OR d.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      where += ' AND d.category = ?';
      params.push(category);
    }
    if (course_id) {
      where += ' AND d.course_id = ?';
      params.push(course_id);
    }
    if (is_public !== undefined) {
      where += ' AND d.is_public = ?';
      params.push(is_public ? 1 : 0);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM documents d ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT d.*, c.name as course_name
       FROM documents d
       LEFT JOIN courses c ON c.id = d.course_id
       ${where}
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { data: rows, total: countResult[0].total };
  },

  async create(data) {
    const [result] = await pool.query(
      `INSERT INTO documents
       (title, description, category, file_name, file_path, file_size, mime_type, course_id, is_public, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title,
        data.description || null,
        data.category,
        data.file_name,
        data.file_path,
        data.file_size,
        data.mime_type,
        data.course_id || null,
        data.is_public ? 1 : 0,
        data.uploaded_by,
      ]
    );
    return this.findById(result.insertId);
  },

  async delete(id) {
    const doc = await this.findById(id);
    if (doc) {
      await pool.query('DELETE FROM documents WHERE id = ?', [id]);
    }
    return doc;
  },
};

export default documentRepository;
