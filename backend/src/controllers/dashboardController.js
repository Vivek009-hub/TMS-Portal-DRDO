import dashboardService from '../services/dashboardService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ROLES } from '../utils/constants.js';

export const getDashboard = asyncHandler(async (req, res) => {
  let data;
  if (req.user.role === ROLES.USER) {
    data = await dashboardService.getParticipantDashboard(req.user);
  } else {
    data = await dashboardService.getAdminDashboard({ startDate: req.query.start_date, endDate: req.query.end_date });
  }
  res.json({ success: true, data });
});
