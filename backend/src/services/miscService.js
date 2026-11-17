import bcrypt from 'bcryptjs';
import notificationRepository from '../repositories/notificationRepository.js';
import settingsRepository from '../repositories/settingsRepository.js';
import userRepository from '../repositories/userRepository.js';
import attendanceRepository from '../repositories/attendanceRepository.js';
import participantRepository from '../repositories/participantRepository.js';
import { sendPasswordResetEmail } from './emailService.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { parsePagination, buildPaginatedResponse, sanitizeUser } from '../utils/helpers.js';
import { ROLES } from '../utils/constants.js';

export const notificationService = {
  async list(user, query) {
    const { page, limit, offset } = parsePagination(query);
    const { data, total } = await notificationRepository.findByUser(user.id, {
      is_read: query.is_read !== undefined ? query.is_read === 'true' : undefined,
      limit,
      offset,
    });
    return buildPaginatedResponse(data, total, page, limit);
  },

  async markAsRead(id, user) {
    return notificationRepository.markAsRead(id, user.id);
  },

  async markAllAsRead(user) {
    await notificationRepository.markAllAsRead(user.id);
    return { message: 'All notifications marked as read' };
  },

  async getUnreadCount(user) {
    const count = await notificationRepository.getUnreadCount(user.id);
    return { count };
  },

  async create(data) {
    return notificationRepository.create(data);
  },
};

export const settingsService = {
  async getAll() {
    return settingsRepository.findAll();
  },

  async update(settings, user) {
    return settingsRepository.bulkUpdate(settings, user.id);
  },
};

export const userService = {
  async list(query) {
    const { page, limit, offset } = parsePagination(query);
    const { data, total } = await userRepository.findAll({
      search: query.search,
      role: query.role,
      is_active: query.is_active !== undefined ? query.is_active === 'true' : undefined,
      limit,
      offset,
    });
    return buildPaginatedResponse(data.map(sanitizeUser), total, page, limit);
  },

  async update(id, data, currentUser) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');

    if (user.role === ROLES.SUPER_ADMIN && currentUser.role !== ROLES.SUPER_ADMIN) {
      throw new ForbiddenError('Cannot modify super admin account');
    }

    if (data.role === ROLES.SUPER_ADMIN) {
      throw new ForbiddenError('Cannot assign super admin role');
    }

    return sanitizeUser(await userRepository.update(id, data));
  },

  async delete(id, currentUser) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    if (user.role === ROLES.SUPER_ADMIN) {
      throw new ForbiddenError('Cannot delete super admin');
    }
    // req.params.id is always a string; currentUser.id is a number from the DB row —
    // compare as strings so this guard actually triggers (a strict === here would
    // silently never match and let a super_admin delete their own account).
    if (String(id) === String(currentUser.id)) {
      throw new ForbiddenError('Cannot delete your own account');
    }
    await userRepository.delete(id);
    return { message: 'User deleted' };
  },

  async setPassword(id, newPassword, actingSuperAdmin) {
    if (String(id) === String(actingSuperAdmin.id)) {
      throw new ForbiddenError('Use Change Password to update your own password');
    }
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await userRepository.update(id, { password_hash: passwordHash });

    try {
      await sendPasswordResetEmail(user, newPassword);
    } catch {
      // non-blocking
    }
    try {
      await notificationRepository.create({
        user_id: user.id,
        title: 'Password Reset',
        message: 'An administrator has reset your password. If you did not expect this, contact your administrator immediately.',
        type: 'success',
      });
    } catch {
      // non-blocking
    }

    return { message: 'Password updated successfully' };
  },
};

export const attendanceService = {
  async list(query, user) {
    const { page, limit, offset } = parsePagination(query);
    const filters = {
      course_id: query.course_id,
      date_from: query.date_from,
      date_to: query.date_to,
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

    const { data, total } = await attendanceRepository.findAll(filters);
    return buildPaginatedResponse(data, total, page, limit);
  },

  async bulkMark(courseId, date, records, user) {
    await attendanceRepository.bulkMark(courseId, date, records, user.id);
    return { message: 'Attendance marked successfully' };
  },
};
