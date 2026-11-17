import pool from '../config/database.js';

const leaveRepository = {
  async findById(id) {
    const [rows] = await pool.query(
      `SELECT l.*, p.first_name, p.last_name, p.service_number,
              c.name as course_name, approver.first_name as approved_by_name
       FROM leaves l
       JOIN participants p ON p.id = l.participant_id
       LEFT JOIN courses c ON c.id = l.course_id
       LEFT JOIN users approver ON approver.id = l.approved_by
       WHERE l.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  buildFilterClause({ status, participant_id, course_id, leave_type }) {
    let where = 'WHERE 1=1';
    const params = [];

    if (status) {
      where += ' AND l.status = ?';
      params.push(status);
    }
    if (participant_id) {
      where += ' AND l.participant_id = ?';
      params.push(participant_id);
    }
    if (course_id) {
      where += ' AND l.course_id = ?';
      params.push(course_id);
    }
    if (leave_type) {
      where += ' AND l.leave_type = ?';
      params.push(leave_type);
    }

    return { where, params };
  },

  async findAll({ status, participant_id, course_id, leave_type, limit, offset }) {
    const { where, params } = this.buildFilterClause({ status, participant_id, course_id, leave_type });

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM leaves l ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT l.*, p.first_name, p.last_name, p.service_number, c.name as course_name
       FROM leaves l
       JOIN participants p ON p.id = l.participant_id
       LEFT JOIN courses c ON c.id = l.course_id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { data: rows, total: countResult[0].total };
  },

  /** Same filters as findAll but unpaginated — used by list-level exports. */
  async findAllForExport({ status, participant_id, course_id, leave_type }) {
    const { where, params } = this.buildFilterClause({ status, participant_id, course_id, leave_type });

    const [rows] = await pool.query(
      `SELECT l.*, p.first_name, p.last_name, p.service_number, c.name as course_name,
              DATEDIFF(l.end_date, l.start_date) + 1 as no_of_days
       FROM leaves l
       JOIN participants p ON p.id = l.participant_id
       LEFT JOIN courses c ON c.id = l.course_id
       ${where}
       ORDER BY l.start_date DESC`,
      params
    );

    return rows;
  },

  async create(data) {
    const [result] = await pool.query(
      `INSERT INTO leaves (participant_id, course_id, leave_type, start_date, end_date, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.participant_id, data.course_id || null, data.leave_type, data.start_date, data.end_date, data.reason]
    );
    return this.findById(result.insertId);
  },

  async updateStatus(id, status, approvedBy, adminRemarks) {
    await pool.query(
      `UPDATE leaves SET status = ?, approved_by = ?, approved_at = NOW(), admin_remarks = ? WHERE id = ?`,
      [status, approvedBy, adminRemarks || null, id]
    );
    return this.findById(id);
  },

  async getStatusCounts() {
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) as count FROM leaves GROUP BY status`
    );
    return rows;
  },
};

export default leaveRepository;
