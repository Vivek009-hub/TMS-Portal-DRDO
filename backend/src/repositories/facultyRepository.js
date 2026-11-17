import pool from '../config/database.js';

const FACULTY_COLUMNS = [
  'name', 'rank_id', 'designation_id', 'institute_id', 'mobile', 'email',
  'address', 'expertise', 'status', 'created_by',
];

const SELECT_WITH_JOINS = `
  SELECT f.*, r.name as rank_name, des.name as designation_name, i.name as institute_name
  FROM faculty f
  LEFT JOIN ranks r ON r.id = f.rank_id
  LEFT JOIN designations des ON des.id = f.designation_id
  LEFT JOIN institutes i ON i.id = f.institute_id
`;

const facultyRepository = {
  async findById(id) {
    const [rows] = await pool.query(`${SELECT_WITH_JOINS} WHERE f.id = ?`, [id]);
    return rows[0] || null;
  },

  async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM faculty WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findAll({ search, rank_id, institute_id, status, limit, offset }) {
    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (f.name LIKE ? OR f.email LIKE ? OR f.expertise LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (rank_id) {
      where += ' AND f.rank_id = ?';
      params.push(rank_id);
    }
    if (institute_id) {
      where += ' AND f.institute_id = ?';
      params.push(institute_id);
    }
    if (status) {
      where += ' AND f.status = ?';
      params.push(status);
    }

    const [countResult] = await pool.query(`SELECT COUNT(*) as total FROM faculty f ${where}`, params);
    const [rows] = await pool.query(
      `${SELECT_WITH_JOINS} ${where} ORDER BY f.name LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { data: rows, total: countResult[0].total };
  },

  async create(data) {
    const values = FACULTY_COLUMNS.map((col) => {
      if (col === 'status') return data.status || 'active';
      return data[col] === undefined ? null : data[col];
    });
    const [result] = await pool.query(
      `INSERT INTO faculty (${FACULTY_COLUMNS.join(', ')}) VALUES (${FACULTY_COLUMNS.map(() => '?').join(', ')})`,
      values
    );
    return this.findById(result.insertId);
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    FACULTY_COLUMNS.forEach((col) => {
      if (data[col] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(data[col]);
      }
    });
    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await pool.query(`UPDATE faculty SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async delete(id) {
    await pool.query('DELETE FROM faculty WHERE id = ?', [id]);
    return true;
  },

  async assignToCourse(courseId, facultyId, role) {
    const [result] = await pool.query(
      `INSERT IGNORE INTO course_faculty (course_id, faculty_id, role) VALUES (?, ?, ?)`,
      [courseId, facultyId, role || null]
    );
    return result.affectedRows > 0;
  },

  async unassignFromCourse(courseId, facultyId) {
    await pool.query('DELETE FROM course_faculty WHERE course_id = ? AND faculty_id = ?', [courseId, facultyId]);
    return true;
  },

  async updateCourseAssignment(courseId, facultyId, data) {
    const fields = [];
    const values = [];
    if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role || null); }
    if (data.show_on_certificate !== undefined) { fields.push('show_on_certificate = ?'); values.push(data.show_on_certificate ? 1 : 0); }
    if (fields.length === 0) return false;
    values.push(courseId, facultyId);
    const [result] = await pool.query(
      `UPDATE course_faculty SET ${fields.join(', ')} WHERE course_id = ? AND faculty_id = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  async getCourseAssignments(courseId) {
    const [rows] = await pool.query(
      `SELECT cf.id, cf.role, cf.show_on_certificate, cf.assigned_at, f.id as faculty_id, f.name, f.mobile, f.email,
              r.name as rank_name, des.name as designation_name, i.name as institute_name
       FROM course_faculty cf
       JOIN faculty f ON f.id = cf.faculty_id
       LEFT JOIN ranks r ON r.id = f.rank_id
       LEFT JOIN designations des ON des.id = f.designation_id
       LEFT JOIN institutes i ON i.id = f.institute_id
       WHERE cf.course_id = ?
       ORDER BY f.name`,
      [courseId]
    );
    return rows;
  },

  async getCertificateSignatories(courseId) {
    const [rows] = await pool.query(
      `SELECT f.id as faculty_id, f.name, des.name as designation_name, cf.role,
              i.name as institute_name, i.phone as institute_phone, i.fax as institute_fax,
              i.email as institute_email, i.address as institute_address
       FROM course_faculty cf
       JOIN faculty f ON f.id = cf.faculty_id
       LEFT JOIN designations des ON des.id = f.designation_id
       LEFT JOIN institutes i ON i.id = f.institute_id
       WHERE cf.course_id = ? AND cf.show_on_certificate = 1
       ORDER BY f.name`,
      [courseId]
    );
    return rows;
  },
};

export default facultyRepository;
