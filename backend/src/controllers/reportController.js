import reportService from '../services/reportService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const listTypes = asyncHandler(async (req, res) => {
  res.json({ success: true, data: reportService.listTypes() });
});

export const generate = asyncHandler(async (req, res) => {
  const data = await reportService.generate(req.params.type, req.query);
  res.json({ success: true, ...data });
});

export const exportExcel = asyncHandler(async (req, res) => {
  const buffer = await reportService.exportExcel(req.params.type, req.query);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}.xlsx"`);
  res.send(buffer);
});

export const exportPdf = asyncHandler(async (req, res) => {
  await reportService.exportPdf(req.params.type, req.query, res);
});
