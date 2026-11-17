import leaveRepository from '../repositories/leaveRepository.js';
import participantRepository from '../repositories/participantRepository.js';
import notificationRepository from '../repositories/notificationRepository.js';
import userRepository from '../repositories/userRepository.js';
import { sendLeaveStatusEmail } from './emailService.js';
import { streamTablePdfToResponse } from './pdfService.js';
import { buildExcelBuffer, formatExportDate, buildFilterSummary } from './exportService.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { parsePagination, buildPaginatedResponse } from '../utils/helpers.js';

const LEAVE_EXPORT_COLUMNS = [
  { key: 'participant_id', label: 'Participant ID' },
  { key: 'participant_name', label: 'Participant Name' },
  { key: 'course_name', label: 'Course' },
  { key: 'leave_type', label: 'Leave Type' },
  { key: 'start_date', label: 'From Date' },
  { key: 'end_date', label: 'To Date' },
  { key: 'no_of_days', label: 'Number of Days' },
  { key: 'status', label: 'Status' },
  { key: 'admin_remarks', label: 'Remarks' },
];

const leaveService = {
  async list(query, user) {
    const { page, limit, offset } = parsePagination(query);
    const filters = {
      status: query.status,
      course_id: query.course_id,
      leave_type: query.leave_type,
      limit,
      offset,
    };

    if (user.role === 'user') {
      const participant = await participantRepository.findByUserId(user.id);
      if (!participant) throw new ForbiddenError('No participant profile linked');
      filters.participant_id = participant.id;
    } else if (query.participant_id) {
      filters.participant_id = query.participant_id;
    }

    const { data, total } = await leaveRepository.findAll(filters);
    return buildPaginatedResponse(data, total, page, limit);
  },

  async getById(id, user) {
    const leave = await leaveRepository.findById(id);
    if (!leave) throw new NotFoundError('Leave request not found');

    if (user.role === 'user') {
      const participant = await participantRepository.findByUserId(user.id);
      if (!participant || leave.participant_id !== participant.id) {
        throw new ForbiddenError('Access denied');
      }
    }

    return leave;
  },

  async create(data, user) {
    const participant = await participantRepository.findByUserId(user.id);
    if (!participant) throw new ForbiddenError('No participant profile linked');

    return leaveRepository.create({
      ...data,
      participant_id: participant.id,
    });
  },

  async updateStatus(id, data, admin) {
    const leave = await leaveRepository.findById(id);
    if (!leave) throw new NotFoundError('Leave request not found');

    const updated = await leaveRepository.updateStatus(
      id,
      data.status,
      admin.id,
      data.admin_remarks
    );

    const participant = await participantRepository.findById(leave.participant_id);
    if (participant?.user_id) {
      await notificationRepository.create({
        user_id: participant.user_id,
        title: `Leave ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}`,
        message: `Your leave request (${leave.start_date} to ${leave.end_date}) has been ${data.status}.`,
        type: data.status === 'approved' ? 'success' : 'warning',
        link: '/my-leaves',
      });

      const leaveUser = await userRepository.findById(participant.user_id);
      if (leaveUser?.email) {
        try {
          await sendLeaveStatusEmail(leaveUser, updated, data.status);
        } catch {
          // non-blocking
        }
      }
    }

    return updated;
  },

  async exportList(query) {
    const rows = await leaveRepository.findAllForExport({
      status: query.status, course_id: query.course_id, leave_type: query.leave_type, participant_id: query.participant_id,
    });
    return rows.map((r) => ({
      ...r,
      participant_name: `${r.first_name} ${r.last_name}`,
      start_date: formatExportDate(r.start_date),
      end_date: formatExportDate(r.end_date),
      status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
    }));
  },

  async exportExcel(query) {
    const rows = await this.exportList(query);
    return buildExcelBuffer({ sheetName: 'Leave Report', columns: LEAVE_EXPORT_COLUMNS, rows });
  },

  async exportPdf(query, res) {
    const rows = await this.exportList(query);
    const filterSummaryLines = buildFilterSummary({ Status: query.status, 'Leave Type': query.leave_type });
    streamTablePdfToResponse(res, 'Leave Report', LEAVE_EXPORT_COLUMNS, rows, { filterSummaryLines });
  },
};

export default leaveService;
