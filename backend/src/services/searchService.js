import searchRepository from '../repositories/searchRepository.js';
import { ValidationError } from '../utils/errors.js';

const searchService = {
  async search(term) {
    if (!term || term.trim().length < 2) {
      throw new ValidationError('Search term must be at least 2 characters');
    }
    return searchRepository.search(term.trim());
  },
};

export default searchService;
