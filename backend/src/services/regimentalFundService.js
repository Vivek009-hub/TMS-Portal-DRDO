import regimentalFundRepository from '../repositories/regimentalFundRepository.js';
import courseRepository from '../repositories/courseRepository.js';
import { NotFoundError } from '../utils/errors.js';

const regimentalFundService = {
  async listForCourse(courseId) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return regimentalFundRepository.findAllByCourse(courseId);
  },

  async create(courseId, data) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return regimentalFundRepository.create(courseId, data);
  },

  async update(id, data) {
    const entry = await regimentalFundRepository.findById(id);
    if (!entry) throw new NotFoundError('Regimental fund entry not found');
    return regimentalFundRepository.update(id, data);
  },

  async delete(id) {
    const entry = await regimentalFundRepository.findById(id);
    if (!entry) throw new NotFoundError('Regimental fund entry not found');
    await regimentalFundRepository.delete(id);
    return { message: 'Regimental fund entry deleted' };
  },
};

export default regimentalFundService;
