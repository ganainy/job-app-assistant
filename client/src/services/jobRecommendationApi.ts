import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001/api';

export interface KeywordAnalysis {
    matchedKeywords: string[];
    missingKeywords: string[];
}

export interface JobRecommendation {
    shouldApply: boolean;
    score: number | null;
    reason: string;
    cached: boolean;
    cachedAt?: string;
    error?: string;
    keywordAnalysis?: KeywordAnalysis;
}

export const getJobRecommendation = async (
    jobId: string,
    forceRefresh: boolean = false
): Promise<JobRecommendation> => {
    try {
        const params = forceRefresh ? { forceRefresh: 'true' } : {};
        const response = await axios.get<JobRecommendation>(
            `${API_BASE_URL}/job-applications/${jobId}/recommendation`,
            { params }
        );
        return response.data;
    } catch (error: any) {
        console.error(`Error fetching recommendation for job ${jobId}:`, error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred fetching recommendation.' };
    }
};

export const getAllJobRecommendations = async (): Promise<Record<string, JobRecommendation>> => {
    try {
        const response = await axios.get<Record<string, JobRecommendation>>(
            `${API_BASE_URL}/job-applications/recommendations`
        );
        return response.data;
    } catch (error: any) {
        console.error('Error fetching all job recommendations:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred fetching recommendations.' };
    }
};

export const regenerateAllRecommendations = async (): Promise<Record<string, JobRecommendation>> => {
    try {
        const response = await axios.post<Record<string, JobRecommendation>>(
            `${API_BASE_URL}/job-applications/recommendations/regenerate`
        );
        return response.data;
    } catch (error: any) {
        console.error('Error regenerating all recommendations:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred regenerating recommendations.' };
    }
};
