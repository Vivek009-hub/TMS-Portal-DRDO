import resultSheetService from '../services/resultSheetService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const getForCourse = asyncHandler(async (req, res) => {
  const data = await resultSheetService.getForCourse(req.params.courseId);
  res.json({ success: true, data });
});
