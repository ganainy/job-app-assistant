// client/src/services/generatorApi.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api/generator'; // Generator specific endpoint

// Expected response from the POST /api/generator/:jobId endpoint
interface GenerateResponse {
    message: string;
    cvFilename: string;
    coverLetterFilename: string;
}

// Function to trigger document generation for a specific job ID
export const generateDocuments = async (jobId: string): Promise<GenerateResponse> => {
    try {
        // Auth token is handled by the default axios instance via AuthContext
        const response = await axios.post<GenerateResponse>(`${API_BASE_URL}/${jobId}`);
        return response.data;
    } catch (error: any) {
        console.error(`Error generating documents for job ${jobId}:`, error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data; // Throw backend error message
        }
        throw { message: 'An unknown error occurred during document generation.' };
    }
};

// Helper function to construct the download URL
export const getDownloadUrl = (filename: string): string => {
    // We don't include /api here if the base URL already has it
    return `${API_BASE_URL}/download/${encodeURIComponent(filename)}`;
};