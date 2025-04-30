// client/src/services/analysisApi.ts
import axios from 'axios';
import { JsonResumeSchema } from '../../../server/src/types/jsonresume';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'; // Adjust as needed

// Helper to get the auth token from localStorage (or context)
const getAuthToken = (): string | null => {
    // Adjust this based on how you store the token (e.g., localStorage, context)
    return localStorage.getItem('authToken');
};

// 1. Upload CV for Analysis
export const uploadCvForAnalysis = async (cvFile: File): Promise<{ analysisId: string; message: string }> => {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found.');
    }

    const formData = new FormData();
    formData.append('cvFile', cvFile); // Key must match backend ('cvFile')

    try {
        const response = await axios.post<{ analysisId: string; message: string }>(
            `${API_BASE_URL}/analysis/analyze`, // Correct endpoint
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`,
                },
            }
        );
        console.log("CV Upload Response:", response.data);
        return response.data;
    } catch (error: any) {
        console.error('Error uploading CV for analysis:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to start CV analysis');
    }
};

// Function to analyze CV JSON directly
export const analyzeCv = async (cvJson: JsonResumeSchema): Promise<{ analysisId: string; message: string }> => {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found.');
    }

    try {
        const response = await axios.post<{ analysisId: string; message: string }>(
            `${API_BASE_URL}/analysis/analyze`,
            { cvJson },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            }
        );
        return response.data;
    } catch (error: any) {
        console.error('Error analyzing CV:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to analyze CV');
    }
};

// 2. Get Analysis Results
// Define an interface for the expected analysis result structure (based on CvAnalysis model)
// You might want to refine this based on exactly what the frontend needs
export interface AnalysisResult {
    _id: string;
    userId: string;
    analysisDate: string;
    status: 'pending' | 'completed' | 'failed';
    overallScore?: number;
    issueCount?: number;
    categoryScores?: Record<string, number>;
    detailedResults?: Record<string, {
        checkName: string;
        score?: number;
        issues: string[];
        suggestions?: string[];
        status: 'pass' | 'fail' | 'warning' | 'not-applicable';
    }>;
    cvFileRef?: string;
    errorInfo?: string;
    createdAt: string;
    updatedAt: string;
}

export const getAnalysis = async (analysisId: string): Promise<AnalysisResult> => {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found.');
    }

    if (!analysisId) {
        throw new Error('Analysis ID is required.');
    }

    try {
        const response = await axios.get<AnalysisResult>(
            `${API_BASE_URL}/analysis/${analysisId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }
        );
        console.log(`Get Analysis (${analysisId}) Response:`, response.data);
        return response.data;
    } catch (error: any) {
        console.error(`Error fetching analysis ${analysisId}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to fetch analysis results');
    }
};

// 3. Delete Analysis
export const deleteAnalysis = async (analysisId: string): Promise<{ message: string }> => {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found.');
    }

    if (!analysisId) {
        throw new Error('Analysis ID is required for deletion.');
    }

    try {
        const response = await axios.delete<{ message: string }>(
            `${API_BASE_URL}/analysis/${analysisId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }
        );
        console.log(`Delete Analysis (${analysisId}) Response:`, response.data);
        return response.data;
    } catch (error: any) {
        console.error(`Error deleting analysis ${analysisId}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to delete analysis');
    }
};
