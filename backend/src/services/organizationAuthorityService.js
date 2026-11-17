import organizationAuthorityRepository from '../repositories/organizationAuthorityRepository.js';
import { NotFoundError } from '../utils/errors.js';

const organizationAuthorityService = {
  async list(query) {
    return organizationAuthorityRepository.findAll({
      authority_type: query.authority_type,
      course_id: query.course_id,
    });
  },

  async getById(id) {
    const authority = await organizationAuthorityRepository.findById(id);
    if (!authority) throw new NotFoundError('Organization authority record not found');
    return authority;
  },

  async create(data, createdBy) {
    return organizationAuthorityRepository.create({ ...data, created_by: createdBy.id });
  },

  async update(id, data) {
    const authority = await organizationAuthorityRepository.findById(id);
    if (!authority) throw new NotFoundError('Organization authority record not found');
    return organizationAuthorityRepository.update(id, data);
  },

  async delete(id) {
    const authority = await organizationAuthorityRepository.findById(id);
    if (!authority) throw new NotFoundError('Organization authority record not found');
    await organizationAuthorityRepository.delete(id);
    return { message: 'Record deleted successfully' };
  },
};

export default organizationAuthorityService;
