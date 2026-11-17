import mementoesUtilisationRepository from '../repositories/mementoesUtilisationRepository.js';
import courseRepository from '../repositories/courseRepository.js';
import participantRepository from '../repositories/participantRepository.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const PARTICIPANT_FIELDS = [
  'first_in_merit_participant_id', 'second_in_merit_participant_id',
  'third_in_merit_participant_id', 'course_senior_participant_id',
];

const mementoesUtilisationService = {
  async getForCourse(courseId) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return mementoesUtilisationRepository.findByCourse(courseId);
  },

  async save(courseId, data) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');

    for (const field of PARTICIPANT_FIELDS) {
      if (!data[field]) continue;
      const participant = await participantRepository.findById(data[field]);
      if (!participant) throw new ValidationError(`Invalid participant for ${field}`);
    }
    return mementoesUtilisationRepository.upsertForCourse(courseId, data);
  },
};

export default mementoesUtilisationService;
