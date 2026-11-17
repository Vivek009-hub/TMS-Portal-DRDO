import mementoesUtilisationService from '../services/mementoesUtilisationService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const getForCourse = asyncHandler(async (req, res) => {
  const data = await mementoesUtilisationService.getForCourse(req.params.courseId);
  res.json({ success: true, data });
});

export const save = asyncHandler(async (req, res) => {
  const data = await mementoesUtilisationService.save(req.params.courseId, req.body);
  res.status(201).json({ success: true, data });
});
