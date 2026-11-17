import pool from '../config/database.js';
import participantRepository from './participantRepository.js';
import courseRepository from './courseRepository.js';
import certificateRepository from './certificateRepository.js';
import leaveRepository from './leaveRepository.js';
import feedbackRepository from './feedbackRepository.js';

/** Percentage change from `previous` to `current`. Null when there's no meaningful baseline
 * (previous is 0 but current isn't — the change is technically infinite, not a percentage). */
function percentDelta(current, previous) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

async function countBetween(table, dateColumn, start, end, extraWhere = '') {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) as count FROM ${table} WHERE ${dateColumn} BETWEEN ? AND ? ${extraWhere}`,
    [start, end]
  );
  return row.count;
}

const dashboardRepository = {
  /** `startDate`/`endDate` (YYYY-MM-DD) scope the period-based metrics (certificates issued,
   * new participants, enrollments, attendance %, and the certificate-type/leave-status/trend
   * breakdowns) and their period-over-period deltas. Current-state snapshots (totals, course
   * statuses, department distribution, upcoming courses, recent activity) are always global —
   * a date range doesn't change what's true "right now". Defaults to the last 30 days. */
  async getAdminStats({ startDate, endDate } = {}) {
    const isValidDate = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(d).getTime());
    const end = isValidDate(endDate) ? endDate : new Date().toISOString().slice(0, 10);
    const start = isValidDate(startDate) && new Date(startDate) <= new Date(end)
      ? startDate : new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const periodDays = Math.round((new Date(end) - new Date(start)) / 86400000) + 1;
    const prevEnd = new Date(new Date(start).getTime() - 86400000).toISOString().slice(0, 10);
    const prevStart = new Date(new Date(start).getTime() - periodDays * 86400000).toISOString().slice(0, 10);

    const [[participantCount]] = await pool.query(
      'SELECT COUNT(*) as count FROM participants WHERE is_active = 1'
    );
    const [[userCount]] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE is_active = 1'
    );
    const courseStatuses = await courseRepository.getStatusCounts();
    const feedbackAvg = await feedbackRepository.getAverageRatings();

    const [[runningCourses]] = await pool.query(
      "SELECT COUNT(*) as count FROM courses WHERE status = 'running'"
    );
    const [[completedCourses]] = await pool.query(
      "SELECT COUNT(*) as count FROM courses WHERE status = 'completed'"
    );
    const [[totalCertificates]] = await pool.query('SELECT COUNT(*) as count FROM certificates');
    const [[pendingLeaves]] = await pool.query(
      "SELECT COUNT(*) as count FROM leaves WHERE status = 'pending'"
    );

    const [[totalCourses]] = await pool.query('SELECT COUNT(*) as count FROM courses');
    const [[totalFaculty]] = await pool.query("SELECT COUNT(*) as count FROM faculty WHERE status = 'active'");
    const [[pendingDocuments]] = await pool.query(
      'SELECT COUNT(*) as count FROM participant_documents WHERE submitted = 0'
    );

    // Period-scoped breakdowns: what happened within the selected range, for the charts and
    // for the trend deltas on the stat cards.
    const [certificateTypes] = await pool.query(
      'SELECT type, COUNT(*) as count FROM certificates WHERE issued_date BETWEEN ? AND ? GROUP BY type',
      [start, end]
    );
    const [leaveStatuses] = await pool.query(
      'SELECT status, COUNT(*) as count FROM leaves WHERE created_at BETWEEN ? AND ? GROUP BY status',
      [start, `${end} 23:59:59`]
    );
    const [certificateTrends] = await pool.query(
      `SELECT DATE_FORMAT(issued_date, '%Y-%m') as month, COUNT(*) as count
       FROM certificates WHERE issued_date BETWEEN ? AND ?
       GROUP BY month ORDER BY month`,
      [start, end]
    );
    const [monthlyEnrollments] = await pool.query(
      `SELECT DATE_FORMAT(enrolled_at, '%Y-%m') as month, COUNT(*) as count
       FROM course_enrollments WHERE enrolled_at BETWEEN ? AND ?
       GROUP BY month ORDER BY month`,
      [start, `${end} 23:59:59`]
    );

    const certificatesIssued = await countBetween('certificates', 'issued_date', start, end);
    const certificatesIssuedPrev = await countBetween('certificates', 'issued_date', prevStart, prevEnd);
    const newParticipants = await countBetween('participants', 'created_at', start, `${end} 23:59:59`);
    const newParticipantsPrev = await countBetween('participants', 'created_at', prevStart, `${prevEnd} 23:59:59`);
    const enrollments = await countBetween('course_enrollments', 'enrolled_at', start, `${end} 23:59:59`);
    const enrollmentsPrev = await countBetween('course_enrollments', 'enrolled_at', prevStart, `${prevEnd} 23:59:59`);

    async function attendancePercentFor(from, to) {
      const [[row]] = await pool.query(
        `SELECT SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present, COUNT(*) as total
         FROM attendance WHERE attendance_date BETWEEN ? AND ?`,
        [from, to]
      );
      return row.total > 0 ? Math.round((row.present / row.total) * 10000) / 100 : null;
    }
    const attendancePercent = await attendancePercentFor(start, end);
    const attendancePercentPrev = await attendancePercentFor(prevStart, prevEnd);

    const [upcomingCourses] = await pool.query(
      `SELECT id, code, name, start_date, end_date, financial_year, status
       FROM courses WHERE start_date >= CURDATE() ORDER BY start_date ASC LIMIT 5`
    );

    const [departmentStatistics] = await pool.query(
      `SELECT d.id as department_id, d.name as department_name, COUNT(p.id) as participant_count
       FROM departments d
       LEFT JOIN participants p ON p.department_id = d.id
       GROUP BY d.id, d.name
       ORDER BY participant_count DESC`
    );

    const [recentActivity] = await pool.query(
      `(SELECT 'certificate' as activity_type, CONCAT('Certificate ', certificate_number, ' issued') as description, created_at
        FROM certificates ORDER BY created_at DESC LIMIT 5)
       UNION ALL
       (SELECT 'participant' as activity_type, CONCAT('Participant ', first_name, ' ', last_name, ' registered') as description, created_at
        FROM participants ORDER BY created_at DESC LIMIT 5)
       UNION ALL
       (SELECT 'leave' as activity_type, CONCAT(leave_type, ' leave request submitted') as description, created_at
        FROM leaves ORDER BY created_at DESC LIMIT 5)
       ORDER BY created_at DESC LIMIT 10`
    );

    return {
      period: { start, end },
      participants: participantCount.count,
      users: userCount.count,
      totalCourses: totalCourses.count,
      totalFaculty: totalFaculty.count,
      runningCourses: runningCourses.count,
      completedCourses: completedCourses.count,
      totalCertificates: totalCertificates.count,
      pendingLeaves: pendingLeaves.count,
      pendingDocuments: pendingDocuments.count,
      attendancePercent,
      attendancePercentDelta: attendancePercentPrev != null && attendancePercent != null
        ? Math.round((attendancePercent - attendancePercentPrev) * 100) / 100 : null,
      certificatesIssued,
      certificatesIssuedDelta: percentDelta(certificatesIssued, certificatesIssuedPrev),
      newParticipants,
      newParticipantsDelta: percentDelta(newParticipants, newParticipantsPrev),
      enrollments,
      enrollmentsDelta: percentDelta(enrollments, enrollmentsPrev),
      upcomingCourses,
      departmentStatistics,
      recentActivity,
      courseStatuses,
      certificateTypes,
      leaveStatuses,
      feedbackAvg,
      certificateTrends,
      monthlyEnrollments,
    };
  },

  async getParticipantStats(participantId) {
    const participant = await participantRepository.findById(participantId);
    if (!participant) return null;

    const { data: certificates } = await certificateRepository.findAll({
      participant_id: participantId,
      limit: 100,
      offset: 0,
    });
    const { data: leaves } = await leaveRepository.findAll({
      participant_id: participantId,
      limit: 100,
      offset: 0,
    });
    const { data: feedback } = await feedbackRepository.findAll({
      participant_id: participantId,
      limit: 100,
      offset: 0,
    });

    const [enrollments] = await pool.query(
      `SELECT ce.*, c.name, c.code, c.status, c.start_date, c.end_date
       FROM course_enrollments ce
       JOIN courses c ON c.id = ce.course_id
       WHERE ce.participant_id = ?`,
      [participantId]
    );

    return {
      participant,
      certificates,
      leaves,
      feedback,
      enrollments,
    };
  },
};

export default dashboardRepository;
