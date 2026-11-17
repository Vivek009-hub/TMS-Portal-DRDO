import reportingSheetService from '../services/reportingSheetService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const listForCourse = asyncHandler(async (req, res) => {
  const data = await reportingSheetService.listForCourse(req.params.courseId);
  res.json({ success: true, data });
});

export const recordReporting = asyncHandler(async (req, res) => {
  const data = await reportingSheetService.recordReporting(req.params.courseId, req.body.participant_id, req.body);
  res.status(201).json({ success: true, data });
});

export const remove = asyncHandler(async (req, res) => {
  const data = await reportingSheetService.delete(req.params.id);
  res.json({ success: true, data });
});
