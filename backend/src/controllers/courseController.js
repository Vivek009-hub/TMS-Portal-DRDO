import courseService from '../services/courseService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const list = asyncHandler(async (req, res) => {
  const result = await courseService.list(req.query);
  res.json({ success: true, ...result });
});

export const getById = asyncHandler(async (req, res) => {
  const course = await courseService.getById(req.params.id);
  res.json({ success: true, data: course });
});

export const create = asyncHandler(async (req, res) => {
  const course = await courseService.create(req.body, req.user);
  res.status(201).json({ success: true, data: course });
});

export const update = asyncHandler(async (req, res) => {
  const course = await courseService.update(req.params.id, req.body);
  res.json({ success: true, data: course });
});

export const remove = asyncHandler(async (req, res) => {
  const result = await courseService.delete(req.params.id);
  res.json({ success: true, data: result });
});

export const getEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await courseService.getEnrollments(req.params.id);
  res.json({ success: true, data: enrollments });
});

export const getFinancialYears = asyncHandler(async (req, res) => {
  const years = await courseService.getFinancialYears();
  res.json({ success: true, data: years });
});

export const enroll = asyncHandler(async (req, res) => {
  const result = await courseService.enrollParticipant(req.params.id, req.body.participant_id);
  res.json({ success: true, data: result });
});

export const exportExcel = asyncHandler(async (req, res) => {
  const buffer = await courseService.exportExcel(req.query);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="courses.xlsx"');
  res.send(buffer);
});

export const exportPdf = asyncHandler(async (req, res) => {
  await courseService.exportPdf(req.query, res);
});

export const exportRosterExcel = asyncHandler(async (req, res) => {
  const buffer = await courseService.exportRosterExcel(req.params.id);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="course-${req.params.id}-roster.xlsx"`);
  res.send(buffer);
});

export const exportRosterPdf = asyncHandler(async (req, res) => {
  await courseService.exportRosterPdf(req.params.id, res);
});
