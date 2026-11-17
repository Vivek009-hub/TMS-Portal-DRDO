import practicalBreakupService from '../services/practicalBreakupService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const listForCourse = asyncHandler(async (req, res) => {
  const data = await practicalBreakupService.listForCourse(req.params.courseId, req.query.exam_type);
  res.json({ success: true, data });
});

export const save = asyncHandler(async (req, res) => {
  const data = await practicalBreakupService.save(req.params.courseId, req.body.participant_id, req.body.exam_type, req.body);
  res.status(201).json({ success: true, data });
});
