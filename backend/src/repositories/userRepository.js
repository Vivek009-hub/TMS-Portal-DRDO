import pool from '../config/database.js';

// Explicit allowlist so this generic update() can never be made to write an arbitrary
// column (e.g. `id`) even if a future caller is careless — defense-in-depth on top of
// the Joi validation that already restricts what reaches here from the HTTP layer.
const ALLOWED_UPDATE_FIELDS = ['email', 'first_name', 'last_name', 'role', 'is_active', 'password_hash'];

const userRepository = {
  async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT u.*, p.id as participant_id
       FROM users u
       LEFT JOIN participants p ON p.user_id = u.id
       WHERE u.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findAll({ search, role, is_active, limit, offset }) {
    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (role) {
      where += ' AND u.role = ?';
      params.push(role);
    }
    if (is_active !== undefined) {
      where += ' AND u.is_active = ?';
      params.push(is_active ? 1 : 0);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM users u ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active,
              u.last_login_at, u.created_at, u.updated_at,
              creator.first_name as created_by_name
       FROM users u
       LEFT JOIN users creator ON creator.id = u.created_by
       ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { data: rows, total: countResult[0].total };
  },

  async create({ email, password_hash, first_name, last_name, role, created_by }) {
    const [result] = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email, password_hash, first_name, last_name, role, created_by]
    );
    return this.findById(result.insertId);
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && ALLOWED_UPDATE_FIELDS.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async updateLastLogin(id) {
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);
  },

  async delete(id) {
    await pool.query('DELETE FROM users WHERE id = ? AND role != ?', [id, 'super_admin']);
    return true;
  },
};

export default userRepository;
