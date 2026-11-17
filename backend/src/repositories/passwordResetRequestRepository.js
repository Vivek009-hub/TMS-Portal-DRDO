import pool from '../config/database.js';

const SELECT_WITH_JOINS = `
  SELECT r.id, r.user_id, r.status, r.requested_at, r.reviewed_by, r.reviewed_at,
         r.review_reason, r.completed_at, r.created_at, r.updated_at,
         u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email,
         reviewer.first_name as reviewer_first_name, reviewer.last_name as reviewer_last_name
  FROM password_reset_requests r
  JOIN users u ON u.id = r.user_id
  LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
`;

const passwordResetRequestRepository = {
  async create(userId) {
    const [result] = await pool.query(
      'INSERT INTO password_reset_requests (user_id, status) VALUES (?, ?)',
      [userId, 'pending']
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await pool.query(`${SELECT_WITH_JOINS} WHERE r.id = ?`, [id]);
    return rows[0] || null;
  },

  /** Requests that still represent a "live" reset flow for this user (used for dedupe). */
  async findActiveByUser(userId) {
    const [rows] = await pool.query(
      `SELECT * FROM password_reset_requests WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  },

  async findAll({ status, limit, offset }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (status) {
      where += ' AND r.status = ?';
      params.push(status);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM password_reset_requests r ${where}`,
      params
    );

    const [rows] = await pool.query(
      `${SELECT_WITH_JOINS} ${where} ORDER BY r.requested_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { data: rows, total: countResult[0].total };
  },

  /** Atomic: only succeeds if the request is still pending, preventing double-approval races. */
  async markCompleted(id, reviewerId) {
    const [result] = await pool.query(
      `UPDATE password_reset_requests
       SET status = 'completed', reviewed_by = ?, reviewed_at = NOW(), completed_at = NOW()
       WHERE id = ? AND status = 'pending'`,
      [reviewerId, id]
    );
    return result.affectedRows === 1;
  },

  async markRejected(id, reviewerId, reason) {
    const [result] = await pool.query(
      `UPDATE password_reset_requests
       SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), review_reason = ?
       WHERE id = ? AND status = 'pending'`,
      [reviewerId, reason || null, id]
    );
    return result.affectedRows === 1;
  },

  async expire(id) {
    await pool.query(
      `UPDATE password_reset_requests SET status = 'expired' WHERE id = ? AND status = 'pending'`,
      [id]
    );
  },
};

export default passwordResetRequestRepository;
