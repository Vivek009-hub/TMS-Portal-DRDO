import bcrypt from 'bcryptjs';
import XLSX from 'xlsx';
import fs from 'fs';
import participantRepository from '../repositories/participantRepository.js';
import userRepository from '../repositories/userRepository.js';
import courseRepository from '../repositories/courseRepository.js';
import lookupRepository from '../repositories/lookupRepository.js';
import { streamTablePdfToResponse } from './pdfService.js';
import { buildExcelBuffer, formatExportDate, buildFilterSummary } from './exportService.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { parsePagination, buildPaginatedResponse } from '../utils/helpers.js';
import { sendWelcomeEmail } from './emailService.js';

const PARTICIPANT_EXPORT_COLUMNS = [
  { key: 'id', label: 'Participant ID' },
  { key: 'service_number', label: 'Service Number' },
  { key: 'name', label: 'Name' },
  { key: 'rank_name', label: 'Rank' },
  { key: 'department_name', label: 'Department' },
  { key: 'unit_address', label: 'Unit' },
  { key: 'course_name', label: 'Course' },
  { key: 'financial_year', label: 'Training Year' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'mobile_number', label: 'Mobile Number' },
  { key: 'date_of_reporting', label: 'Reporting Date' },
  { key: 'movement_order_number', label: 'Movement Order Number' },
  { key: 'status', label: 'Status' },
];

function toExportRow(p) {
  return {
    ...p,
    name: `${p.first_name} ${p.last_name}`,
    date_of_birth: formatExportDate(p.date_of_birth),
    date_of_reporting: formatExportDate(p.date_of_reporting),
    status: p.is_active ? 'Active' : 'Inactive',
  };
}

async function resolveLookupIdByName(type, name) {
  if (!name) return null;
  const rows = await lookupRepository.findAll(type);
  const match = rows.find((r) => r.name.toLowerCase() === String(name).trim().toLowerCase());
  return match ? match.id : null;
}

const participantService = {
  async list(query) {
    const { page, limit, offset } = parsePagination(query);
    const { data, total } = await participantRepository.findAll({
      search: query.search,
      department_id: query.department_id,
      rank_id: query.rank_id,
      medical_category_id: query.medical_category_id,
      course_id: query.course_id,
      is_active: query.is_active !== undefined ? query.is_active === 'true' : undefined,
      financial_year: query.financial_year,
      unit: query.unit,
      sort_by: query.sort_by,
      sort_dir: query.sort_dir,
      limit,
      offset,
    });
    return buildPaginatedResponse(data, total, page, limit);
  },

  async getUnits() {
    return participantRepository.getDistinctUnits();
  },

  async getById(id) {
    const participant = await participantRepository.findById(id);
    if (!participant) throw new NotFoundError('Participant not found');
    return participant;
  },

  async create(data, createdBy) {
    const existing = await participantRepository.findByServiceNumber(data.service_number);
    if (existing) {
      throw new ValidationError('Service number already exists');
    }

    if (data.course_id) {
      const course = await courseRepository.findById(data.course_id);
      if (!course) throw new NotFoundError('Course not found');
    }

    let userId = null;
    if (data.create_user_account && data.email) {
      const existingUser = await userRepository.findByEmail(data.email);
      if (existingUser) {
        throw new ValidationError('Email already registered as user');
      }
      const passwordHash = await bcrypt.hash(data.user_password, 12);
      const user = await userRepository.create({
        email: data.email,
        password_hash: passwordHash,
        first_name: data.first_name,
        last_name: data.last_name,
        role: 'user',
        created_by: createdBy.id,
      });
      userId = user.id;
      try {
        await sendWelcomeEmail(user, data.user_password);
      } catch {
        // non-blocking
      }
    }

    const participant = await participantRepository.create({
      ...data,
      user_id: userId,
      created_by: createdBy.id,
    });

    if (data.course_id) {
      await courseRepository.enrollParticipant(data.course_id, participant.id);
    }

    return participant;
  },

  async update(id, data) {
    const participant = await participantRepository.findById(id);
    if (!participant) throw new NotFoundError('Participant not found');

    if (data.course_id && data.course_id !== participant.course_id) {
      const course = await courseRepository.findById(data.course_id);
      if (!course) throw new NotFoundError('Course not found');
      await courseRepository.enrollParticipant(data.course_id, id);
    }

    return participantRepository.update(id, data);
  },

  async delete(id) {
    const participant = await participantRepository.findById(id);
    if (!participant) throw new NotFoundError('Participant not found');
    await participantRepository.delete(id);
    return { message: 'Participant deleted successfully' };
  },

  async importFromExcel(filePath, createdBy) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const participants = [];
    for (const row of rows) {
      const service_number = String(row.service_number || row['Service Number'] || '').trim();
      const first_name = row.first_name || row['First Name'] || '';
      const last_name = row.last_name || row['Last Name'] || '';
      if (!service_number || !first_name) continue;

      const rankName = row.rank || row.Rank || row.military_rank || row['Military Rank'] || null;
      const departmentName = row.department || row.Department || null;

      participants.push({
        service_number,
        first_name,
        last_name,
        rank_id: await resolveLookupIdByName('ranks', rankName),
        department_id: await resolveLookupIdByName('departments', departmentName),
        mobile_number: row.mobile_number || row['Mobile Number'] || row.phone || row.Phone || null,
        email: row.email || row.Email || null,
        date_of_birth: row.date_of_birth || row['Date of Birth'] || null,
        educational_qualification: row.educational_qualification || row['Educational Qualification'] || null,
      });
    }

    if (participants.length === 0) {
      throw new ValidationError('No valid participant records found in Excel file');
    }

    const results = await participantRepository.bulkCreate(participants, createdBy.id);
    fs.unlinkSync(filePath);
    return results;
  },

  async exportToExcel(query = {}) {
    const rows = await participantRepository.findAllForExport({
      search: query.search, department_id: query.department_id, rank_id: query.rank_id,
      medical_category_id: query.medical_category_id, course_id: query.course_id,
      is_active: query.is_active !== undefined ? query.is_active === 'true' : undefined,
      financial_year: query.financial_year, unit: query.unit,
    });
    return buildExcelBuffer({ sheetName: 'Participants', columns: PARTICIPANT_EXPORT_COLUMNS, rows: rows.map(toExportRow) });
  },

  async exportPdf(query, res) {
    const rows = await participantRepository.findAllForExport({
      search: query.search, department_id: query.department_id, rank_id: query.rank_id,
      medical_category_id: query.medical_category_id, course_id: query.course_id,
      is_active: query.is_active !== undefined ? query.is_active === 'true' : undefined,
      financial_year: query.financial_year, unit: query.unit,
    });
    const filterSummaryLines = buildFilterSummary({
      'Training Year': query.financial_year, Department: rows[0]?.department_name && query.department_id ? rows[0].department_name : undefined,
      Search: query.search, Unit: query.unit,
    });
    streamTablePdfToResponse(res, 'Participant Report', PARTICIPANT_EXPORT_COLUMNS, rows.map(toExportRow), { filterSummaryLines });
  },
};

export default participantService;
