import fundManagementService from '../services/fundManagementService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const getForCourse = asyncHandler(async (req, res) => {
  const data = await fundManagementService.getForCourse(req.params.courseId);
  res.json({ success: true, data });
});

export const saveSanction = asyncHandler(async (req, res) => {
  const data = await fundManagementService.saveSanction(req.params.courseId, req.body);
  res.status(201).json({ success: true, data });
});

export const addItem = asyncHandler(async (req, res) => {
  const data = await fundManagementService.addItem(req.params.courseId, req.body);
  res.status(201).json({ success: true, data });
});

export const updateItem = asyncHandler(async (req, res) => {
  const data = await fundManagementService.updateItem(req.params.id, req.body);
  res.json({ success: true, data });
});

export const deleteItem = asyncHandler(async (req, res) => {
  const data = await fundManagementService.deleteItem(req.params.id);
  res.json({ success: true, data });
});
