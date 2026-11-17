import practicalBreakupRepository from '../repositories/practicalBreakupRepository.js';
import courseRepository from '../repositories/courseRepository.js';
import participantRepository from '../repositories/participantRepository.js';
import { NotFoundError } from '../utils/errors.js';

const practicalBreakupService = {
  async listForCourse(courseId, examType) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return practicalBreakupRepository.findAllByCourse(courseId, examType);
  },

  async save(courseId, participantId, examType, data) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    const participant = await participantRepository.findById(participantId);
    if (!participant) throw new NotFoundError('Participant not found');
    return practicalBreakupRepository.upsertForParticipant(courseId, participantId, examType, data);
  },
};

export default practicalBreakupService;
