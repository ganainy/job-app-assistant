// client/src/services/generatorApi.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api/generator'; // Generator specific endpoint

// Response from initial generation or finalization (success case)
interface GenerateSuccessResponse {
    status: "success"; // Added status
    message: string;
    cvFilename: string;
    coverLetterFilename: string;
}

export interface RequiredInputInfo { // Add 'export' here
    name: string;
    type: 'text' | 'number' | 'date' | 'textarea';
}

// Response when input is pending
interface GeneratePendingResponse {
    status: "pending_input";
    message: string;
    requiredInputs: RequiredInputInfo[];
    intermediateData: {
        tailoredCvJson: any; // Consider using JsonResumeSchema type if imported/shared
        coverLetterTemplate: string;
        language: 'en' | 'de';
        theme: string;
        jobId: string;
        userId: string;
        cvFilenamePrefix: string;
        clFilenamePrefix: string;
    };
}

interface GenerateDraftReadyResponse {
    status: "draft_ready"; // Discriminating literal type
    message: string;      // Success message (e.g., "Draft generated...", "Draft finalized...")
    jobId: string;        // The ID of the job application whose draft is ready
    // Note: This response type intentionally DOES NOT include the filenames.
    // Filenames are only sent back in GenerateSuccessResponse AFTER PDF rendering.
}


// Union type for the response from the initial POST /:jobId endpoint
// Export this type
export type GenerateInitialResponse = GenerateSuccessResponse | GeneratePendingResponse | GenerateDraftReadyResponse;

// --- Function to trigger initial document generation ---
export const generateDocuments = async (jobId: string, language: 'en' | 'de', theme: string): Promise<GenerateInitialResponse> => { // Return union type
    try {
        const response = await axios.post<GenerateInitialResponse>(`${API_BASE_URL}/${jobId}`, { language, theme });
        return response.data;
    } catch (error: any) {
        console.error(`Error generating documents for job ${jobId} in ${language}:`, error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred during document generation.' };
    }
};

// ---  Function to finalize generation with user input ---
export const finalizeGeneration = async (
    intermediateData: GeneratePendingResponse['intermediateData'], // Use type from pending response
    userInputData: { [key: string]: string }
): Promise<GenerateSuccessResponse> => { // Expect success response on finalize
    try {
        // Send intermediate data AND user input to the finalize endpoint
        const response = await axios.post<GenerateSuccessResponse>(`${API_BASE_URL}/finalize`, {
            intermediateData,
            userInputData
        });
        return response.data;
    } catch (error: any) {
        console.error(`Error finalizing generation for job ${intermediateData?.jobId}:`, error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred during document finalization.' };
    }
};

// Helper function to construct the download URL
export const getDownloadUrl = (filename: string): string => {
    // We don't include /api here if the base URL already has it
    return `${API_BASE_URL}/download/${encodeURIComponent(filename)}`;
};


// --- Refactored function to render final PDFs using axios ---
export const renderFinalPdfs = async (jobId: string): Promise<GenerateSuccessResponse> => {
    try {
        // Use axios.post - Auth header should be handled by axios interceptors
        // Correct the URL: API_BASE_URL already contains /api/generator
        const response = await axios.post<GenerateSuccessResponse>(`${API_BASE_URL}/${jobId}/render-pdf`);
        return response.data;
    } catch (error: any) {
        console.error(`Error rendering final PDFs for job ${jobId}:`, error);
        if (axios.isAxiosError(error) && error.response) {
            // Throw the error structure expected by the calling component
            throw new Error(error.response.data.message || `HTTP error! status: ${error.response.status}`);
        }
        // Throw a generic error if it's not an Axios error
        throw new Error(error.message || 'An unknown error occurred during PDF rendering.');
    }
};