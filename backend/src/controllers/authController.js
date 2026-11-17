import authService from '../services/authService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body.email, req.body.password);
  res.json({ success: true, data: result });
});

export const getProfile = asyncHandler(async (req, res) => {
  const result = await authService.getProfile(req.user.id);
  res.json({ success: true, data: result });
});

export const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(
    req.user.id,
    req.body.current_password,
    req.body.new_password
  );
  res.json({ success: true, data: result });
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await authService.createUser(req.body, req.user);
  res.status(201).json({ success: true, data: user });
});
