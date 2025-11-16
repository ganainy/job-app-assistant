import { Types } from 'mongoose';
import JobApplication, { IJobApplication } from '../models/JobApplication';

export interface JobApplicationStats {
    totalApplications: number;
    applicationsByStatus: Record<string, number>;
    applicationsOverTime: Array<{
        date: string; // ISO date string (YYYY-MM-DD)
        count: number;
    }>;
}

/**
 * Get job application statistics for a specific user
 * @param userId - The user's MongoDB ObjectId
 * @returns Promise<JobApplicationStats> - Statistics object
 */
export const getJobApplicationStats = async (userId: string | Types.ObjectId): Promise<JobApplicationStats> => {
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

    // Get all job applications for the user
    const applications = await JobApplication.find({ userId: userObjectId }).lean();

    // Calculate total applications
    const totalApplications = applications.length;

    // Group applications by status
    const applicationsByStatus: Record<string, number> = {};
    applications.forEach((app) => {
        const status = app.status || 'Not Applied';
        applicationsByStatus[status] = (applicationsByStatus[status] || 0) + 1;
    });

    // Group applications by creation date (day level)
    const applicationsOverTimeMap = new Map<string, number>();
    applications.forEach((app) => {
        // Extract date part (YYYY-MM-DD) from createdAt
        const dateStr = app.createdAt
            ? new Date(app.createdAt).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];
        applicationsOverTimeMap.set(dateStr, (applicationsOverTimeMap.get(dateStr) || 0) + 1);
    });

    // Convert map to array and sort by date
    const applicationsOverTime = Array.from(applicationsOverTimeMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return {
        totalApplications,
        applicationsByStatus,
        applicationsOverTime,
    };
};
