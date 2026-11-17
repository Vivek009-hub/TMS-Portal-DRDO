import pool from '../config/database.js';

const COURSE_COLUMNS = [
  'code', 'name', 'description', 'instructor', 'venue', 'duration_days',
  'start_date', 'end_date', 'financial_year', 'authorized_seats', 'total_seats',
  'status', 'created_by',
];

const courseRepository = {
  async findById(id) {
    const [rows] = await pool.query(
      `SELECT c.*, u.first_name as created_by_name,
              (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id) as enrolled_count
       FROM courses c
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.id = ?`,
      [id]
    );
    if (!rows[0]) return null;
    rows[0].seat_allocations = await this.getSeatAllocations(id);
    return rows[0];
  },

  async findByCode(code) {
    const [rows] = await pool.query('SELECT * FROM courses WHERE code = ?', [code]);
    return rows[0] || null;
  },

  buildFilterClause({ search, status, financial_year }) {
    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (c.name LIKE ? OR c.code LIKE ? OR c.instructor LIKE ? OR c.venue LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    if (status) {
      where += ' AND c.status = ?';
      params.push(status);
    }
    if (financial_year) {
      where += ' AND c.financial_year = ?';
      params.push(financial_year);
    }

    return { where, params };
  },

  async findAll({ search, status, financial_year, limit, offset }) {
    const { where, params } = this.buildFilterClause({ search, status, financial_year });

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM courses c ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id) as enrolled_count
       FROM courses c
       ${where}
       ORDER BY c.financial_year DESC, c.start_date DESC, c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { data: rows, total: countResult[0].total };
  },

  /** Same filters as findAll but unpaginated — used by list-level exports. */
  async findAllForExport({ search, status, financial_year }) {
    const { where, params } = this.buildFilterClause({ search, status, financial_year });

    const [rows] = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id) as enrolled_count
       FROM courses c
       ${where}
       ORDER BY c.financial_year DESC, c.start_date DESC, c.created_at DESC`,
      params
    );

    return rows;
  },

  async create(data) {
    const values = COURSE_COLUMNS.map((col) => {
      if (col === 'total_seats') return data.total_seats || 50;
      return data[col] === undefined ? null : data[col];
    });
    const [result] = await pool.query(
      `INSERT INTO courses (${COURSE_COLUMNS.join(', ')})
       VALUES (${COURSE_COLUMNS.map(() => '?').join(', ')})`,
      values
    );

    if (Array.isArray(data.seat_allocations)) {
      await this.setSeatAllocations(result.insertId, data.seat_allocations);
    }

    return this.findById(result.insertId);
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    COURSE_COLUMNS.forEach((col) => {
      if (data[col] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(data[col]);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await pool.query(`UPDATE courses SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    if (Array.isArray(data.seat_allocations)) {
      await this.setSeatAllocations(id, data.seat_allocations);
    }

    return this.findById(id);
  },

  async delete(id) {
    await pool.query('DELETE FROM courses WHERE id = ?', [id]);
    return true;
  },

  async getSeatAllocations(courseId) {
    const [rows] = await pool.query(
      `SELECT csa.id, csa.department_id, d.name as department_name, csa.allocated_seats
       FROM course_seat_allocations csa
       JOIN departments d ON d.id = csa.department_id
       WHERE csa.course_id = ?
       ORDER BY d.name`,
      [courseId]
    );
    return rows;
  },

  async setSeatAllocations(courseId, allocations) {
    await pool.query('DELETE FROM course_seat_allocations WHERE course_id = ?', [courseId]);
    for (const allocation of allocations) {
      await pool.query(
        `INSERT INTO course_seat_allocations (course_id, department_id, allocated_seats) VALUES (?, ?, ?)`,
        [courseId, allocation.department_id, allocation.allocated_seats]
      );
    }
  },

  async enrollParticipant(courseId, participantId) {
    const [result] = await pool.query(
      `INSERT IGNORE INTO course_enrollments (course_id, participant_id) VALUES (?, ?)`,
      [courseId, participantId]
    );
    return result.affectedRows > 0;
  },

  async getEnrollments(courseId) {
    const [rows] = await pool.query(
      `SELECT ce.*, p.service_number, p.first_name, p.last_name, r.name as military_rank, d.name as department
       FROM course_enrollments ce
       JOIN participants p ON p.id = ce.participant_id
       LEFT JOIN ranks r ON r.id = p.rank_id
       LEFT JOIN departments d ON d.id = p.department_id
       WHERE ce.course_id = ?
       ORDER BY p.last_name, p.first_name`,
      [courseId]
    );
    return rows;
  },

  async getStatusCounts() {
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) as count FROM courses GROUP BY status`
    );
    return rows;
  },

  async getFinancialYears() {
    const [rows] = await pool.query(
      `SELECT DISTINCT financial_year FROM courses WHERE financial_year IS NOT NULL ORDER BY financial_year DESC`
    );
    return rows.map((r) => r.financial_year);
  },
};

export default courseRepository;
