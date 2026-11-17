import pool from '../config/database.js';

const notificationRepository = {
  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM notifications WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findByUser(userId, { is_read, limit, offset }) {
    let where = 'WHERE user_id = ?';
    const params = [userId];

    if (is_read !== undefined) {
      where += ' AND is_read = ?';
      params.push(is_read ? 1 : 0);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM notifications ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { data: rows, total: countResult[0].total };
  },

  async create(data) {
    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)`,
      [data.user_id, data.title, data.message, data.type || 'info', data.link || null]
    );
    return this.findById(result.insertId);
  },

  async markAsRead(id, userId) {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
    return this.findById(id);
  },

  async markAllAsRead(userId) {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
    return true;
  },

  async getUnreadCount(userId) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return rows[0].count;
  },
};

export default notificationRepository;
