import regimentalFundService from '../services/regimentalFundService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const listForCourse = asyncHandler(async (req, res) => {
  const data = await regimentalFundService.listForCourse(req.params.courseId);
  res.json({ success: true, data });
});

export const create = asyncHandler(async (req, res) => {
  const data = await regimentalFundService.create(req.params.courseId, req.body);
  res.status(201).json({ success: true, data });
});

export const update = asyncHandler(async (req, res) => {
  const data = await regimentalFundService.update(req.params.id, req.body);
  res.json({ success: true, data });
});

export const remove = asyncHandler(async (req, res) => {
  const data = await regimentalFundService.delete(req.params.id);
  res.json({ success: true, data });
});
