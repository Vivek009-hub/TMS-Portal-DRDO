import lookupRepository from '../repositories/lookupRepository.js';
import { ValidationError } from '../utils/errors.js';

const WRITABLE_TYPES = ['ranks', 'departments', 'designations', 'institutes', 'medical-categories'];

// Only 'institutes' has editable fields beyond `name` today (Letter Head / Circular
// contact info: phone, fax, email, address).
const UPDATABLE_FIELDS = {
  institutes: ['name', 'phone', 'fax', 'email', 'address'],
};

const lookupService = {
  async list(type) {
    if (!lookupRepository.isValidType(type)) throw new ValidationError('Unknown lookup type');
    return lookupRepository.findAll(type);
  },

  async create(type, name) {
    if (!WRITABLE_TYPES.includes(type)) throw new ValidationError('This lookup type cannot be created via this endpoint');
    return lookupRepository.create(type, name);
  },

  async update(type, id, data) {
    const allowedFields = UPDATABLE_FIELDS[type];
    if (!allowedFields) throw new ValidationError('This lookup type cannot be edited via this endpoint');
    return lookupRepository.update(type, id, data, allowedFields);
  },

  async remove(type, id) {
    if (!WRITABLE_TYPES.includes(type)) throw new ValidationError('This lookup type cannot be deleted via this endpoint');
    return lookupRepository.delete(type, id);
  },
};

export default lookupService;
