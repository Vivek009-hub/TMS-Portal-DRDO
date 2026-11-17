import pool from '../config/database.js';

const ITEM_COLUMNS = ['bill_no', 'expenditure_date', 'details', 'mode_of_payment', 'expenditure_head', 'amount'];

const fundExpenditureItemRepository = {
  async findAllByCourse(courseId) {
    const [rows] = await pool.query(
      'SELECT * FROM fund_expenditure_items WHERE course_id = ? ORDER BY expenditure_date IS NULL, expenditure_date, id',
      [courseId]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM fund_expenditure_items WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create(courseId, data) {
    const [result] = await pool.query(
      `INSERT INTO fund_expenditure_items (course_id, ${ITEM_COLUMNS.join(', ')})
       VALUES (?, ${ITEM_COLUMNS.map(() => '?').join(', ')})`,
      [courseId, ...ITEM_COLUMNS.map((col) => data[col] === undefined ? null : data[col])]
    );
    return this.findById(result.insertId);
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    ITEM_COLUMNS.forEach((col) => {
      if (data[col] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(data[col]);
      }
    });
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await pool.query(`UPDATE fund_expenditure_items SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async delete(id) {
    await pool.query('DELETE FROM fund_expenditure_items WHERE id = ?', [id]);
    return true;
  },
};

export default fundExpenditureItemRepository;
