import pool from '../config/database.js';

const PARTICIPANT_COLUMNS = [
  'user_id', 'service_number', 'rank_id', 'first_name', 'last_name', 'mobile_number', 'email',
  'date_of_birth', 'educational_qualification', 'qualifying_essential_education',
  'date_of_appointment', 'date_of_retirement', 'unit_address', 'pin_code', 'medical_category_id',
  'date_of_reporting', 'reporting_time_session', 'movement_order_number', 'movement_order_date',
  'department_id', 'remarks', 'signature_path', 'eligible', 'actual_participation',
  'reallocation_reason', 'course_id', 'is_active', 'created_by',
];

const BOOLEAN_COLUMNS = ['qualifying_essential_education', 'eligible', 'actual_participation', 'is_active'];

// MySQL returns TINYINT(1) columns as JS numbers (0/1), not booleans. Coerce them so
// the frontend can round-trip a fetched participant straight back through an update
// without Joi's strict boolean check rejecting the raw 0/1.
function coerceBooleans(row) {
  if (!row) return row;
  BOOLEAN_COLUMNS.forEach((col) => {
    if (row[col] !== null && row[col] !== undefined) row[col] = Boolean(row[col]);
  });
  return row;
}

const SELECT_WITH_JOINS = `
  SELECT p.*,
         r.name as rank_name,
         d.name as department_name,
         mc.name as medical_category_name,
         c.name as course_name,
         c.code as course_code,
         c.financial_year as financial_year,
         u.email as user_email
  FROM participants p
  LEFT JOIN ranks r ON r.id = p.rank_id
  LEFT JOIN departments d ON d.id = p.department_id
  LEFT JOIN medical_categories mc ON mc.id = p.medical_category_id
  LEFT JOIN courses c ON c.id = p.course_id
  LEFT JOIN users u ON u.id = p.user_id
`;

const participantRepository = {
  async findById(id) {
    const [rows] = await pool.query(`${SELECT_WITH_JOINS} WHERE p.id = ?`, [id]);
    if (!rows[0]) return null;
    coerceBooleans(rows[0]);
    rows[0].documents = await this.getDocumentChecklist(id);
    return rows[0];
  },

  async findByUserId(userId) {
    const [rows] = await pool.query('SELECT * FROM participants WHERE user_id = ?', [userId]);
    return rows[0] || null;
  },

  async findByServiceNumber(serviceNumber) {
    const [rows] = await pool.query('SELECT * FROM participants WHERE service_number = ?', [serviceNumber]);
    return rows[0] || null;
  },

  // Whitelisted to prevent SQL injection via ORDER BY (column names can't be parameterized).
  SORTABLE_COLUMNS: {
    service_number: 'p.service_number', name: 'p.first_name', rank_name: 'r.name',
    department_name: 'd.name', unit: 'p.unit_address', course_name: 'c.name',
    financial_year: 'c.financial_year', date_of_birth: 'p.date_of_birth',
    created_at: 'p.created_at',
  },

  buildFilterClause({ search, department_id, rank_id, medical_category_id, course_id, is_active, financial_year, unit }) {
    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ` AND (p.service_number LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?
                     OR p.email LIKE ? OR p.mobile_number LIKE ? OR c.name LIKE ? OR c.code LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term, term);
    }
    if (department_id) {
      where += ' AND p.department_id = ?';
      params.push(department_id);
    }
    if (rank_id) {
      where += ' AND p.rank_id = ?';
      params.push(rank_id);
    }
    if (medical_category_id) {
      where += ' AND p.medical_category_id = ?';
      params.push(medical_category_id);
    }
    if (course_id) {
      where += ' AND p.course_id = ?';
      params.push(course_id);
    }
    if (is_active !== undefined) {
      where += ' AND p.is_active = ?';
      params.push(is_active ? 1 : 0);
    }
    if (financial_year) {
      where += ' AND c.financial_year = ?';
      params.push(financial_year);
    }
    if (unit) {
      where += ' AND p.unit_address LIKE ?';
      params.push(`%${unit}%`);
    }

    return { where, params };
  },

  async findAll({
    search, department_id, rank_id, medical_category_id, course_id, is_active,
    financial_year, unit, sort_by, sort_dir, limit, offset,
  }) {
    const { where, params } = this.buildFilterClause({
      search, department_id, rank_id, medical_category_id, course_id, is_active, financial_year, unit,
    });

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM participants p
       LEFT JOIN courses c ON c.id = p.course_id
       ${where}`,
      params
    );

    const orderColumn = Object.prototype.hasOwnProperty.call(this.SORTABLE_COLUMNS, sort_by)
      ? this.SORTABLE_COLUMNS[sort_by]
      : 'p.created_at';
    const orderDir = String(sort_dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const [rows] = await pool.query(
      `${SELECT_WITH_JOINS} ${where}
       ORDER BY ${orderColumn} ${orderDir}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    rows.forEach(coerceBooleans);

    return { data: rows, total: countResult[0].total };
  },

  /** Same filters as findAll but unpaginated — used by list-level exports. */
  async findAllForExport({ search, department_id, rank_id, medical_category_id, course_id, is_active, financial_year, unit }) {
    const { where, params } = this.buildFilterClause({
      search, department_id, rank_id, medical_category_id, course_id, is_active, financial_year, unit,
    });

    const [rows] = await pool.query(
      `${SELECT_WITH_JOINS} ${where} ORDER BY p.created_at DESC`,
      params
    );
    rows.forEach(coerceBooleans);
    return rows;
  },

  async getDistinctUnits() {
    const [rows] = await pool.query(
      `SELECT DISTINCT unit_address FROM participants WHERE unit_address IS NOT NULL AND unit_address <> '' ORDER BY unit_address`
    );
    return rows.map((r) => r.unit_address);
  },

  async create(data) {
    const values = PARTICIPANT_COLUMNS.map((col) => {
      if (col === 'is_active') return data.is_active === undefined ? 1 : data.is_active;
      return data[col] === undefined ? null : data[col];
    });
    const [result] = await pool.query(
      `INSERT INTO participants (${PARTICIPANT_COLUMNS.join(', ')})
       VALUES (${PARTICIPANT_COLUMNS.map(() => '?').join(', ')})`,
      values
    );

    if (Array.isArray(data.documents)) {
      await this.setDocumentChecklist(result.insertId, data.documents);
    }

    return this.findById(result.insertId);
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    PARTICIPANT_COLUMNS.forEach((col) => {
      if (data[col] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(data[col]);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await pool.query(`UPDATE participants SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    if (Array.isArray(data.documents)) {
      await this.setDocumentChecklist(id, data.documents);
    }

    return this.findById(id);
  },

  async delete(id) {
    await pool.query('DELETE FROM participants WHERE id = ?', [id]);
    return true;
  },

  async getDocumentChecklist(participantId) {
    const [rows] = await pool.query(
      `SELECT dt.id as document_type_id, dt.code, dt.label,
              pd.submitted, pd.submitted_at, pd.file_path
       FROM document_types dt
       LEFT JOIN participant_documents pd ON pd.document_type_id = dt.id AND pd.participant_id = ?
       ORDER BY dt.sort_order`,
      [participantId]
    );
    return rows.map((r) => ({ ...r, submitted: Boolean(r.submitted) }));
  },

  async setDocumentChecklist(participantId, documents) {
    for (const doc of documents) {
      await pool.query(
        `INSERT INTO participant_documents (participant_id, document_type_id, submitted, submitted_at, file_path)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE submitted = ?, submitted_at = ?, file_path = COALESCE(?, file_path)`,
        [
          participantId, doc.document_type_id, doc.submitted ? 1 : 0,
          doc.submitted ? new Date() : null, doc.file_path || null,
          doc.submitted ? 1 : 0, doc.submitted ? new Date() : null, doc.file_path || null,
        ]
      );
    }
  },

  async bulkCreate(participants, createdBy) {
    const connection = await pool.getConnection();
    const results = { created: 0, skipped: 0, errors: [] };

    try {
      await connection.beginTransaction();

      for (const p of participants) {
        try {
          const [existingRows] = await connection.query(
            'SELECT id FROM participants WHERE service_number = ?',
            [p.service_number]
          );
          if (existingRows.length > 0) {
            results.skipped++;
            continue;
          }

          const values = PARTICIPANT_COLUMNS.map((col) => {
            if (col === 'created_by') return createdBy;
            if (col === 'is_active') return 1;
            return p[col] === undefined ? null : p[col];
          });
          await connection.query(
            `INSERT INTO participants (${PARTICIPANT_COLUMNS.join(', ')})
             VALUES (${PARTICIPANT_COLUMNS.map(() => '?').join(', ')})`,
            values
          );
          results.created++;
        } catch (err) {
          results.errors.push({ service_number: p.service_number, error: err.message });
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return results;
  },
};

export default participantRepository;
