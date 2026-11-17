import pool from '../config/database.js';

const LOOKUP_TABLES = {
  ranks: 'ranks',
  departments: 'departments',
  designations: 'designations',
  institutes: 'institutes',
  'medical-categories': 'medical_categories',
  'document-types': 'document_types',
};

function tableFor(type) {
  const table = LOOKUP_TABLES[type];
  if (!table) throw new Error(`Unknown lookup type: ${type}`);
  return table;
}

const lookupRepository = {
  isValidType(type) {
    return Boolean(LOOKUP_TABLES[type]);
  },

  async findAll(type) {
    const table = tableFor(type);
    const orderBy = table === 'ranks' ? 'sort_order, name'
      : table === 'document_types' ? 'sort_order, label'
      : 'name';
    const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
    return rows;
  },

  async create(type, name) {
    const table = tableFor(type);
    const [result] = await pool.query(`INSERT INTO ${table} (name) VALUES (?)`, [name]);
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [result.insertId]);
    return rows[0];
  },

  async update(type, id, data, allowedFields) {
    const table = tableFor(type);
    const fields = [];
    const values = [];
    allowedFields.forEach((col) => {
      if (data[col] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(data[col] === '' ? null : data[col]);
      }
    });
    if (fields.length > 0) {
      values.push(id);
      await pool.query(`UPDATE ${table} SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return rows[0] || null;
  },

  async delete(type, id) {
    const table = tableFor(type);
    await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
    return true;
  },
};

export default lookupRepository;
