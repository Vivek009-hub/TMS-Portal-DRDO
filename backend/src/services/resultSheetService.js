import resultSheetRepository from '../repositories/resultSheetRepository.js';
import courseRepository from '../repositories/courseRepository.js';
import { NotFoundError } from '../utils/errors.js';

const resultSheetService = {
  async getForCourse(courseId) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    const rows = await resultSheetRepository.findAllByCourse(courseId);
    return { course, rows };
  },
};

export default resultSheetService;
