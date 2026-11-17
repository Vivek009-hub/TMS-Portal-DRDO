import examResultRepository from '../repositories/examResultRepository.js';
import courseRepository from '../repositories/courseRepository.js';
import participantRepository from '../repositories/participantRepository.js';
import { NotFoundError } from '../utils/errors.js';

const examResultService = {
  async listForCourse(courseId, examCategory, examType) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return examResultRepository.findAllByCourse(courseId, examCategory, examType);
  },

  async save(courseId, participantId, examCategory, examType, data) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    const participant = await participantRepository.findById(participantId);
    if (!participant) throw new NotFoundError('Participant not found');
    return examResultRepository.upsertForParticipant(courseId, participantId, examCategory, examType, data);
  },

  async delete(id) {
    await examResultRepository.delete(id);
    return { message: 'Exam result deleted' };
  },
};

export default examResultService;
