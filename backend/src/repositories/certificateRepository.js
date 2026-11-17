import pool from '../config/database.js';

const CERTIFICATE_COLUMNS = [
  'certificate_number', 'participant_id', 'course_id', 'type', 'template_id', 'issued_date',
  'qr_code_data', 'file_path', 'docx_file_path', 'remarks', 'grading', 'sos_date', 'sos_time', 'rtu_reason',
  'accommodation', 'transport', 'bills_paid', 'movement_order_reference',
  'director_authority_id', 'associate_director_authority_id', 'course_director_authority_id',
  'issued_by',
];

const SIGNER_JOINS = `
  LEFT JOIN organization_authorities dir ON dir.id = cert.director_authority_id
  LEFT JOIN ranks dir_r ON dir_r.id = dir.rank_id
  LEFT JOIN organization_authorities adir ON adir.id = cert.associate_director_authority_id
  LEFT JOIN ranks adir_r ON adir_r.id = adir.rank_id
  LEFT JOIN organization_authorities cdir ON cdir.id = cert.course_director_authority_id
  LEFT JOIN ranks cdir_r ON cdir_r.id = cdir.rank_id
`;

const SIGNER_FIELDS = `
  dir.name as director_name, dir_r.name as director_rank,
  adir.name as associate_director_name, adir_r.name as associate_director_rank,
  cdir.name as course_director_name, cdir_r.name as course_director_rank
`;

const certificateRepository = {
  async findById(id) {
    const [rows] = await pool.query(
      `SELECT cert.*, p.first_name, p.last_name, p.service_number, r.name as military_rank,
              d.name as department, p.unit_address as unit, c.name as course_name, c.code as course_code,
              c.start_date as course_start, c.end_date as course_end,
              issuer.first_name as issued_by_name, ${SIGNER_FIELDS}
       FROM certificates cert
       JOIN participants p ON p.id = cert.participant_id
       LEFT JOIN ranks r ON r.id = p.rank_id
       LEFT JOIN departments d ON d.id = p.department_id
       JOIN courses c ON c.id = cert.course_id
       LEFT JOIN users issuer ON issuer.id = cert.issued_by
       ${SIGNER_JOINS}
       WHERE cert.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByNumber(certificateNumber) {
    const [rows] = await pool.query(
      `SELECT cert.*, p.first_name, p.last_name, p.service_number, r.name as military_rank,
              c.name as course_name, c.code as course_code
       FROM certificates cert
       JOIN participants p ON p.id = cert.participant_id
       LEFT JOIN ranks r ON r.id = p.rank_id
       JOIN courses c ON c.id = cert.course_id
       WHERE cert.certificate_number = ?`,
      [certificateNumber]
    );
    return rows[0] || null;
  },

  buildFilterClause({ search, type, course_id, participant_id }) {
    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (cert.certificate_number LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? OR p.service_number LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    if (type) {
      where += ' AND cert.type = ?';
      params.push(type);
    }
    if (course_id) {
      where += ' AND cert.course_id = ?';
      params.push(course_id);
    }
    if (participant_id) {
      where += ' AND cert.participant_id = ?';
      params.push(participant_id);
    }

    return { where, params };
  },

  async findAll({ search, type, course_id, participant_id, limit, offset }) {
    const { where, params } = this.buildFilterClause({ search, type, course_id, participant_id });

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM certificates cert
       JOIN participants p ON p.id = cert.participant_id
       ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT cert.*, p.first_name, p.last_name, p.service_number, d.name as department_name,
              c.name as course_name, c.code as course_code
       FROM certificates cert
       JOIN participants p ON p.id = cert.participant_id
       LEFT JOIN departments d ON d.id = p.department_id
       JOIN courses c ON c.id = cert.course_id
       ${where}
       ORDER BY cert.issued_date DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { data: rows, total: countResult[0].total };
  },

  /** Same filters as findAll but unpaginated — used by list-level exports. */
  async findAllForExport({ search, type, course_id, participant_id }) {
    const { where, params } = this.buildFilterClause({ search, type, course_id, participant_id });

    const [rows] = await pool.query(
      `SELECT cert.*, p.first_name, p.last_name, p.service_number, d.name as department_name,
              c.name as course_name, c.code as course_code
       FROM certificates cert
       JOIN participants p ON p.id = cert.participant_id
       LEFT JOIN departments d ON d.id = p.department_id
       JOIN courses c ON c.id = cert.course_id
       ${where}
       ORDER BY cert.issued_date DESC`,
      params
    );

    return rows;
  },

  async create(data) {
    const values = CERTIFICATE_COLUMNS.map((col) => (data[col] === undefined ? null : data[col]));
    const [result] = await pool.query(
      `INSERT INTO certificates (${CERTIFICATE_COLUMNS.join(', ')})
       VALUES (${CERTIFICATE_COLUMNS.map(() => '?').join(', ')})`,
      values
    );
    return this.findById(result.insertId);
  },

  async delete(id) {
    await pool.query('DELETE FROM certificates WHERE id = ?', [id]);
    return true;
  },

  async getTypeCounts() {
    const [rows] = await pool.query(
      `SELECT type, COUNT(*) as count FROM certificates GROUP BY type`
    );
    return rows;
  },

  async getMonthlyTrends(months = 12) {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(issued_date, '%Y-%m') as month, COUNT(*) as count
       FROM certificates
       WHERE issued_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
       GROUP BY month
       ORDER BY month`,
      [months]
    );
    return rows;
  },
};

export default certificateRepository;
