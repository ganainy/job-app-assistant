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
export interface SectionScore {
    score: number;
    issues: string[];
    suggestions: string[];
}

export interface DetailedResultItem {
    checkName: string;
    score?: number;
    issues: string[];
    suggestions?: string[];
    status: 'pass' | 'fail' | 'warning' | 'not-applicable';
    priority: 'high' | 'medium' | 'low';
    originalContent?: string;
}

export interface AnalysisResult {
    _id: string;
    id: string; // Alias for _id for compatibility
    status: 'pending' | 'completed' | 'failed';
    overallScore: number;
    issueCount: number;
    categoryScores: Record<string, number>;
    detailedResults: Record<string, DetailedResultItem>;
    sectionScores: Record<string, SectionScore>;
    errorInfo?: string;
}

export const analyzeCv = async (cvData: JsonResumeSchema, jobData?: any): Promise<AnalysisResult> => {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found.');
    }

    try {
        const response = await axios.post(`${API_BASE_URL}/analysis/analyze`, {
            cv: cvData,
            job: jobData
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = response.data;

        // Transform the response into the expected format
        return {
            ...result,
            id: result._id,
            sectionScores: Object.entries(result.detailedResults || {}).reduce<Record<string, SectionScore>>((acc, [key, value]) => {
                const detail = value as DetailedResultItem; // Type assertion since we know the structure
                return {
                    ...acc,
                    [key]: {
                        score: detail.score ?? 0,
                        issues: detail.issues || [],
                        suggestions: detail.suggestions || []
                    }
                };
            }, {})
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.message || 'Failed to analyze CV');
        }
        throw error;
    }
};

// 2. Get Analysis Results
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
        const result = response.data;
        // Add transformation logic similar to analyzeCv
        return {
            ...result,
            id: result._id, // Ensure id alias is present
            sectionScores: Object.entries(result.detailedResults || {}).reduce<Record<string, SectionScore>>((acc, entry) => {
                const [key, detail] = entry as [string, DetailedResultItem];
                return {
                    ...acc,
                    [key]: {
                        score: detail.score ?? 0, // Use nullish coalescing for potentially undefined score
                        issues: detail.issues || [],
                        suggestions: detail.suggestions || []
                    }
                };
            }, {})
        };
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

// 4. Generate Improvement for a Section
export interface ImprovementResult {
    improvement: string;
    score?: number;
}

export const generateImprovement = async (
    analysisId: string,
    section: string,
    currentContent: string
): Promise<ImprovementResult> => {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found.');
    }

    try {
        const response = await axios.post(
            `${API_BASE_URL}/analysis/${analysisId}/improve`,
            {
                section,
                currentContent
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.message || 'Failed to generate improvement');
        }
        throw error;
    }
};
