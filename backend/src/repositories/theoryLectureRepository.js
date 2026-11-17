import pool from '../config/database.js';

const LECTURE_COLUMNS = [
  'course_id', 'topic', 'sessions', 'faculty_id',
  'confirmed_by_faculty', 'alternate_faculty_id', 'reason_for_change',
  'coordinator_authority_id', 'director_authority_id', 'associate_director_authority_id',
];

const SELECT_WITH_JOINS = `
  SELECT tlt.*, f.name as faculty_name, r.name as faculty_rank, i.name as faculty_institute,
         alt.name as alternate_faculty_name,
         coord.name as coordinator_name, dir.name as director_name, adir.name as associate_director_name
  FROM theory_lecture_topics tlt
  LEFT JOIN faculty f ON f.id = tlt.faculty_id
  LEFT JOIN ranks r ON r.id = f.rank_id
  LEFT JOIN institutes i ON i.id = f.institute_id
  LEFT JOIN faculty alt ON alt.id = tlt.alternate_faculty_id
  LEFT JOIN organization_authorities coord ON coord.id = tlt.coordinator_authority_id
  LEFT JOIN organization_authorities dir ON dir.id = tlt.director_authority_id
  LEFT JOIN organization_authorities adir ON adir.id = tlt.associate_director_authority_id
`;

const theoryLectureRepository = {
  async findById(id) {
    const [rows] = await pool.query(`${SELECT_WITH_JOINS} WHERE tlt.id = ?`, [id]);
    return rows[0] || null;
  },

  async findAllByCourse(courseId) {
    const [rows] = await pool.query(
      `${SELECT_WITH_JOINS} WHERE tlt.course_id = ? ORDER BY tlt.id`,
      [courseId]
    );
    return rows;
  },

  async create(data) {
    const values = LECTURE_COLUMNS.map((col) => (data[col] === undefined ? null : data[col]));
    const [result] = await pool.query(
      `INSERT INTO theory_lecture_topics (${LECTURE_COLUMNS.join(', ')})
       VALUES (${LECTURE_COLUMNS.map(() => '?').join(', ')})`,
      values
    );
    return this.findById(result.insertId);
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    LECTURE_COLUMNS.forEach((col) => {
      if (col !== 'course_id' && data[col] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(data[col]);
      }
    });
    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await pool.query(`UPDATE theory_lecture_topics SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async delete(id) {
    await pool.query('DELETE FROM theory_lecture_topics WHERE id = ?', [id]);
    return true;
  },
};

export default theoryLectureRepository;
