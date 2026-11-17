import facultyRepository from '../repositories/facultyRepository.js';
import courseRepository from '../repositories/courseRepository.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { parsePagination, buildPaginatedResponse } from '../utils/helpers.js';

const facultyService = {
  async list(query) {
    const { page, limit, offset } = parsePagination(query);
    const { data, total } = await facultyRepository.findAll({
      search: query.search,
      rank_id: query.rank_id,
      institute_id: query.institute_id,
      status: query.status,
      limit,
      offset,
    });
    return buildPaginatedResponse(data, total, page, limit);
  },

  async getById(id) {
    const faculty = await facultyRepository.findById(id);
    if (!faculty) throw new NotFoundError('Faculty not found');
    return faculty;
  },

  async create(data, createdBy) {
    if (data.email) {
      const existing = await facultyRepository.findByEmail(data.email);
      if (existing) throw new ValidationError('A faculty record with this email already exists');
    }
    return facultyRepository.create({ ...data, created_by: createdBy.id });
  },

  async update(id, data) {
    const faculty = await facultyRepository.findById(id);
    if (!faculty) throw new NotFoundError('Faculty not found');
    return facultyRepository.update(id, data);
  },

  async delete(id) {
    const faculty = await facultyRepository.findById(id);
    if (!faculty) throw new NotFoundError('Faculty not found');
    await facultyRepository.delete(id);
    return { message: 'Faculty deleted successfully' };
  },

  async assignToCourse(courseId, facultyId, role) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    const faculty = await facultyRepository.findById(facultyId);
    if (!faculty) throw new NotFoundError('Faculty not found');
    const assigned = await facultyRepository.assignToCourse(courseId, facultyId, role);
    return { assigned };
  },

  async unassignFromCourse(courseId, facultyId) {
    await facultyRepository.unassignFromCourse(courseId, facultyId);
    return { message: 'Faculty unassigned from course' };
  },

  async updateCourseAssignment(courseId, facultyId, data) {
    const updated = await facultyRepository.updateCourseAssignment(courseId, facultyId, data);
    if (!updated) throw new NotFoundError('Course faculty assignment not found');
    return { message: 'Assignment updated' };
  },

  async getCourseAssignments(courseId) {
    return facultyRepository.getCourseAssignments(courseId);
  },
};

export default facultyService;
