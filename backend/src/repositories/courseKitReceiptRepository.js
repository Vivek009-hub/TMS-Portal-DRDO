import pool from '../config/database.js';

const courseKitReceiptRepository = {
  async findAllByCourse(courseId) {
    const [rows] = await pool.query(
      `SELECT p.id as participant_id, p.service_number, p.first_name, p.last_name,
              r.id, r.distribution_date, r.course_material, r.course_kit, r.group_photo,
              r.remarks, r.signature_path
       FROM participants p
       LEFT JOIN course_kit_receipts r ON r.participant_id = p.id AND r.course_id = ?
       WHERE p.course_id = ?
       ORDER BY p.first_name, p.last_name`,
      [courseId, courseId]
    );
    return rows;
  },

  async upsertForParticipant(courseId, participantId, data) {
    await pool.query(
      `INSERT INTO course_kit_receipts
       (participant_id, course_id, distribution_date, course_material, course_kit, group_photo, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         distribution_date = VALUES(distribution_date), course_material = VALUES(course_material),
         course_kit = VALUES(course_kit), group_photo = VALUES(group_photo), remarks = VALUES(remarks)`,
      [
        participantId, courseId, data.distribution_date || null,
        data.course_material ? 1 : 0, data.course_kit ? 1 : 0, data.group_photo ? 1 : 0,
        data.remarks || null,
      ]
    );
    const [rows] = await pool.query(
      `SELECT p.id as participant_id, p.service_number, p.first_name, p.last_name,
              r.id, r.distribution_date, r.course_material, r.course_kit, r.group_photo,
              r.remarks, r.signature_path
       FROM participants p
       JOIN course_kit_receipts r ON r.participant_id = p.id AND r.course_id = ?
       WHERE p.id = ?`,
      [courseId, participantId]
    );
    return rows[0];
  },
};

export default courseKitReceiptRepository;
