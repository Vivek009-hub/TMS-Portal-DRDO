import reportingSheetRepository from '../repositories/reportingSheetRepository.js';
import courseRepository from '../repositories/courseRepository.js';
import participantRepository from '../repositories/participantRepository.js';
import { NotFoundError } from '../utils/errors.js';

const reportingSheetService = {
  async listForCourse(courseId) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return reportingSheetRepository.findAllByCourse(courseId);
  },

  async recordReporting(courseId, participantId, data) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    const participant = await participantRepository.findById(participantId);
    if (!participant) throw new NotFoundError('Participant not found');

    return reportingSheetRepository.upsertForParticipant(courseId, participantId, data);
  },

  async delete(id) {
    await reportingSheetRepository.delete(id);
    return { message: 'Reporting entry deleted' };
  },
};

export default reportingSheetService;
