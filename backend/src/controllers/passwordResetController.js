import passwordResetService from '../services/passwordResetService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const requestReset = asyncHandler(async (req, res) => {
  const result = await passwordResetService.requestReset(req.body.email);
  res.json({ success: true, data: result });
});

export const list = asyncHandler(async (req, res) => {
  const result = await passwordResetService.listRequests(req.query);
  res.json({ success: true, ...result });
});

export const approve = asyncHandler(async (req, res) => {
  const result = await passwordResetService.approve(req.params.id, req.user, req.body.new_password);
  res.json({ success: true, data: result });
});

export const reject = asyncHandler(async (req, res) => {
  const result = await passwordResetService.reject(req.params.id, req.user, req.body.reason);
  res.json({ success: true, data: result });
});
