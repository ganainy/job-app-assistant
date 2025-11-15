// client/src/services/coverLetterApi.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export interface GenerateCoverLetterResponse {
    success: boolean;
    coverLetterText: string;
    language: 'en' | 'de';
    message?: string;
    error?: string;
}

/**
 * Generate a cover letter for a specific job application
 * @param jobId The ID of the job application
 * @param language The language for the cover letter ('en' or 'de')
 * @returns The generated cover letter text
 */
export const generateCoverLetter = async (
    jobId: string,
    language: 'en' | 'de' = 'en'
): Promise<string> => {
    try {
        const response = await axios.post<GenerateCoverLetterResponse>(
            `${API_BASE_URL}/cover-letter/${jobId}`,
            { language }
        );

        if (!response.data.success || !response.data.coverLetterText) {
            throw new Error(response.data.message || 'Failed to generate cover letter');
        }

        return response.data.coverLetterText;
    } catch (error: any) {
        console.error('Error generating cover letter:', error);
        if (axios.isAxiosError(error) && error.response) {
            const errorMessage = error.response.data?.message || 
                                error.response.data?.error || 
                                `HTTP error! status: ${error.response.status}`;
            throw new Error(errorMessage);
        }
        throw new Error(error.message || 'Failed to generate cover letter');
    }
};

