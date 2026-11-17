import examResultService from '../services/examResultService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const listForCourse = asyncHandler(async (req, res) => {
  const data = await examResultService.listForCourse(req.params.courseId, req.query.exam_category, req.query.exam_type);
  res.json({ success: true, data });
});

export const save = asyncHandler(async (req, res) => {
  const data = await examResultService.save(
    req.params.courseId, req.body.participant_id, req.body.exam_category, req.body.exam_type, req.body
  );
  res.status(201).json({ success: true, data });
});

export const remove = asyncHandler(async (req, res) => {
  const data = await examResultService.delete(req.params.id);
  res.json({ success: true, data });
});
