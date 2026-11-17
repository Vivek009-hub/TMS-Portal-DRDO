import pool from '../config/database.js';

const settingsRepository = {
  async findAll() {
    const [rows] = await pool.query('SELECT * FROM settings ORDER BY setting_key');
    return rows;
  },

  async findByKey(key) {
    const [rows] = await pool.query('SELECT * FROM settings WHERE setting_key = ?', [key]);
    return rows[0] || null;
  },

  async upsert(key, value, description, updatedBy) {
    await pool.query(
      `INSERT INTO settings (setting_key, setting_value, description, updated_by)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value),
         description = COALESCE(VALUES(description), description),
         updated_by = VALUES(updated_by)`,
      [key, value, description || null, updatedBy]
    );
    return this.findByKey(key);
  },

  async bulkUpdate(settings, updatedBy) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const { key, value, description } of settings) {
        await connection.query(
          `INSERT INTO settings (setting_key, setting_value, description, updated_by)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value),
             description = COALESCE(VALUES(description), description),
             updated_by = VALUES(updated_by)`,
          [key, value, description || null, updatedBy]
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return this.findAll();
  },
};

export default settingsRepository;
