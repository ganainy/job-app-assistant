import axios from 'axios';
import { JsonResumeSchema } from '../../../server/src/types/jsonresume';

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001/api'}/cv`;

interface UploadResponse {
    message: string;
    cvData: JsonResumeSchema | null;
}

interface GetCvResponse {
    cvData: JsonResumeSchema | null;
    analysisCache?: {
        cvHash: string;
        analyses: Record<string, Array<{ needsImprovement: boolean; feedback: string }>>;
        analyzedAt: string;
    } | null;
    selectedTemplate?: string;
}

interface UpdateCvResponse {
    message: string;
    cvData: JsonResumeSchema;
}

export const uploadCV = async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('cvFile', file);

    try {
        const response = await axios.post<UploadResponse>(`${API_BASE_URL}/upload`, formData);
        return response.data;
    } catch (error: any) {
        console.error("CV Upload API error:", error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown CV upload error occurred.' };
    }
};

export const getCurrentCv = async (): Promise<GetCvResponse> => {
    try {
        const response = await axios.get<GetCvResponse>(API_BASE_URL);
        return response.data;
    } catch (error: any) {
        console.error("Get CV API error:", error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred fetching CV data.' };
    }
};

export const updateCurrentCv = async (cvData: JsonResumeSchema, selectedTemplate?: string): Promise<UpdateCvResponse> => {
    try {
        const response = await axios.put<UpdateCvResponse>(API_BASE_URL, { cvData, selectedTemplate });
        return response.data;
    } catch (error: any) {
        console.error("Update CV API error:", error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred updating CV data.' };
    }
};

export const deleteCurrentCv = async (): Promise<{ message: string }> => {
    try {
        const response = await axios.delete<{ message: string }>(API_BASE_URL);
        return response.data;
    } catch (error: any) {
        console.error("Delete CV API error:", error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred deleting CV data.' };
    }
};

interface PreviewCvResponse {
    message: string;
    pdfBase64: string;
}

export const previewCv = async (cvData: JsonResumeSchema, template?: string): Promise<PreviewCvResponse> => {
    try {
        const response = await axios.post<PreviewCvResponse>(`${API_BASE_URL}/preview`, { cvData, template });
        return response.data;
    } catch (error: any) {
        console.error("Preview CV API error:", error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred generating CV preview.' };
    }
};