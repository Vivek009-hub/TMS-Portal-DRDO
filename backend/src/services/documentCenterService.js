import fs from 'fs';
import documentRepository from '../repositories/documentRepository.js';
import participantRepository from '../repositories/participantRepository.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { parsePagination, buildPaginatedResponse } from '../utils/helpers.js';

const documentCenterService = {
  async list(query, user) {
    const { page, limit, offset } = parsePagination(query);
    const filters = {
      search: query.search,
      category: query.category,
      course_id: query.course_id,
      limit,
      offset,
    };

    if (user.role === 'user') {
      filters.is_public = true;
      const participant = await participantRepository.findByUserId(user.id);
      if (participant?.course_id) {
        filters.course_id = participant.course_id;
      }
    }

    const { data, total } = await documentRepository.findAll(filters);
    return buildPaginatedResponse(data, total, page, limit);
  },

  async getById(id) {
    const doc = await documentRepository.findById(id);
    if (!doc) throw new NotFoundError('Document not found');
    return doc;
  },

  async upload(file, data, user) {
    return documentRepository.create({
      title: data.title,
      description: data.description,
      category: data.category || 'other',
      file_name: file.originalname,
      file_path: file.path,
      file_size: file.size,
      mime_type: file.mimetype,
      course_id: data.course_id || null,
      is_public: data.is_public === 'true' || data.is_public === true,
      uploaded_by: user.id,
    });
  },

  async delete(id) {
    const doc = await documentRepository.delete(id);
    if (!doc) throw new NotFoundError('Document not found');
    if (fs.existsSync(doc.file_path)) {
      fs.unlinkSync(doc.file_path);
    }
    return { message: 'Document deleted' };
  },
};

export default documentCenterService;
