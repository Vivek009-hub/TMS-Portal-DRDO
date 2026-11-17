import theoryLectureRepository from '../repositories/theoryLectureRepository.js';
import courseRepository from '../repositories/courseRepository.js';
import { NotFoundError } from '../utils/errors.js';

const theoryLectureService = {
  async listForCourse(courseId) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return theoryLectureRepository.findAllByCourse(courseId);
  },

  async create(courseId, data) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return theoryLectureRepository.create({ ...data, course_id: courseId });
  },

  async update(id, data) {
    const topic = await theoryLectureRepository.findById(id);
    if (!topic) throw new NotFoundError('Lecture topic not found');
    return theoryLectureRepository.update(id, data);
  },

  async delete(id) {
    const topic = await theoryLectureRepository.findById(id);
    if (!topic) throw new NotFoundError('Lecture topic not found');
    await theoryLectureRepository.delete(id);
    return { message: 'Lecture topic deleted' };
  },
};

export default theoryLectureService;
