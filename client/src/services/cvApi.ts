// client/src/services/cvApi.ts
import axios from 'axios';
import { JsonResumeSchema } from '../../../server/src/types/jsonresume'; // Import the type

const API_BASE_URL = 'http://localhost:5001/api/cv';

interface UploadResponse {
    message: string;
    cvData: JsonResumeSchema | null; // Use JsonResumeSchema
}

interface GetCvResponse {
    cvData: JsonResumeSchema | null; // Use JsonResumeSchema
}

// Add interface for update response
interface UpdateCvResponse {
    message: string;
    cvData: JsonResumeSchema; // Assuming backend returns the updated CV
}

// Function to upload CV file
export const uploadCV = async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('cvFile', file); // Key must match upload.single('cvFile') in backend

    try {
        // Axios should automatically set Content-Type to multipart/form-data
        // Auth header should be set by default instance via AuthContext
        const response = await axios.post<UploadResponse>(`${API_BASE_URL}/upload`, formData);
        return response.data;
    } catch (error: any) {
        console.error("CV Upload API error:", error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data; // Throw backend error message
        }
        throw { message: 'An unknown CV upload error occurred.' };
    }
};

// Function to get the current user's CV JSON
export const getCurrentCv = async (): Promise<GetCvResponse> => {
    try {
        const response = await axios.get<GetCvResponse>(API_BASE_URL); // GET /api/cv
        return response.data;
    } catch (error: any) {
        console.error("Get CV API error:", error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred fetching CV data.' };
    }
};

// Function to update the current user's CV JSON
export const updateCurrentCv = async (cvData: JsonResumeSchema): Promise<UpdateCvResponse> => {
    try {
        // Auth header should be set by default instance via AuthContext
        const response = await axios.put<UpdateCvResponse>(API_BASE_URL, cvData); // PUT /api/cv with JSON body
        return response.data;
    } catch (error: any) {
        console.error("Update CV API error:", error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data; // Throw backend error message
        }
        throw { message: 'An unknown error occurred updating CV data.' };
    }
};

// Function to delete the current user's CV
export const deleteCurrentCv = async (): Promise<{ message: string }> => {
    try {
        const response = await axios.delete<{ message: string }>(API_BASE_URL); // DELETE /api/cv
        return response.data;
    } catch (error: any) {
        console.error("Delete CV API error:", error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred deleting CV data.' };
    }
};