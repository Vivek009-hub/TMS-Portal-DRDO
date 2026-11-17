import feedbackRepository from '../repositories/feedbackRepository.js';
import participantRepository from '../repositories/participantRepository.js';
import courseRepository from '../repositories/courseRepository.js';
import { streamTablePdfToResponse } from './pdfService.js';
import { buildExcelBuffer, formatExportDate, buildFilterSummary } from './exportService.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { parsePagination, buildPaginatedResponse } from '../utils/helpers.js';

const FEEDBACK_EXPORT_COLUMNS = [
  { key: 'participant_name', label: 'Participant' },
  { key: 'course_name', label: 'Course' },
  { key: 'overall_rating', label: 'Overall Rating' },
  { key: 'content_rating', label: 'Content Rating' },
  { key: 'instructor_rating', label: 'Instructor Rating' },
  { key: 'facility_rating', label: 'Facility Rating' },
  { key: 'comments', label: 'Feedback' },
  { key: 'submitted_at', label: 'Date' },
];

const feedbackService = {
  async list(query, user) {
    const { page, limit, offset } = parsePagination(query);
    const filters = { course_id: query.course_id, limit, offset };

    if (user.role === 'user') {
      const participant = await participantRepository.findByUserId(user.id);
      if (!participant) throw new ForbiddenError('No participant profile linked');
      filters.participant_id = participant.id;
    }

    const { data, total } = await feedbackRepository.findAll(filters);
    return buildPaginatedResponse(data, total, page, limit);
  },

  async submit(data, user) {
    const participant = await participantRepository.findByUserId(user.id);
    if (!participant) throw new ForbiddenError('No participant profile linked');

    const course = await courseRepository.findById(data.course_id);
    if (!course) throw new NotFoundError('Course not found');

    const { data: existing } = await feedbackRepository.findAll({
      participant_id: participant.id,
      course_id: data.course_id,
      limit: 1,
      offset: 0,
    });
    if (existing.length > 0) {
      throw new ValidationError('Feedback already submitted for this course');
    }

    return feedbackRepository.create({
      ...data,
      participant_id: participant.id,
    });
  },

  async getAnalytics() {
    const [avgRatings, courseRatings] = await Promise.all([
      feedbackRepository.getAverageRatings(),
      feedbackRepository.getCourseRatings(),
    ]);
    return { avgRatings, courseRatings };
  },

  async exportList(query) {
    const rows = await feedbackRepository.findAllForExport({ course_id: query.course_id, participant_id: query.participant_id });
    return rows.map((r) => ({
      ...r,
      participant_name: `${r.first_name} ${r.last_name}`.trim() || 'Anonymous',
      submitted_at: formatExportDate(r.submitted_at),
    }));
  },

  async exportExcel(query) {
    const rows = await this.exportList(query);
    return buildExcelBuffer({ sheetName: 'Feedback', columns: FEEDBACK_EXPORT_COLUMNS, rows });
  },

  async exportPdf(query, res) {
    const rows = await this.exportList(query);
    const filterSummaryLines = buildFilterSummary({ Course: query.course_id });
    streamTablePdfToResponse(res, 'Feedback Report', FEEDBACK_EXPORT_COLUMNS, rows, { filterSummaryLines });
  },
};

export default feedbackService;
