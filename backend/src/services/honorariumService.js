import honorariumRepository from '../repositories/honorariumRepository.js';
import courseRepository from '../repositories/courseRepository.js';
import facultyRepository from '../repositories/facultyRepository.js';
import { NotFoundError } from '../utils/errors.js';

const honorariumService = {
  async listForCourse(courseId) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return honorariumRepository.findAllByCourse(courseId);
  },

  async create(courseId, data) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    const faculty = await facultyRepository.findById(data.faculty_id);
    if (!faculty) throw new NotFoundError('Faculty not found');
    return honorariumRepository.create(courseId, data);
  },

  async update(id, data) {
    const entry = await honorariumRepository.findById(id);
    if (!entry) throw new NotFoundError('Honorarium entry not found');
    return honorariumRepository.update(id, data);
  },

  async delete(id) {
    const entry = await honorariumRepository.findById(id);
    if (!entry) throw new NotFoundError('Honorarium entry not found');
    await honorariumRepository.delete(id);
    return { message: 'Honorarium entry deleted' };
  },
};

export default honorariumService;
