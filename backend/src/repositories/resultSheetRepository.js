import pool from '../config/database.js';

const resultSheetRepository = {
  async findAllByCourse(courseId) {
    const [rows] = await pool.query(
      `SELECT p.id as participant_id, p.service_number, p.first_name, p.last_name, r.name as rank_name,
              mid.marks_obtained as midterm_marks, mid.max_marks as midterm_max, mid.passing_marks as midterm_passing,
              fin.marks_obtained as final_marks, fin.max_marks as final_max, fin.passing_marks as final_passing,
              pb.total as practical_total, pb.average as practical_average, pb.percentage as practical_percentage,
              pb.grade as practical_grade, pb.rank_position as practical_rank, pb.result_date as practical_result_date,
              ae.no_of_leave_days, ae.attendance_marks, ae.evaluation_date
       FROM participants p
       LEFT JOIN ranks r ON r.id = p.rank_id
       LEFT JOIN exam_results mid ON mid.participant_id = p.id AND mid.course_id = ? AND mid.exam_category = 'theory' AND mid.exam_type = 'midterm'
       LEFT JOIN exam_results fin ON fin.participant_id = p.id AND fin.course_id = ? AND fin.exam_category = 'theory' AND fin.exam_type = 'final'
       LEFT JOIN practical_breakups pb ON pb.participant_id = p.id AND pb.course_id = ? AND pb.exam_type = 'final'
       LEFT JOIN attendance_evaluations ae ON ae.participant_id = p.id AND ae.course_id = ?
       WHERE p.course_id = ?
       ORDER BY pb.rank_position IS NULL, pb.rank_position, p.first_name`,
      [courseId, courseId, courseId, courseId, courseId]
    );
    return rows;
  },
};

export default resultSheetRepository;
