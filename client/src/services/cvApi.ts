// client/src/services/cvApi.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api/cv';

interface UploadResponse {
    message: string;
    cvData: any; // Type this more strictly based on expected JSON structure if needed
}

interface GetCvResponse {
     cvData: any | null;
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