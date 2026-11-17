import bcrypt from 'bcryptjs';
import passwordResetRequestRepository from '../repositories/passwordResetRequestRepository.js';
import userRepository from '../repositories/userRepository.js';
import notificationRepository from '../repositories/notificationRepository.js';
import { sendPasswordResetEmail, sendPasswordResetRejectedEmail } from './emailService.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { parsePagination, buildPaginatedResponse } from '../utils/helpers.js';

const STALE_REQUEST_DAYS = 7;
const GENERIC_REQUEST_MESSAGE = 'If an account with that email exists, a password reset request has been submitted for administrator review.';

function formatRequest(r) {
  return {
    id: r.id,
    user_id: r.user_id,
    status: r.status,
    requested_at: r.requested_at,
    reviewed_by: r.reviewed_by,
    reviewed_at: r.reviewed_at,
    review_reason: r.review_reason,
    completed_at: r.completed_at,
    user_name: `${r.user_first_name} ${r.user_last_name}`,
    user_email: r.user_email,
    reviewer_name: r.reviewer_first_name ? `${r.reviewer_first_name} ${r.reviewer_last_name}` : null,
  };
}

const passwordResetService = {
  async requestReset(email) {
    const user = await userRepository.findByEmail(email);
    if (user) {
      const existing = await passwordResetRequestRepository.findActiveByUser(user.id);
      if (existing) {
        const ageMs = Date.now() - new Date(existing.created_at).getTime();
        const isStale = ageMs > STALE_REQUEST_DAYS * 24 * 60 * 60 * 1000;
        if (!isStale) {
          // A live request already exists — don't create a duplicate, and don't
          // reveal that to the caller (same generic response either way).
          return { message: GENERIC_REQUEST_MESSAGE };
        }
        await passwordResetRequestRepository.expire(existing.id);
      }
      await passwordResetRequestRepository.create(user.id);
    }
    // Always identical regardless of whether the account exists, to prevent email enumeration.
    return { message: GENERIC_REQUEST_MESSAGE };
  },

  async listRequests(query) {
    const { page, limit, offset } = parsePagination(query);
    const { data, total } = await passwordResetRequestRepository.findAll({
      status: query.status,
      limit,
      offset,
    });
    return buildPaginatedResponse(data.map(formatRequest), total, page, limit);
  },

  async approve(requestId, reviewingAdmin, newPassword) {
    const request = await passwordResetRequestRepository.findById(requestId);
    if (!request) throw new NotFoundError('Password reset request not found');
    if (request.status !== 'pending') {
      throw new ValidationError('This request has already been reviewed');
    }
    if (request.user_id === reviewingAdmin.id) {
      throw new ForbiddenError('You cannot approve your own password reset request. Use Change Password instead.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await userRepository.update(request.user_id, { password_hash: passwordHash });

    const completed = await passwordResetRequestRepository.markCompleted(requestId, reviewingAdmin.id);
    if (!completed) {
      // Someone else resolved it in between our checks — the password write above is
      // harmless (the admin explicitly chose to set it), but surface this so the
      // admin knows the request record itself didn't transition cleanly.
      throw new ValidationError('This request was already resolved by another administrator');
    }

    const user = await userRepository.findById(request.user_id);
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

    return passwordResetRequestRepository.findById(requestId).then(formatRequest);
  },

  async reject(requestId, reviewingAdmin, reason) {
    const request = await passwordResetRequestRepository.findById(requestId);
    if (!request) throw new NotFoundError('Password reset request not found');
    if (request.status !== 'pending') {
      throw new ValidationError('This request has already been reviewed');
    }

    const rejected = await passwordResetRequestRepository.markRejected(requestId, reviewingAdmin.id, reason);
    if (!rejected) {
      throw new ValidationError('This request was already resolved by another administrator');
    }

    const user = await userRepository.findById(request.user_id);
    try {
      await sendPasswordResetRejectedEmail(user, reason);
    } catch {
      // non-blocking
    }

    return passwordResetRequestRepository.findById(requestId).then(formatRequest);
  },
};

export default passwordResetService;
