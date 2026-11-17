import pool from '../config/database.js';

const SELECT_WITH_JOINS = `
  SELECT m.*,
         CONCAT(p1.first_name, ' ', p1.last_name) as first_in_merit_name,
         CONCAT(p2.first_name, ' ', p2.last_name) as second_in_merit_name,
         CONCAT(p3.first_name, ' ', p3.last_name) as third_in_merit_name,
         CONCAT(p4.first_name, ' ', p4.last_name) as course_senior_name
  FROM mementoes_utilisation m
  LEFT JOIN participants p1 ON p1.id = m.first_in_merit_participant_id
  LEFT JOIN participants p2 ON p2.id = m.second_in_merit_participant_id
  LEFT JOIN participants p3 ON p3.id = m.third_in_merit_participant_id
  LEFT JOIN participants p4 ON p4.id = m.course_senior_participant_id
`;

const mementoesUtilisationRepository = {
  async findByCourse(courseId) {
    const [rows] = await pool.query(`${SELECT_WITH_JOINS} WHERE m.course_id = ?`, [courseId]);
    return rows[0] || null;
  },

  async upsertForCourse(courseId, data) {
    await pool.query(
      `INSERT INTO mementoes_utilisation
       (course_id, distribution_date, first_in_merit_participant_id, second_in_merit_participant_id,
        third_in_merit_participant_id, course_senior_participant_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         distribution_date = VALUES(distribution_date),
         first_in_merit_participant_id = VALUES(first_in_merit_participant_id),
         second_in_merit_participant_id = VALUES(second_in_merit_participant_id),
         third_in_merit_participant_id = VALUES(third_in_merit_participant_id),
         course_senior_participant_id = VALUES(course_senior_participant_id)`,
      [
        courseId, data.distribution_date || null,
        data.first_in_merit_participant_id || null, data.second_in_merit_participant_id || null,
        data.third_in_merit_participant_id || null, data.course_senior_participant_id || null,
      ]
    );
    return this.findByCourse(courseId);
  },
};

export default mementoesUtilisationRepository;
