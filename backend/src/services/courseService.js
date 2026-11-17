import courseRepository from '../repositories/courseRepository.js';
import { streamTablePdfToResponse } from './pdfService.js';
import { buildExcelBuffer, buildFilterSummary } from './exportService.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { parsePagination, buildPaginatedResponse } from '../utils/helpers.js';

const COURSE_EXPORT_COLUMNS = [
  { key: 'code', label: 'Course Code' },
  { key: 'name', label: 'Course Name' },
  { key: 'instructor', label: 'Coordinator' },
  { key: 'venue', label: 'Venue' },
  { key: 'duration_days', label: 'Duration (days)' },
  { key: 'start_date', label: 'Start Date' },
  { key: 'end_date', label: 'End Date' },
  { key: 'financial_year', label: 'Training Year' },
  { key: 'enrolled_count', label: 'Enrolled Participants' },
  { key: 'status', label: 'Status' },
];

const ROSTER_EXPORT_COLUMNS = [
  { key: 'service_number', label: 'Service No.' },
  { key: 'name', label: 'Name' },
  { key: 'military_rank', label: 'Rank' },
  { key: 'department', label: 'Department' },
  { key: 'status', label: 'Status' },
];

const courseService = {
  async list(query) {
    const { page, limit, offset } = parsePagination(query);
    const { data, total } = await courseRepository.findAll({
      search: query.search,
      status: query.status,
      financial_year: query.financial_year,
      limit,
      offset,
    });
    return buildPaginatedResponse(data, total, page, limit);
  },

  async getFinancialYears() {
    return courseRepository.getFinancialYears();
  },

  async getById(id) {
    const course = await courseRepository.findById(id);
    if (!course) throw new NotFoundError('Course not found');
    return course;
  },

  async create(data, createdBy) {
    const existing = await courseRepository.findByCode(data.code);
    if (existing) throw new ValidationError('Course code already exists');

    return courseRepository.create({ ...data, created_by: createdBy.id });
  },

  async update(id, data) {
    const course = await courseRepository.findById(id);
    if (!course) throw new NotFoundError('Course not found');

    if (data.code && data.code !== course.code) {
      const existing = await courseRepository.findByCode(data.code);
      if (existing) throw new ValidationError('Course code already exists');
    }

    return courseRepository.update(id, data);
  },

  async delete(id) {
    const course = await courseRepository.findById(id);
    if (!course) throw new NotFoundError('Course not found');
    await courseRepository.delete(id);
    return { message: 'Course deleted successfully' };
  },

  async getEnrollments(id) {
    const course = await courseRepository.findById(id);
    if (!course) throw new NotFoundError('Course not found');
    return courseRepository.getEnrollments(id);
  },

  async enrollParticipant(courseId, participantId) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    const enrolled = await courseRepository.enrollParticipant(courseId, participantId);
    return { enrolled };
  },

  async exportExcel(query) {
    const rows = await courseRepository.findAllForExport({
      search: query.search, status: query.status, financial_year: query.financial_year,
    });
    return buildExcelBuffer({ sheetName: 'Courses', columns: COURSE_EXPORT_COLUMNS, rows });
  },

  async exportPdf(query, res) {
    const rows = await courseRepository.findAllForExport({
      search: query.search, status: query.status, financial_year: query.financial_year,
    });
    const filterSummaryLines = buildFilterSummary({ 'Training Year': query.financial_year, Status: query.status, Search: query.search });
    streamTablePdfToResponse(res, 'Course Report', COURSE_EXPORT_COLUMNS, rows, { filterSummaryLines });
  },

  async exportRosterExcel(id) {
    const course = await courseRepository.findById(id);
    if (!course) throw new NotFoundError('Course not found');
    const rows = (await courseRepository.getEnrollments(id)).map((e) => ({ ...e, name: `${e.first_name} ${e.last_name}` }));
    return buildExcelBuffer({ sheetName: `Roster - ${course.code}`.slice(0, 31), columns: ROSTER_EXPORT_COLUMNS, rows });
  },

  async exportRosterPdf(id, res) {
    const course = await courseRepository.findById(id);
    if (!course) throw new NotFoundError('Course not found');
    const rows = (await courseRepository.getEnrollments(id)).map((e) => ({ ...e, name: `${e.first_name} ${e.last_name}` }));
    streamTablePdfToResponse(res, `Course Roster - ${course.name}`, ROSTER_EXPORT_COLUMNS, rows, {
      filterSummaryLines: [`Course: ${course.name} (${course.code})`],
    });
  },
};

export default courseService;
