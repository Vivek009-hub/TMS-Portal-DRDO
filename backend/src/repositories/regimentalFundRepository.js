import pool from '../config/database.js';

const regimentalFundRepository = {
  async findAllByCourse(courseId) {
    const [rows] = await pool.query(
      `SELECT rf.*, c.name as course_name, c.code as course_code
       FROM regimental_fund_entries rf
       JOIN courses c ON c.id = rf.course_id
       WHERE rf.course_id = ?
       ORDER BY rf.deposit_date DESC`,
      [courseId]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT rf.*, c.name as course_name, c.code as course_code
       FROM regimental_fund_entries rf
       JOIN courses c ON c.id = rf.course_id
       WHERE rf.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async create(courseId, data) {
    const totalCollection = Number(data.amount_per_week) * Number(data.duration_weeks) * Number(data.strength);
    const [result] = await pool.query(
      `INSERT INTO regimental_fund_entries (course_id, deposit_date, amount_per_week, duration_weeks, strength, total_collection)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [courseId, data.deposit_date, data.amount_per_week, data.duration_weeks, data.strength, totalCollection]
    );
    return this.findById(result.insertId);
  },

  async update(id, data) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const amountPerWeek = data.amount_per_week ?? existing.amount_per_week;
    const durationWeeks = data.duration_weeks ?? existing.duration_weeks;
    const strength = data.strength ?? existing.strength;
    const totalCollection = Number(amountPerWeek) * Number(durationWeeks) * Number(strength);

    await pool.query(
      `UPDATE regimental_fund_entries
       SET deposit_date = ?, amount_per_week = ?, duration_weeks = ?, strength = ?, total_collection = ?
       WHERE id = ?`,
      [data.deposit_date ?? existing.deposit_date, amountPerWeek, durationWeeks, strength, totalCollection, id]
    );
    return this.findById(id);
  },

  async delete(id) {
    await pool.query('DELETE FROM regimental_fund_entries WHERE id = ?', [id]);
    return true;
  },
};

export default regimentalFundRepository;
