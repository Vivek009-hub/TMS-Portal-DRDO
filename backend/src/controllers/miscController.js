import leaveService from '../services/leaveService.js';
import feedbackService from '../services/feedbackService.js';
import { templateService, circularService, scheduleService, calendarService } from '../services/documentService.js';
import documentCenterService from '../services/documentCenterService.js';
import { notificationService, settingsService, userService, attendanceService } from '../services/miscService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import fs from 'fs';

// Leave
export const leaveList = asyncHandler(async (req, res) => {
  const result = await leaveService.list(req.query, req.user);
  res.json({ success: true, ...result });
});
export const leaveGet = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await leaveService.getById(req.params.id, req.user) });
});
export const leaveCreate = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await leaveService.create(req.body, req.user) });
});
export const leaveUpdateStatus = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await leaveService.updateStatus(req.params.id, req.body, req.user) });
});
export const leaveExportExcel = asyncHandler(async (req, res) => {
  const buffer = await leaveService.exportExcel(req.query);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="leaves.xlsx"');
  res.send(buffer);
});
export const leaveExportPdf = asyncHandler(async (req, res) => {
  await leaveService.exportPdf(req.query, res);
});

// Feedback
export const feedbackList = asyncHandler(async (req, res) => {
  const result = await feedbackService.list(req.query, req.user);
  res.json({ success: true, ...result });
});
export const feedbackSubmit = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await feedbackService.submit(req.body, req.user) });
});
export const feedbackAnalytics = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await feedbackService.getAnalytics() });
});
export const feedbackExportExcel = asyncHandler(async (req, res) => {
  const buffer = await feedbackService.exportExcel(req.query);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="feedback.xlsx"');
  res.send(buffer);
});
export const feedbackExportPdf = asyncHandler(async (req, res) => {
  await feedbackService.exportPdf(req.query, res);
});

// Templates
export const templateList = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await templateService.list(req.query) });
});
export const templateGet = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await templateService.getById(req.params.id) });
});
export const templateCreate = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await templateService.create(req.body, req.user) });
});
export const templateUpdate = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await templateService.update(req.params.id, req.body, req.user) });
});
export const templateDelete = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await templateService.delete(req.params.id) });
});
export const templateImportDocx = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'A .docx file is required' });
  }
  const template = await templateService.importDocx(req.file, req.body, req.user);
  res.status(201).json({ success: true, data: template });
});
export const templateReplaceDocx = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'A .docx file is required' });
  }
  const template = await templateService.replaceDocx(req.params.id, req.file, req.user);
  res.json({ success: true, data: template });
});

// Circulars
export const circularList = asyncHandler(async (req, res) => {
  const result = await circularService.list(req.query);
  res.json({ success: true, ...result });
});
export const circularGet = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await circularService.getById(req.params.id) });
});
export const circularCreate = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await circularService.create(req.body, req.user) });
});
export const circularUpdate = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await circularService.update(req.params.id, req.body) });
});
export const circularDelete = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await circularService.delete(req.params.id) });
});
export const circularPdf = asyncHandler(async (req, res) => {
  await circularService.generatePdf(req.params.id, res);
});
export const circularImportDocx = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'A .docx file is required' });
  }
  const circular = await circularService.importDocx(req.file, req.body, req.user);
  res.status(201).json({ success: true, data: circular });
});

// Schedules
export const scheduleList = asyncHandler(async (req, res) => {
  const result = await scheduleService.list(req.query);
  res.json({ success: true, ...result });
});
export const scheduleGet = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await scheduleService.getById(req.params.id) });
});
export const scheduleCreate = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await scheduleService.create(req.body, req.user) });
});
export const scheduleUpdate = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await scheduleService.update(req.params.id, req.body) });
});
export const scheduleDelete = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await scheduleService.delete(req.params.id) });
});
export const schedulePdf = asyncHandler(async (req, res) => {
  await scheduleService.generatePdf(req.params.id, res);
});
export const scheduleImportDocx = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'A .docx file is required' });
  }
  const schedule = await scheduleService.importDocx(req.file, req.body, req.user);
  res.status(201).json({ success: true, data: schedule });
});

// Calendars
export const calendarList = asyncHandler(async (req, res) => {
  const result = await calendarService.list(req.query);
  res.json({ success: true, ...result });
});
export const calendarGet = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await calendarService.getById(req.params.id) });
});
export const calendarCreate = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await calendarService.create(req.body, req.user) });
});
export const calendarUpdate = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await calendarService.update(req.params.id, req.body) });
});
export const calendarDelete = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await calendarService.delete(req.params.id) });
});
export const calendarPdf = asyncHandler(async (req, res) => {
  await calendarService.generatePdf(req.params.id, res);
});
export const calendarImportDocx = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'A .docx file is required' });
  }
  const calendar = await calendarService.importDocx(req.file, req.body, req.user);
  res.status(201).json({ success: true, data: calendar });
});
export const calendarExportExcel = asyncHandler(async (req, res) => {
  const buffer = await calendarService.exportExcel(req.query);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="calendars.xlsx"');
  res.send(buffer);
});
export const calendarExportPdf = asyncHandler(async (req, res) => {
  await calendarService.exportPdf(req.query, res);
});

// Documents
export const documentList = asyncHandler(async (req, res) => {
  const result = await documentCenterService.list(req.query, req.user);
  res.json({ success: true, ...result });
});
export const documentUpload = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'File required' });
  const doc = await documentCenterService.upload(req.file, req.body, req.user);
  res.status(201).json({ success: true, data: doc });
});
export const documentDelete = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await documentCenterService.delete(req.params.id) });
});
export const documentDownload = asyncHandler(async (req, res) => {
  const doc = await documentCenterService.getById(req.params.id);
  if (!fs.existsSync(doc.file_path)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }
  res.download(doc.file_path, doc.file_name);
});

// Notifications
export const notificationList = asyncHandler(async (req, res) => {
  const result = await notificationService.list(req.user, req.query);
  res.json({ success: true, ...result });
});
export const notificationMarkRead = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await notificationService.markAsRead(req.params.id, req.user) });
});
export const notificationMarkAllRead = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await notificationService.markAllAsRead(req.user) });
});
export const notificationUnreadCount = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await notificationService.getUnreadCount(req.user) });
});

// Settings
export const settingsGet = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await settingsService.getAll() });
});
export const settingsUpdate = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await settingsService.update(req.body.settings, req.user) });
});

// Users
export const userList = asyncHandler(async (req, res) => {
  const result = await userService.list(req.query);
  res.json({ success: true, ...result });
});
export const userUpdate = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await userService.update(req.params.id, req.body, req.user) });
});
export const userDelete = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await userService.delete(req.params.id, req.user) });
});
export const userSetPassword = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await userService.setPassword(req.params.id, req.body.new_password, req.user) });
});

// Attendance
export const attendanceList = asyncHandler(async (req, res) => {
  const result = await attendanceService.list(req.query, req.user);
  res.json({ success: true, ...result });
});
export const attendanceBulkMark = asyncHandler(async (req, res) => {
  const { course_id, date, records } = req.body;
  res.json({ success: true, data: await attendanceService.bulkMark(course_id, date, records, req.user) });
});
