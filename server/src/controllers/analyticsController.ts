
import { Request, Response } from 'express';
import * as analyticsService from '../services/analyticsService';
import asyncHandler from '../utils/asyncHandler';

export const getJobApplicationStats = asyncHandler(async (req: Request, res: Response) => {
    // The user ID is expected to be on the request object, added by the authMiddleware
    const userId = (req as any).user?.id;

    if (!userId) {
        // This case should ideally be prevented by the authMiddleware
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const stats = await analyticsService.getJobApplicationStats(userId);

    res.status(200).json(stats);
});
