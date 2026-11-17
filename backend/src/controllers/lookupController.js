import lookupService from '../services/lookupService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const list = asyncHandler(async (req, res) => {
  const data = await lookupService.list(req.params.type);
  res.json({ success: true, data });
});

export const create = asyncHandler(async (req, res) => {
  const data = await lookupService.create(req.params.type, req.body.name);
  res.status(201).json({ success: true, data });
});

export const update = asyncHandler(async (req, res) => {
  const data = await lookupService.update(req.params.type, req.params.id, req.body);
  res.json({ success: true, data });
});

export const remove = asyncHandler(async (req, res) => {
  await lookupService.remove(req.params.type, req.params.id);
  res.json({ success: true, data: { message: 'Deleted successfully' } });
});
