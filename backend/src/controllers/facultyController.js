import facultyService from '../services/facultyService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const list = asyncHandler(async (req, res) => {
  const result = await facultyService.list(req.query);
  res.json({ success: true, ...result });
});

export const getById = asyncHandler(async (req, res) => {
  const faculty = await facultyService.getById(req.params.id);
  res.json({ success: true, data: faculty });
});

export const create = asyncHandler(async (req, res) => {
  const faculty = await facultyService.create(req.body, req.user);
  res.status(201).json({ success: true, data: faculty });
});

export const update = asyncHandler(async (req, res) => {
  const faculty = await facultyService.update(req.params.id, req.body);
  res.json({ success: true, data: faculty });
});

export const remove = asyncHandler(async (req, res) => {
  const result = await facultyService.delete(req.params.id);
  res.json({ success: true, data: result });
});

export const getCourseAssignments = asyncHandler(async (req, res) => {
  const assignments = await facultyService.getCourseAssignments(req.params.courseId);
  res.json({ success: true, data: assignments });
});

export const assignToCourse = asyncHandler(async (req, res) => {
  const result = await facultyService.assignToCourse(req.params.courseId, req.body.faculty_id, req.body.role);
  res.json({ success: true, data: result });
});

export const unassignFromCourse = asyncHandler(async (req, res) => {
  const result = await facultyService.unassignFromCourse(req.params.courseId, req.params.facultyId);
  res.json({ success: true, data: result });
});

export const updateCourseAssignment = asyncHandler(async (req, res) => {
  const result = await facultyService.updateCourseAssignment(req.params.courseId, req.params.facultyId, req.body);
  res.json({ success: true, data: result });
});
