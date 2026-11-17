import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';
import templateRepository from '../repositories/templateRepository.js';
import circularRepository from '../repositories/circularRepository.js';
import scheduleRepository from '../repositories/scheduleRepository.js';
import calendarRepository from '../repositories/calendarRepository.js';
import courseRepository from '../repositories/courseRepository.js';
import { generateDocumentPdf, streamPdfToResponse, streamTablePdfToResponse } from './pdfService.js';
import { buildExcelBuffer, formatExportDate } from './exportService.js';
import { replaceTemplatePlaceholders } from '../utils/helpers.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { parsePagination, buildPaginatedResponse } from '../utils/helpers.js';
import { uploadDirs } from '../middleware/upload.js';

const CALENDAR_EXPORT_COLUMNS = [
  { key: 'course_name', label: 'Course' },
  { key: 'course_code', label: 'Course Code' },
  { key: 'year', label: 'Year' },
  { key: 'title', label: 'Title' },
  { key: 'updated_at', label: 'Last Updated' },
];

export const templateService = {
  async list(query) {
    return templateRepository.findAll({ type: query.type });
  },
  async getById(id) {
    const template = await templateRepository.findById(id);
    if (!template) throw new NotFoundError('Template not found');
    return template;
  },
  async create(data, user) {
    return templateRepository.create({ ...data, updated_by: user.id });
  },
  async update(id, data, user) {
    await this.getById(id);
    return templateRepository.update(id, { ...data, updated_by: user.id });
  },
  async delete(id) {
    const template = await this.getById(id);
    await templateRepository.delete(id);
    if (template.docx_path && fs.existsSync(template.docx_path)) {
      fs.unlink(template.docx_path, () => {});
    }
    return { message: 'Template deleted' };
  },
  async importDocx(file, data, user) {
    if (!data.type) throw new ValidationError('Template type is required');
    if (!data.name) throw new ValidationError('Template name is required');

    // For certificates, the uploaded .docx is kept permanently as the MASTER TEMPLATE —
    // generation fills placeholders directly inside this file (preserving fonts, tables,
    // images, headers/footers, layout, etc). The mammoth HTML below is only a quick
    // read-only preview of the content; it is never used to (re)build the certificate.
    const isCertificate = data.type === 'certificate';
    let html;
    try {
      const result = await mammoth.convertToHtml({ path: file.path });
      html = result.value;
    } catch (error) {
      fs.unlinkSync(file.path);
      throw new ValidationError(`Could not read the uploaded Word document: ${error.message}`);
    }

    if (!html || !html.trim()) {
      fs.unlinkSync(file.path);
      throw new ValidationError('The uploaded document appears to be empty');
    }

    let docxPath = null;
    let docxOriginalName = null;
    if (isCertificate) {
      const storedName = `${uuidv4()}.docx`;
      docxPath = path.join(uploadDirs.templates, storedName);
      fs.copyFileSync(file.path, docxPath);
      docxOriginalName = file.originalname;
    }
    fs.unlinkSync(file.path);

    return templateRepository.create({
      type: data.type,
      name: data.name,
      content: html,
      certificate_type: data.certificate_type || null,
      is_default: false,
      source_format: isCertificate ? 'docx' : 'html',
      docx_path: docxPath,
      docx_original_name: docxOriginalName,
      updated_by: user.id,
    });
  },
  async replaceDocx(id, file, user) {
    const template = await this.getById(id);
    if (template.type !== 'certificate') {
      fs.unlinkSync(file.path);
      throw new ValidationError('Only certificate templates support a master Word file');
    }

    let html;
    try {
      const result = await mammoth.convertToHtml({ path: file.path });
      html = result.value;
    } catch (error) {
      fs.unlinkSync(file.path);
      throw new ValidationError(`Could not read the uploaded Word document: ${error.message}`);
    }

    const storedName = `${uuidv4()}.docx`;
    const docxPath = path.join(uploadDirs.templates, storedName);
    fs.copyFileSync(file.path, docxPath);
    fs.unlinkSync(file.path);

    const previousPath = template.docx_path;
    const updated = await templateRepository.update(id, {
      content: html || template.content,
      source_format: 'docx',
      docx_path: docxPath,
      docx_original_name: file.originalname,
      updated_by: user.id,
    });

    if (previousPath && fs.existsSync(previousPath)) {
      fs.unlink(previousPath, () => {});
    }
    return updated;
  },
};

export const circularService = {
  async list(query) {
    const { page, limit, offset } = parsePagination(query);
    const { data, total } = await circularRepository.findAll({
      search: query.search,
      status: query.status,
      course_id: query.course_id,
      limit,
      offset,
    });
    return buildPaginatedResponse(data, total, page, limit);
  },
  async getById(id) {
    const circular = await circularRepository.findById(id);
    if (!circular) throw new NotFoundError('Circular not found');
    return circular;
  },
  async create(data, user) {
    return circularRepository.create({ ...data, created_by: user.id });
  },
  async update(id, data) {
    await this.getById(id);
    return circularRepository.update(id, data);
  },
  async delete(id) {
    await this.getById(id);
    await circularRepository.delete(id);
    return { message: 'Circular deleted' };
  },
  async importDocx(file, data, user) {
    if (!data.title) throw new ValidationError('Title is required');

    if (data.course_id) {
      const course = await courseRepository.findById(data.course_id);
      if (!course) throw new NotFoundError('Course not found');
    }

    let html;
    try {
      const result = await mammoth.convertToHtml({ path: file.path });
      html = result.value;
    } finally {
      fs.unlinkSync(file.path);
    }

    if (!html || !html.trim()) {
      throw new ValidationError('The uploaded document appears to be empty');
    }

    return circularRepository.create({
      title: data.title,
      reference_number: data.reference_number || null,
      course_id: data.course_id || null,
      content: html,
      status: 'draft',
      created_by: user.id,
    });
  },
  async generatePdf(id, res) {
    const circular = await this.getById(id);
    const course = circular.course_id ? await courseRepository.findById(circular.course_id) : null;
    const data = {
      title: circular.title,
      reference_number: circular.reference_number || `CIR/${id}`,
      date: new Date().toLocaleDateString('en-IN'),
      content: circular.content,
      course_name: course?.name || '',
    };
    const content = replaceTemplatePlaceholders(circular.content, data);
    await streamPdfToResponse(res, content, circular.title);
  },
};

export const scheduleService = {
  async list(query) {
    const { page, limit, offset } = parsePagination(query);
    const { data, total } = await scheduleRepository.findAll({
      course_id: query.course_id,
      limit,
      offset,
    });
    return buildPaginatedResponse(data, total, page, limit);
  },
  async getById(id) {
    const schedule = await scheduleRepository.findById(id);
    if (!schedule) throw new NotFoundError('Schedule not found');
    return schedule;
  },
  async create(data, user) {
    const course = await courseRepository.findById(data.course_id);
    if (!course) throw new NotFoundError('Course not found');
    return scheduleRepository.create({ ...data, created_by: user.id });
  },
  async update(id, data) {
    await this.getById(id);
    return scheduleRepository.update(id, data);
  },
  async delete(id) {
    await this.getById(id);
    await scheduleRepository.delete(id);
    return { message: 'Schedule deleted' };
  },
  async importDocx(file, data, user) {
    if (!data.course_id) throw new ValidationError('Course is required');
    if (!data.title) throw new ValidationError('Title is required');

    const course = await courseRepository.findById(data.course_id);
    if (!course) throw new NotFoundError('Course not found');

    let html;
    try {
      const result = await mammoth.convertToHtml({ path: file.path });
      html = result.value;
    } finally {
      fs.unlinkSync(file.path);
    }

    if (!html || !html.trim()) {
      throw new ValidationError('The uploaded document appears to be empty');
    }

    return scheduleRepository.create({
      course_id: data.course_id,
      title: data.title,
      content: html,
      created_by: user.id,
    });
  },
  async generatePdf(id, res) {
    const schedule = await this.getById(id);
    const course = await courseRepository.findById(schedule.course_id);
    const data = {
      course_name: course.name,
      course_code: course.code,
      instructor: course.instructor || '',
      location: course.location || '',
      start_date: course.start_date || '',
      end_date: course.end_date || '',
    };
    const content = replaceTemplatePlaceholders(schedule.content, data);
    await streamPdfToResponse(res, content, schedule.title);
  },
};

export const calendarService = {
  async list(query) {
    const { page, limit, offset } = parsePagination(query);
    const { data, total } = await calendarRepository.findAll({
      course_id: query.course_id,
      year: query.year,
      limit,
      offset,
    });
    return buildPaginatedResponse(data, total, page, limit);
  },
  async getById(id) {
    const calendar = await calendarRepository.findById(id);
    if (!calendar) throw new NotFoundError('Calendar not found');
    return calendar;
  },
  async create(data, user) {
    const course = await courseRepository.findById(data.course_id);
    if (!course) throw new NotFoundError('Course not found');
    return calendarRepository.create({ ...data, created_by: user.id });
  },
  async update(id, data) {
    await this.getById(id);
    return calendarRepository.update(id, data);
  },
  async delete(id) {
    await this.getById(id);
    await calendarRepository.delete(id);
    return { message: 'Calendar deleted' };
  },
  async importDocx(file, data, user) {
    if (!data.course_id) throw new ValidationError('Course is required');
    if (!data.title) throw new ValidationError('Title is required');

    const course = await courseRepository.findById(data.course_id);
    if (!course) throw new NotFoundError('Course not found');

    let html;
    try {
      const result = await mammoth.convertToHtml({ path: file.path });
      html = result.value;
    } finally {
      fs.unlinkSync(file.path);
    }

    if (!html || !html.trim()) {
      throw new ValidationError('The uploaded document appears to be empty');
    }

    return calendarRepository.create({
      course_id: data.course_id,
      title: data.title,
      year: data.year || new Date().getFullYear(),
      content: html,
      created_by: user.id,
    });
  },
  async generatePdf(id, res) {
    const calendar = await this.getById(id);
    const course = await courseRepository.findById(calendar.course_id);
    const data = {
      course_name: course.name,
      course_code: course.code,
      start_date: course.start_date || '',
      end_date: course.end_date || '',
      instructor: course.instructor || '',
      location: course.location || '',
      year: calendar.year || new Date().getFullYear(),
    };
    const content = replaceTemplatePlaceholders(calendar.content, data);
    await streamPdfToResponse(res, content, calendar.title);
  },
  async exportList(query) {
    const rows = await calendarRepository.findAllForExport({ course_id: query.course_id, year: query.year });
    return rows.map((r) => ({ ...r, updated_at: formatExportDate(r.updated_at) }));
  },
  async exportExcel(query) {
    const rows = await this.exportList(query);
    return buildExcelBuffer({ sheetName: 'Calendars', columns: CALENDAR_EXPORT_COLUMNS, rows });
  },
  async exportPdf(query, res) {
    const rows = await this.exportList(query);
    streamTablePdfToResponse(res, 'Training Calendars', CALENDAR_EXPORT_COLUMNS, rows);
  },
};
