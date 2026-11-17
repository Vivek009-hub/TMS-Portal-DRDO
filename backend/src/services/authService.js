import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import userRepository from '../repositories/userRepository.js';
import participantRepository from '../repositories/participantRepository.js';
import { UnauthorizedError, ValidationError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { sanitizeUser } from '../utils/helpers.js';
import { ROLES } from '../utils/constants.js';
import { sendWelcomeEmail } from './emailService.js';

const authService = {
  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user || !user.is_active) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    await userRepository.updateLastLogin(user.id);

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const participant = user.role === ROLES.USER
      ? await participantRepository.findByUserId(user.id)
      : null;

    return {
      token,
      user: sanitizeUser(user),
      participant,
    };
  },

  async createUser(data, createdBy) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new ValidationError('Email already registered');
    }

    if (createdBy.role === ROLES.ADMIN && data.role === ROLES.ADMIN) {
      throw new ForbiddenError('Admins cannot create other admin accounts');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await userRepository.create({
      email: data.email,
      password_hash: passwordHash,
      first_name: data.first_name,
      last_name: data.last_name,
      role: data.role,
      created_by: createdBy.id,
    });

    try {
      await sendWelcomeEmail(user, data.password);
    } catch {
      // Email failure should not block user creation
    }

    return sanitizeUser(user);
  },

  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const participant = user.role === ROLES.USER
      ? await participantRepository.findByUserId(userId)
      : null;

    return { user: sanitizeUser(user), participant };
  },

  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new ValidationError('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await userRepository.update(userId, { password_hash: passwordHash });
    return { message: 'Password updated successfully' };
  },
};

export default authService;
