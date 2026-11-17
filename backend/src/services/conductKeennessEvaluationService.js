import conductKeennessEvaluationRepository from '../repositories/conductKeennessEvaluationRepository.js';
import courseRepository from '../repositories/courseRepository.js';
import participantRepository from '../repositories/participantRepository.js';
import { NotFoundError } from '../utils/errors.js';

const conductKeennessEvaluationService = {
  async listForCourse(courseId) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return conductKeennessEvaluationRepository.findAllByCourse(courseId);
  },

  async save(courseId, participantId, data) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    const participant = await participantRepository.findById(participantId);
    if (!participant) throw new NotFoundError('Participant not found');
    return conductKeennessEvaluationRepository.upsertForParticipant(courseId, participantId, data);
  },
};

export default conductKeennessEvaluationService;
