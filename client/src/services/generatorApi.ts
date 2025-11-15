// client/src/services/generatorApi.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

// Success response type
interface GenerateSuccessResponse {
    status: "success";
    message: string;
    cvFilename: string;
    coverLetterFilename: string;
}

// Input requirement type
export interface RequiredInputInfo {
    name: string;
    type: 'text' | 'number' | 'date' | 'textarea';
}

// Pending input response type
interface GeneratePendingResponse {
    status: "pending_input";
    message: string;
    requiredInputs: RequiredInputInfo[];
    intermediateData: {
        tailoredCvJson: any;
        coverLetterTemplate: string;
        language: 'en' | 'de';
        jobId: string;
        userId: string;
    };
}

// Draft ready response type
interface GenerateDraftReadyResponse {
    status: "draft_ready";
    message: string;
    jobId: string;
}

type GenerateResponse = GenerateSuccessResponse | GeneratePendingResponse | GenerateDraftReadyResponse;

// Function to generate documents initially or handle draft state
export const generateDocuments = async (
    jobId: string,
    language: 'en' | 'de' = 'en',
    theme: string = 'modern'
): Promise<GenerateResponse> => {
    try {
        const response = await axios.post<GenerateResponse>(
            `${API_BASE_URL}/generator/${jobId}`,
            { language, theme }
        );
        return response.data;
    } catch (error: any) {
        console.error('Error generating documents:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(error.response.data.message || `HTTP error! status: ${error.response.status}`);
        }
        throw new Error(error.message || 'Failed to generate documents');
    }
};

// Function to render final PDFs when draft is ready
export const renderFinalPdfs = async (jobId: string): Promise<GenerateSuccessResponse> => {
    try {
        const response = await axios.post<GenerateSuccessResponse>(
            `${API_BASE_URL}/generator/${jobId}/render-pdf`,
            {}
        );
        return response.data;
    } catch (error: any) {
        console.error('Error rendering final PDFs:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(error.response.data.message || `HTTP error! status: ${error.response.status}`);
        }
        throw new Error(error.message || 'Failed to render final PDFs');
    }
};

// Function to finalize documents with user input
export const finalizeDocuments = async (
    jobId: string,
    userInputData: { [key: string]: string }
): Promise<GenerateSuccessResponse> => {
    try {
        // Send user input to finalize the documents
        const response = await axios.post<GenerateSuccessResponse>(
            `${API_BASE_URL}/generator/${jobId}/finalize`,
            { userInputData }
        );
        return response.data;
    } catch (error: any) {
        console.error('Error finalizing documents:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(error.response.data.message || `HTTP error! status: ${error.response.status}`);
        }
        throw new Error(error.message || 'Failed to finalize documents');
    }
};

// Helper function to get download URL for generated files
export const getDownloadUrl = (filename: string): string => {
    return `${API_BASE_URL}/generator/download/${filename}`;
};