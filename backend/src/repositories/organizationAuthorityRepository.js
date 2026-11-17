import pool from '../config/database.js';

const AUTHORITY_COLUMNS = ['authority_type', 'name', 'rank_id', 'designation_id', 'mobile', 'course_id', 'created_by'];

const SELECT_WITH_JOINS = `
  SELECT oa.*, r.name as rank_name, des.name as designation_name, c.name as course_name, c.code as course_code
  FROM organization_authorities oa
  LEFT JOIN ranks r ON r.id = oa.rank_id
  LEFT JOIN designations des ON des.id = oa.designation_id
  LEFT JOIN courses c ON c.id = oa.course_id
`;

const organizationAuthorityRepository = {
  async findById(id) {
    const [rows] = await pool.query(`${SELECT_WITH_JOINS} WHERE oa.id = ?`, [id]);
    return rows[0] || null;
  },

  async findAll({ authority_type, course_id }) {
    let where = 'WHERE 1=1';
    const params = [];

    if (authority_type) {
      where += ' AND oa.authority_type = ?';
      params.push(authority_type);
    }
    if (course_id !== undefined) {
      if (course_id === null || course_id === 'null') {
        where += ' AND oa.course_id IS NULL';
      } else {
        where += ' AND oa.course_id = ?';
        params.push(course_id);
      }
    }

    const [rows] = await pool.query(
      `${SELECT_WITH_JOINS} ${where} ORDER BY oa.authority_type, oa.name`,
      params
    );
    return rows;
  },

  /** Every authority relevant to a course: institute-wide (course_id IS NULL) plus this course's own. */
  async findAllForCourse(courseId) {
    const [rows] = await pool.query(
      `${SELECT_WITH_JOINS} WHERE oa.course_id = ? OR oa.course_id IS NULL ORDER BY oa.authority_type, oa.name`,
      [courseId]
    );
    return rows;
  },

  async create(data) {
    const values = AUTHORITY_COLUMNS.map((col) => (data[col] === undefined ? null : data[col]));
    const [result] = await pool.query(
      `INSERT INTO organization_authorities (${AUTHORITY_COLUMNS.join(', ')})
       VALUES (${AUTHORITY_COLUMNS.map(() => '?').join(', ')})`,
      values
    );
    return this.findById(result.insertId);
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    AUTHORITY_COLUMNS.forEach((col) => {
      if (data[col] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(data[col]);
      }
    });
    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await pool.query(`UPDATE organization_authorities SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async delete(id) {
    await pool.query('DELETE FROM organization_authorities WHERE id = ?', [id]);
    return true;
  },
};

export default organizationAuthorityRepository;
