import { Response } from 'express';
import { getJobApplicationStats as getJobApplicationStatsService } from '../services/analyticsService';
import { AuthorizationError } from '../utils/errors/AppError';

/**
 * Get job application statistics for the authenticated user
 * GET /api/analytics/job-applications
 */
export const getJobApplicationStats = async (req: any, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
        throw new AuthorizationError('User not authenticated');
    }

    const stats = await getJobApplicationStatsService(userId);
    
    res.json(stats);
};
