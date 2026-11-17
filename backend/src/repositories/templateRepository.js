import pool from '../config/database.js';

const templateRepository = {
  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM document_templates WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findAll({ type }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (type) {
      where += ' AND type = ?';
      params.push(type);
    }
    const [rows] = await pool.query(
      `SELECT * FROM document_templates ${where} ORDER BY is_default DESC, name`,
      params
    );
    return rows;
  },

  async findDefault(type, certificateType = null) {
    let query = 'SELECT * FROM document_templates WHERE type = ? AND is_default = 1';
    const params = [type];
    if (certificateType) {
      query += ' AND certificate_type = ?';
      params.push(certificateType);
    }
    const [rows] = await pool.query(query, params);
    return rows[0] || null;
  },

  async create(data) {
    const [result] = await pool.query(
      `INSERT INTO document_templates
        (type, name, content, certificate_type, is_default, source_format, docx_path, docx_original_name, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.type, data.name, data.content, data.certificate_type || null, data.is_default ? 1 : 0,
        data.source_format || 'html', data.docx_path || null, data.docx_original_name || null, data.updated_by,
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
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await pool.query(`UPDATE document_templates SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async delete(id) {
    await pool.query('DELETE FROM document_templates WHERE id = ?', [id]);
    return true;
  },
};

export default templateRepository;
