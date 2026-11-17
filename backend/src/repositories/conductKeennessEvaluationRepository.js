import pool from '../config/database.js';

const conductKeennessEvaluationRepository = {
  async findAllByCourse(courseId) {
    const [rows] = await pool.query(
      `SELECT p.id as participant_id, p.service_number, p.first_name, p.last_name,
              ck.id, ck.max_marks, ck.eval_by_course_director, ck.eval_by_course_coordinator,
              ck.eval_by_ic_practical_drills, ck.average_marks, ck.evaluation_date
       FROM participants p
       LEFT JOIN conduct_keenness_evaluations ck ON ck.participant_id = p.id AND ck.course_id = ?
       WHERE p.course_id = ?
       ORDER BY p.first_name, p.last_name`,
      [courseId, courseId]
    );
    return rows;
  },

  async upsertForParticipant(courseId, participantId, data) {
    const scores = [data.eval_by_course_director, data.eval_by_course_coordinator, data.eval_by_ic_practical_drills]
      .map(Number).filter((n) => !Number.isNaN(n));
    const average = scores.length ? Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 100) / 100 : null;

    await pool.query(
      `INSERT INTO conduct_keenness_evaluations
       (participant_id, course_id, max_marks, eval_by_course_director, eval_by_course_coordinator,
        eval_by_ic_practical_drills, average_marks, evaluation_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         max_marks = VALUES(max_marks), eval_by_course_director = VALUES(eval_by_course_director),
         eval_by_course_coordinator = VALUES(eval_by_course_coordinator),
         eval_by_ic_practical_drills = VALUES(eval_by_ic_practical_drills),
         average_marks = VALUES(average_marks), evaluation_date = VALUES(evaluation_date)`,
      [
        participantId, courseId, data.max_marks ?? 20,
        data.eval_by_course_director ?? null, data.eval_by_course_coordinator ?? null,
        data.eval_by_ic_practical_drills ?? null, average, data.evaluation_date || null,
      ]
    );
    const [rows] = await pool.query(
      `SELECT p.id as participant_id, p.service_number, p.first_name, p.last_name,
              ck.id, ck.max_marks, ck.eval_by_course_director, ck.eval_by_course_coordinator,
              ck.eval_by_ic_practical_drills, ck.average_marks, ck.evaluation_date
       FROM participants p
       JOIN conduct_keenness_evaluations ck ON ck.participant_id = p.id AND ck.course_id = ?
       WHERE p.id = ?`,
      [courseId, participantId]
    );
    return rows[0];
  },
};

export default conductKeennessEvaluationRepository;
