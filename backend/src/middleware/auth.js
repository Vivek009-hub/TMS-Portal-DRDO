import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { ROLES, ROLE_HIERARCHY } from '../utils/constants.js';
import userRepository from '../repositories/userRepository.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    const user = await userRepository.findById(decoded.userId);
    if (!user || !user.is_active) {
      throw new UnauthorizedError('Invalid or inactive account');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Invalid or expired token'));
    }
    next(error);
  }
}

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const minRequired = Math.min(...allowedRoles.map((r) => ROLE_HIERARCHY[r] || 0));

    if (userLevel < minRequired) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}

export const isAdmin = authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN);
export const isSuperAdmin = authorize(ROLES.SUPER_ADMIN);
export const isAnyRole = authorize(ROLES.USER, ROLES.ADMIN, ROLES.SUPER_ADMIN);
