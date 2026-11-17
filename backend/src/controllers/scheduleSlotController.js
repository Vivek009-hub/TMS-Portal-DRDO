import scheduleSlotService from '../services/scheduleSlotService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { SCHEDULE_TIME_SLOTS } from '../utils/constants.js';

export const getTimeSlotTemplate = asyncHandler(async (req, res) => {
  res.json({ success: true, data: SCHEDULE_TIME_SLOTS });
});

export const getWeek = asyncHandler(async (req, res) => {
  const data = await scheduleSlotService.getWeek(req.params.courseId, Number(req.params.week));
  res.json({ success: true, data });
});

export const getAll = asyncHandler(async (req, res) => {
  const data = await scheduleSlotService.getAll(req.params.courseId);
  res.json({ success: true, data });
});

export const saveWeek = asyncHandler(async (req, res) => {
  const data = await scheduleSlotService.saveWeek(req.params.courseId, Number(req.params.week), req.body.cells);
  res.json({ success: true, data });
});

export const exportExcel = asyncHandler(async (req, res) => {
  const buffer = await scheduleSlotService.exportExcel(req.params.courseId);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="schedule-${req.params.courseId}.xlsx"`);
  res.send(buffer);
});

export const exportPdf = asyncHandler(async (req, res) => {
  await scheduleSlotService.exportPdf(req.params.courseId, res);
});
