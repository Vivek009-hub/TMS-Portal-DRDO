import scheduleSlotRepository from '../repositories/scheduleSlotRepository.js';
import courseRepository from '../repositories/courseRepository.js';
import organizationAuthorityRepository from '../repositories/organizationAuthorityRepository.js';
import { streamTablePdfToResponse } from './pdfService.js';
import { buildExcelBuffer } from './exportService.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

/** Course Schedule Part 2 wants Course Coordinator/Director/Associate Director named on the
 * schedule itself — reuses the same institute-wide-or-course-scoped authority lookup the
 * certificate placeholder system already relies on, rather than a new mechanism. */
async function getSignatoryLine(courseId) {
  const authorities = await organizationAuthorityRepository.findAllForCourse(courseId);
  const nameFor = (type) => authorities.filter((a) => a.authority_type === type).map((a) => a.name).join(', ') || '—';
  return `Course Coordinator: ${nameFor('course_coordinator')}    Course Director: ${nameFor('course_director')}    Associate Director: ${nameFor('associate_director')}`;
}

const SCHEDULE_EXPORT_COLUMNS = [
  { key: 'week_number', label: 'Week' },
  { key: 'day_label', label: 'Day' },
  { key: 'start_time', label: 'Start Time' },
  { key: 'end_time', label: 'End Time' },
  { key: 'topic', label: 'Activity' },
  { key: 'faculty_name', label: 'Faculty' },
];

const scheduleSlotService = {
  async getWeek(courseId, weekNumber) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (weekNumber < 1 || weekNumber > 12) throw new ValidationError('Week must be between 1 and 12');
    return scheduleSlotRepository.findAllByCourseWeek(courseId, weekNumber);
  },

  async getAll(courseId) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return scheduleSlotRepository.findAllByCourse(courseId);
  },

  async saveWeek(courseId, weekNumber, cells) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (weekNumber < 1 || weekNumber > 12) throw new ValidationError('Week must be between 1 and 12');
    return scheduleSlotRepository.upsertBulk(courseId, weekNumber, cells);
  },

  async exportRows(courseId) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    const slots = await scheduleSlotRepository.findAllByCourse(courseId);
    return { course, rows: slots.map((s) => ({ ...s, day_label: `Day ${s.day_number}` })) };
  },

  async exportExcel(courseId) {
    const { course, rows } = await this.exportRows(courseId);
    return buildExcelBuffer({ sheetName: `Schedule - ${course.code}`.slice(0, 31), columns: SCHEDULE_EXPORT_COLUMNS, rows });
  },

  async exportPdf(courseId, res) {
    const { course, rows } = await this.exportRows(courseId);
    const signatoryLine = await getSignatoryLine(courseId);
    streamTablePdfToResponse(res, `Course Schedule - ${course.name}`, SCHEDULE_EXPORT_COLUMNS, rows, {
      filterSummaryLines: [`Course: ${course.name} (${course.code})`, `Venue: ${course.venue || '—'}`, signatoryLine],
    });
  },
};

export default scheduleSlotService;
