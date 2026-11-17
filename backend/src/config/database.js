import mysql from 'mysql2/promise';
import config from './index.js';
import logger from '../utils/logger.js';

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Without this, mysql2 returns DATE/DATETIME/TIMESTAMP columns as JS Date objects
  // constructed at local midnight, which then serialize to UTC via JSON.stringify and
  // shift a full day backward whenever the server's local timezone is ahead of UTC.
  // Returning raw date strings sidesteps timezone conversion entirely.
  dateStrings: true,
});

export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    logger.info('MySQL database connected successfully');
    return true;
  } catch (error) {
    logger.error('MySQL connection failed:', error.message);
    return false;
  }
}

export default pool;
