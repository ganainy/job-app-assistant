
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001/api';

export interface StatusOverTimeData {
    month: string;
    Applied: number;
    'Not Applied': number;
    Interview: number;
    Assessment: number;
    Rejected: number;
    Closed: number;
    Offer: number;
}

export interface ApplicationStats {
    totalApplications: number;
    applicationsByStatus: { _id: string; count: number }[];
    applicationsOverTime: { _id: string; count: number }[];
    applicationsOverTimeByStatus: StatusOverTimeData[];
}

export const getApplicationStats = async (month?: string): Promise<ApplicationStats> => {
    try {
        const url = month
            ? `${API_BASE_URL}/analytics/job-applications?month=${month}`
            : `${API_BASE_URL}/analytics/job-applications`;

        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching application stats:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred while fetching application statistics.' };
    }
};
