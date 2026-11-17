import fs from 'fs';
import certificateService from '../services/certificateService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const list = asyncHandler(async (req, res) => {
  const result = await certificateService.list(req.query, req.user);
  res.json({ success: true, ...result });
});

export const getById = asyncHandler(async (req, res) => {
  const cert = await certificateService.getById(req.params.id, req.user);
  res.json({ success: true, data: cert });
});

export const verify = asyncHandler(async (req, res) => {
  const result = await certificateService.verify(req.params.number);
  res.json({ success: true, data: result });
});

export const generate = asyncHandler(async (req, res) => {
  const cert = await certificateService.generate(req.body, req.user);
  res.status(201).json({ success: true, data: cert });
});

export const bulkGenerate = asyncHandler(async (req, res) => {
  const result = await certificateService.bulkGenerate(req.body, req.user);
  res.status(201).json({ success: true, data: result });
});

export const bulkGenerateZip = asyncHandler(async (req, res) => {
  await certificateService.bulkGenerateZip(req.body, req.user, res);
});

export const exportExcel = asyncHandler(async (req, res) => {
  const buffer = await certificateService.exportExcel(req.query);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="certificates.xlsx"');
  res.send(buffer);
});

export const exportPdf = asyncHandler(async (req, res) => {
  await certificateService.exportPdf(req.query, res);
});

export const remove = asyncHandler(async (req, res) => {
  const result = await certificateService.delete(req.params.id);
  res.json({ success: true, data: result });
});

export const download = asyncHandler(async (req, res) => {
  const cert = await certificateService.getById(req.params.id, req.user);
  if (!cert.file_path || !fs.existsSync(cert.file_path)) {
    return res.status(404).json({ success: false, message: 'Certificate PDF not found' });
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${cert.certificate_number}.pdf"`);
  fs.createReadStream(cert.file_path).pipe(res);
});

export const preview = asyncHandler(async (req, res) => {
  const cert = await certificateService.getById(req.params.id, req.user);
  if (!cert.file_path || !fs.existsSync(cert.file_path)) {
    return res.status(404).json({ success: false, message: 'Certificate PDF not found' });
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${cert.certificate_number}.pdf"`);
  fs.createReadStream(cert.file_path).pipe(res);
});

export const downloadDocx = asyncHandler(async (req, res) => {
  const cert = await certificateService.getById(req.params.id, req.user);
  if (!cert.docx_file_path || !fs.existsSync(cert.docx_file_path)) {
    return res.status(404).json({ success: false, message: 'Certificate DOCX not found' });
  }
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${cert.certificate_number}.docx"`);
  fs.createReadStream(cert.docx_file_path).pipe(res);
});
