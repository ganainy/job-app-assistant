// client/src/services/analyticsApi.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

export interface JobApplicationStats {
    totalApplications: number;
    applicationsByStatus: Record<string, number>;
    applicationsOverTime: Array<{
        date: string; // ISO date string (YYYY-MM-DD)
        count: number;
    }>;
}

/**
 * Fetch job application statistics for the authenticated user
 * @returns Promise<JobApplicationStats> - Statistics object
 */
export const getJobApplicationStats = async (): Promise<JobApplicationStats> => {
    try {
        const response = await axios.get<JobApplicationStats>(`${API_BASE_URL}/analytics/job-applications`);
        return response.data;
    } catch (error) {
        console.error('Error fetching job application stats:', error);
        throw error;
    }
};

