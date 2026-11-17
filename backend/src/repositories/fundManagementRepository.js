import pool from '../config/database.js';

const SANCTION_HEADS = ['course_material', 'hospitality', 'honorarium', 'transport', 'mementoes', 'consumables', 'miscellaneous'];

const fundManagementRepository = {
  async findByCourse(courseId) {
    const [rows] = await pool.query('SELECT * FROM fund_management WHERE course_id = ?', [courseId]);
    return rows[0] || null;
  },

  async upsertForCourse(courseId, data) {
    const totalSanctioned = SANCTION_HEADS.reduce((sum, key) => sum + (Number(data[key]) || 0), 0);
    await pool.query(
      `INSERT INTO fund_management
       (course_id, course_material, hospitality, honorarium, transport, mementoes, consumables, miscellaneous,
        total_sanctioned, cash_drawn_amount, cash_drawn_date, balance_returned_date, bills_submission_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         course_material = VALUES(course_material), hospitality = VALUES(hospitality), honorarium = VALUES(honorarium),
         transport = VALUES(transport), mementoes = VALUES(mementoes), consumables = VALUES(consumables),
         miscellaneous = VALUES(miscellaneous), total_sanctioned = VALUES(total_sanctioned),
         cash_drawn_amount = VALUES(cash_drawn_amount), cash_drawn_date = VALUES(cash_drawn_date),
         balance_returned_date = VALUES(balance_returned_date), bills_submission_date = VALUES(bills_submission_date)`,
      [
        courseId,
        data.course_material || 0, data.hospitality || 0, data.honorarium || 0, data.transport || 0,
        data.mementoes || 0, data.consumables || 0, data.miscellaneous || 0, totalSanctioned,
        data.cash_drawn_amount ?? null, data.cash_drawn_date || null,
        data.balance_returned_date || null, data.bills_submission_date || null,
      ]
    );
    return this.findByCourse(courseId);
  },
};

export default fundManagementRepository;
