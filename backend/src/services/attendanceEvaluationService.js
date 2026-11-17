import attendanceEvaluationRepository from '../repositories/attendanceEvaluationRepository.js';
import courseRepository from '../repositories/courseRepository.js';
import participantRepository from '../repositories/participantRepository.js';
import { NotFoundError } from '../utils/errors.js';

const attendanceEvaluationService = {
  async listForCourse(courseId) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return attendanceEvaluationRepository.findAllByCourse(courseId);
  },

  async save(courseId, participantId, data) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    const participant = await participantRepository.findById(participantId);
    if (!participant) throw new NotFoundError('Participant not found');
    return attendanceEvaluationRepository.upsertForParticipant(courseId, participantId, data);
  },
};

export default attendanceEvaluationService;
