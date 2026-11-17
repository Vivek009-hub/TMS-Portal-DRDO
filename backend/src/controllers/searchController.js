import searchService from '../services/searchService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const search = asyncHandler(async (req, res) => {
  const data = await searchService.search(req.query.q);
  res.json({ success: true, data });
});
