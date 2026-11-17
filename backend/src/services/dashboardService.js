import dashboardRepository from '../repositories/dashboardRepository.js';
import participantRepository from '../repositories/participantRepository.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

const dashboardService = {
  async getAdminDashboard({ startDate, endDate } = {}) {
    return dashboardRepository.getAdminStats({ startDate, endDate });
  },

  async getParticipantDashboard(user) {
    const participant = await participantRepository.findByUserId(user.id);
    if (!participant) throw new ForbiddenError('No participant profile linked');
    const stats = await dashboardRepository.getParticipantStats(participant.id);
    if (!stats) throw new NotFoundError('Participant data not found');
    return stats;
  },
};

export default dashboardService;
