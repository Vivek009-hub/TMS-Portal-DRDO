import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Break-glass recovery: directly resets a super_admin's password, bypassing the
 * normal admin-approval workflow entirely. For use by someone with server/DB access
 * when the only super_admin is locked out and no one else can approve their request.
 *
 * Usage: npm run reset-super-admin-password -- --email=someone@example.com --password=NewPass123
 */

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

async function run() {
  const { email, password } = parseArgs();

  if (!email || !password) {
    console.error('Usage: npm run reset-super-admin-password -- --email=<email> --password=<newPassword>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  try {
    const [rows] = await pool.query('SELECT id, role FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }
    // Refuses to touch any non-super_admin account — this is a super_admin recovery
    // tool, not a general-purpose password backdoor.
    if (user.role !== 'super_admin') {
      console.error(`User ${email} is not a super_admin (role: ${user.role}). Refusing to proceed.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `UPDATE users SET password_hash = ? WHERE email = ? AND role = 'super_admin'`,
      [passwordHash, email]
    );

    if (result.affectedRows === 1) {
      logger.info(`Password reset for super_admin: ${email}`);
      console.log(`Password successfully reset for ${email}.`);
    } else {
      console.error('No rows updated — nothing changed.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Failed to reset password:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
