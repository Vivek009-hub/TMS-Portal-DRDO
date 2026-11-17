import pool from '../config/database.js';

const scheduleSlotRepository = {
  async findAllByCourseWeek(courseId, weekNumber) {
    const [rows] = await pool.query(
      `SELECT ss.*, f.name as faculty_name
       FROM schedule_slots ss
       LEFT JOIN faculty f ON f.id = ss.faculty_id
       WHERE ss.course_id = ? AND ss.week_number = ?
       ORDER BY ss.day_number, ss.start_time`,
      [courseId, weekNumber]
    );
    return rows;
  },

  async findAllByCourse(courseId) {
    const [rows] = await pool.query(
      `SELECT ss.*, f.name as faculty_name
       FROM schedule_slots ss
       LEFT JOIN faculty f ON f.id = ss.faculty_id
       WHERE ss.course_id = ?
       ORDER BY ss.week_number, ss.day_number, ss.start_time`,
      [courseId]
    );
    return rows;
  },

  async upsertCell(courseId, weekNumber, cell) {
    await pool.query(
      `INSERT INTO schedule_slots (course_id, week_number, day_number, start_time, end_time, topic, faculty_id, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         end_time = VALUES(end_time), topic = VALUES(topic),
         faculty_id = VALUES(faculty_id), remarks = VALUES(remarks)`,
      [
        courseId, weekNumber, cell.day_number, cell.start_time, cell.end_time,
        cell.topic || null, cell.faculty_id || null, cell.remarks || null,
      ]
    );
  },

  async upsertBulk(courseId, weekNumber, cells) {
    for (const cell of cells) {
      await this.upsertCell(courseId, weekNumber, cell);
    }
    return this.findAllByCourseWeek(courseId, weekNumber);
  },
};

export default scheduleSlotRepository;
