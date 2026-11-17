import pool from '../config/database.js';

const searchRepository = {
  async search(term) {
    const like = `%${term}%`;
    const asId = Number.isInteger(Number(term)) ? Number(term) : null;

    const [participants] = await pool.query(
      `SELECT p.id, p.service_number, p.first_name, p.last_name, r.name as rank_name, p.movement_order_number
       FROM participants p
       LEFT JOIN ranks r ON r.id = p.rank_id
       WHERE p.id = ? OR p.service_number LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?
             OR r.name LIKE ? OR p.movement_order_number LIKE ?
       LIMIT 10`,
      [asId, like, like, like, like, like]
    );

    const [courses] = await pool.query(
      `SELECT id, code, name, financial_year, status FROM courses
       WHERE code LIKE ? OR name LIKE ?
       LIMIT 10`,
      [like, like]
    );

    const [faculty] = await pool.query(
      `SELECT id, name, mobile, email FROM faculty WHERE name LIKE ? LIMIT 10`,
      [like]
    );

    const [certificates] = await pool.query(
      `SELECT cert.id, cert.certificate_number, cert.type, p.first_name, p.last_name
       FROM certificates cert
       JOIN participants p ON p.id = cert.participant_id
       WHERE cert.certificate_number LIKE ?
       LIMIT 10`,
      [like]
    );

    return { participants, courses, faculty, certificates };
  },
};

export default searchRepository;
