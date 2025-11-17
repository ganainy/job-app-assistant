
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001/api';

export interface ApplicationStats {
    totalApplications: number;
    applicationsByStatus: { _id: string; count: number }[];
    applicationsOverTime: { _id: string; count: number }[];
}

export const getApplicationStats = async (): Promise<ApplicationStats> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/analytics/job-applications`);
        return response.data;
    } catch (error) {
        console.error('Error fetching application stats:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred while fetching application statistics.' };
    }
};
