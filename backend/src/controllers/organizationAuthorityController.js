import organizationAuthorityService from '../services/organizationAuthorityService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const list = asyncHandler(async (req, res) => {
  const data = await organizationAuthorityService.list(req.query);
  res.json({ success: true, data });
});

export const getById = asyncHandler(async (req, res) => {
  const data = await organizationAuthorityService.getById(req.params.id);
  res.json({ success: true, data });
});

export const create = asyncHandler(async (req, res) => {
  const data = await organizationAuthorityService.create(req.body, req.user);
  res.status(201).json({ success: true, data });
});

export const update = asyncHandler(async (req, res) => {
  const data = await organizationAuthorityService.update(req.params.id, req.body);
  res.json({ success: true, data });
});

export const remove = asyncHandler(async (req, res) => {
  const data = await organizationAuthorityService.delete(req.params.id);
  res.json({ success: true, data });
});
