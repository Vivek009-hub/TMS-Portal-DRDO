import courseKitReceiptRepository from '../repositories/courseKitReceiptRepository.js';
import courseRepository from '../repositories/courseRepository.js';
import participantRepository from '../repositories/participantRepository.js';
import { NotFoundError } from '../utils/errors.js';

const courseKitReceiptService = {
  async listForCourse(courseId) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return courseKitReceiptRepository.findAllByCourse(courseId);
  },

  async save(courseId, participantId, data) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    const participant = await participantRepository.findById(participantId);
    if (!participant) throw new NotFoundError('Participant not found');
    return courseKitReceiptRepository.upsertForParticipant(courseId, participantId, data);
  },
};

export default courseKitReceiptService;
