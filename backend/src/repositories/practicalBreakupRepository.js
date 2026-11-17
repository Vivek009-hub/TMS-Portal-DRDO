import pool from '../config/database.js';

const COMPONENTS = ['pump_drill', 'ba_set', 'hose', 'ert', 'viva', 'class_notes', 'station_duty', 'conduct_keenness'];

function gradeFor(percentage) {
  if (percentage === null) return null;
  if (percentage >= 75) return 'A';
  if (percentage >= 60) return 'B';
  if (percentage >= 45) return 'C';
  if (percentage >= 33) return 'D';
  return 'F';
}

const practicalBreakupRepository = {
  async findAllByCourse(courseId, examType) {
    const type = examType || 'final';
    // Start FROM participants (LEFT JOIN practical_breakups) so every enrolled participant
    // appears — including before anyone has entered marks — matching the same pattern as
    // examResultRepository/attendanceEvaluationRepository. An INNER JOIN starting from the
    // (initially empty) practical_breakups table would show zero rows until the first save,
    // making the entry UI impossible to use from a fresh course.
    const [rows] = await pool.query(
      `SELECT p.id as participant_id, p.service_number, p.first_name, p.last_name,
              pb.id, pb.exam_type, pb.examiner_id, pb.invigilator_id, pb.invigilator2_id,
              ex.name as examiner_name, inv.name as invigilator_name, inv2.name as invigilator2_name,
              pb.pump_drill, pb.ba_set, pb.hose, pb.ert, pb.viva, pb.class_notes,
              pb.station_duty, pb.conduct_keenness, pb.average, pb.total, pb.percentage,
              pb.grade, pb.rank_position, pb.result_date
       FROM participants p
       LEFT JOIN practical_breakups pb ON pb.participant_id = p.id AND pb.course_id = ? AND pb.exam_type = ?
       LEFT JOIN faculty ex ON ex.id = pb.examiner_id
       LEFT JOIN faculty inv ON inv.id = pb.invigilator_id
       LEFT JOIN faculty inv2 ON inv2.id = pb.invigilator2_id
       WHERE p.course_id = ?
       ORDER BY pb.rank_position IS NULL, pb.rank_position, p.first_name`,
      [courseId, type, courseId]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT pb.*, p.service_number, p.first_name, p.last_name,
              ex.name as examiner_name, inv.name as invigilator_name, inv2.name as invigilator2_name
       FROM practical_breakups pb
       JOIN participants p ON p.id = pb.participant_id
       LEFT JOIN faculty ex ON ex.id = pb.examiner_id
       LEFT JOIN faculty inv ON inv.id = pb.invigilator_id
       LEFT JOIN faculty inv2 ON inv2.id = pb.invigilator2_id
       WHERE pb.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async upsertForParticipant(courseId, participantId, examType, data) {
    const type = examType || 'final';
    const values = COMPONENTS.map((c) => Number(data[c]) || 0);
    const total = values.reduce((sum, v) => sum + v, 0);
    const average = Math.round((total / COMPONENTS.length) * 100) / 100;
    const percentage = average;
    const grade = gradeFor(percentage);
    const resultDate = data.result_date || new Date().toISOString().split('T')[0];

    await pool.query(
      `INSERT INTO practical_breakups
       (participant_id, course_id, exam_type, examiner_id, invigilator_id, invigilator2_id,
        pump_drill, ba_set, hose, ert, viva, class_notes, station_duty, conduct_keenness,
        average, total, percentage, grade, result_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         examiner_id = VALUES(examiner_id), invigilator_id = VALUES(invigilator_id), invigilator2_id = VALUES(invigilator2_id),
         pump_drill = VALUES(pump_drill), ba_set = VALUES(ba_set), hose = VALUES(hose), ert = VALUES(ert),
         viva = VALUES(viva), class_notes = VALUES(class_notes), station_duty = VALUES(station_duty),
         conduct_keenness = VALUES(conduct_keenness), average = VALUES(average), total = VALUES(total),
         percentage = VALUES(percentage), grade = VALUES(grade), result_date = VALUES(result_date)`,
      [
        participantId, courseId, type,
        data.examiner_id || null, data.invigilator_id || null, data.invigilator2_id || null,
        ...values, average, total, percentage, grade, resultDate,
      ]
    );

    await this.recomputeRanks(courseId, type);

    const [rows] = await pool.query(
      'SELECT id FROM practical_breakups WHERE participant_id = ? AND course_id = ? AND exam_type = ?',
      [participantId, courseId, type]
    );
    return this.findById(rows[0].id);
  },

  async recomputeRanks(courseId, examType) {
    await pool.query(
      `UPDATE practical_breakups pb
       JOIN (
         SELECT id, RANK() OVER (ORDER BY percentage DESC) as rnk
         FROM practical_breakups WHERE course_id = ? AND exam_type = ?
       ) ranked ON ranked.id = pb.id
       SET pb.rank_position = ranked.rnk
       WHERE pb.course_id = ? AND pb.exam_type = ?`,
      [courseId, examType, courseId, examType]
    );
  },
};

export default practicalBreakupRepository;
