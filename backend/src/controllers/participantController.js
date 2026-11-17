import participantService from '../services/participantService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const list = asyncHandler(async (req, res) => {
  const result = await participantService.list(req.query);
  res.json({ success: true, ...result });
});

export const getById = asyncHandler(async (req, res) => {
  const participant = await participantService.getById(req.params.id);
  res.json({ success: true, data: participant });
});

export const create = asyncHandler(async (req, res) => {
  const participant = await participantService.create(req.body, req.user);
  res.status(201).json({ success: true, data: participant });
});

export const update = asyncHandler(async (req, res) => {
  const participant = await participantService.update(req.params.id, req.body);
  res.json({ success: true, data: participant });
});

export const remove = asyncHandler(async (req, res) => {
  const result = await participantService.delete(req.params.id);
  res.json({ success: true, data: result });
});

export const importExcel = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Excel file required' });
  }
  const result = await participantService.importFromExcel(req.file.path, req.user);
  res.json({ success: true, data: result });
});

export const exportExcel = asyncHandler(async (req, res) => {
  const buffer = await participantService.exportToExcel(req.query);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=participants.xlsx');
  res.send(buffer);
});

export const exportPdf = asyncHandler(async (req, res) => {
  await participantService.exportPdf(req.query, res);
});

export const getUnits = asyncHandler(async (req, res) => {
  const units = await participantService.getUnits();
  res.json({ success: true, data: units });
});
