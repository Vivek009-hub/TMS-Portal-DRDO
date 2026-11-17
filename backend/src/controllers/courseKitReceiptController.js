import courseKitReceiptService from '../services/courseKitReceiptService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const listForCourse = asyncHandler(async (req, res) => {
  const data = await courseKitReceiptService.listForCourse(req.params.courseId);
  res.json({ success: true, data });
});

export const save = asyncHandler(async (req, res) => {
  const data = await courseKitReceiptService.save(req.params.courseId, req.body.participant_id, req.body);
  res.status(201).json({ success: true, data });
});
