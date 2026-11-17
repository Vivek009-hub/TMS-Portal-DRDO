import pool from '../config/database.js';

const feedbackRepository = {
  async findById(id) {
    const [rows] = await pool.query(
      `SELECT f.*, c.name as course_name,
              CASE WHEN f.is_anonymous = 0 THEN p.first_name ELSE 'Anonymous' END as first_name,
              CASE WHEN f.is_anonymous = 0 THEN p.last_name ELSE '' END as last_name
       FROM feedback f
       JOIN courses c ON c.id = f.course_id
       JOIN participants p ON p.id = f.participant_id
       WHERE f.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  buildFilterClause({ course_id, participant_id }) {
    let where = 'WHERE 1=1';
    const params = [];

    if (course_id) {
      where += ' AND f.course_id = ?';
      params.push(course_id);
    }
    if (participant_id) {
      where += ' AND f.participant_id = ?';
      params.push(participant_id);
    }

    return { where, params };
  },

  async findAll({ course_id, participant_id, limit, offset }) {
    const { where, params } = this.buildFilterClause({ course_id, participant_id });

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM feedback f ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT f.*, c.name as course_name,
              CASE WHEN f.is_anonymous = 0 THEN p.first_name ELSE 'Anonymous' END as first_name,
              CASE WHEN f.is_anonymous = 0 THEN p.last_name ELSE '' END as last_name
       FROM feedback f
       JOIN courses c ON c.id = f.course_id
       JOIN participants p ON p.id = f.participant_id
       ${where}
       ORDER BY f.submitted_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { data: rows, total: countResult[0].total };
  },

  /** Same filters as findAll but unpaginated — used by list-level exports. */
  async findAllForExport({ course_id, participant_id }) {
    const { where, params } = this.buildFilterClause({ course_id, participant_id });

    const [rows] = await pool.query(
      `SELECT f.*, c.name as course_name,
              CASE WHEN f.is_anonymous = 0 THEN p.first_name ELSE 'Anonymous' END as first_name,
              CASE WHEN f.is_anonymous = 0 THEN p.last_name ELSE '' END as last_name
       FROM feedback f
       JOIN courses c ON c.id = f.course_id
       JOIN participants p ON p.id = f.participant_id
       ${where}
       ORDER BY f.submitted_at DESC`,
      params
    );

    return rows;
  },

  async create(data) {
    const categoryScore = (v) => (v === null || v === undefined || v === '' ? null : v);
    const [result] = await pool.query(
      `INSERT INTO feedback
       (participant_id, course_id, overall_rating, content_rating, instructor_rating,
        facility_rating, classroom_arrangements, course_content_kit, practical_learning,
        faculty_score, overall_learning, hostel_stay, food, other_facilities,
        comments, suggestions, is_anonymous)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.participant_id,
        data.course_id,
        data.overall_rating,
        data.content_rating || null,
        data.instructor_rating || null,
        data.facility_rating || null,
        categoryScore(data.classroom_arrangements),
        categoryScore(data.course_content_kit),
        categoryScore(data.practical_learning),
        categoryScore(data.faculty_score),
        categoryScore(data.overall_learning),
        categoryScore(data.hostel_stay),
        categoryScore(data.food),
        categoryScore(data.other_facilities),
        data.comments || null,
        data.suggestions || null,
        data.is_anonymous ? 1 : 0,
      ]
    );
    return this.findById(result.insertId);
  },

  async getAverageRatings() {
    const [rows] = await pool.query(
      `SELECT
         ROUND(AVG(overall_rating), 2) as avg_overall,
         ROUND(AVG(content_rating), 2) as avg_content,
         ROUND(AVG(instructor_rating), 2) as avg_instructor,
         ROUND(AVG(facility_rating), 2) as avg_facility,
         COUNT(*) as total_feedback
       FROM feedback`
    );
    return rows[0];
  },

  async getCourseRatings() {
    const [rows] = await pool.query(
      `SELECT c.name as course_name, ROUND(AVG(f.overall_rating), 2) as avg_rating, COUNT(*) as count
       FROM feedback f
       JOIN courses c ON c.id = f.course_id
       GROUP BY f.course_id
       ORDER BY avg_rating DESC`
    );
    return rows;
  },
};

export default feedbackRepository;
