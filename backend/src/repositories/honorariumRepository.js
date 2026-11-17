import pool from '../config/database.js';

const SELECT_WITH_JOINS = `
  SELECT h.*, f.name as faculty_name, c.name as course_name, c.code as course_code
  FROM honorarium_entries h
  JOIN faculty f ON f.id = h.faculty_id
  JOIN courses c ON c.id = h.course_id
`;

const honorariumRepository = {
  async findAllByCourse(courseId) {
    const [rows] = await pool.query(
      `${SELECT_WITH_JOINS} WHERE h.course_id = ? ORDER BY f.name`,
      [courseId]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query(`${SELECT_WITH_JOINS} WHERE h.id = ?`, [id]);
    return rows[0] || null;
  },

  async create(courseId, data) {
    const total = ['paper_setting', 'theory_exam', 'practical_exam', 'evaluation', 'transport']
      .reduce((sum, key) => sum + (Number(data[key]) || 0), 0);
    const [result] = await pool.query(
      `INSERT INTO honorarium_entries (course_id, faculty_id, paper_setting, theory_exam, practical_exam, evaluation, transport, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        courseId, data.faculty_id,
        data.paper_setting || 0, data.theory_exam || 0, data.practical_exam || 0,
        data.evaluation || 0, data.transport || 0, total,
      ]
    );
    return this.findById(result.insertId);
  },

  async update(id, data) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const merged = {
      paper_setting: data.paper_setting ?? existing.paper_setting,
      theory_exam: data.theory_exam ?? existing.theory_exam,
      practical_exam: data.practical_exam ?? existing.practical_exam,
      evaluation: data.evaluation ?? existing.evaluation,
      transport: data.transport ?? existing.transport,
    };
    const total = Object.values(merged).reduce((sum, v) => sum + (Number(v) || 0), 0);

    await pool.query(
      `UPDATE honorarium_entries
       SET paper_setting = ?, theory_exam = ?, practical_exam = ?, evaluation = ?, transport = ?, total = ?
       WHERE id = ?`,
      [merged.paper_setting, merged.theory_exam, merged.practical_exam, merged.evaluation, merged.transport, total, id]
    );
    return this.findById(id);
  },

  async delete(id) {
    await pool.query('DELETE FROM honorarium_entries WHERE id = ?', [id]);
    return true;
  },
};

export default honorariumRepository;
