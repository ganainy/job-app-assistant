// client/src/services/authApi.ts
import axios from 'axios';

// Reuse or redefine API_BASE_URL
const API_BASE_URL = 'http://localhost:5001/api/auth'; // Auth specific endpoint

// --- Type Definitions ---
interface AuthResponse {
    message: string;
    token: string;
    user: {
        id: string;
        email: string;
    };
}

interface RegisterResponse {
    message: string;
}

export interface UserProfile {
    id: string;
    email: string;
    createdAt: string;
    updatedAt: string;
}

// Use generic error structure for now
interface ApiError {
    message: string;
    errors?: any; // Can be more specific later
}

// --- API Functions ---

export const registerUser = async (credentials: {email: string, password: string}): Promise<RegisterResponse> => {
    try {
        // Note: Axios automatically throws for non-2xx status codes
        const response = await axios.post<RegisterResponse>(`${API_BASE_URL}/register`, credentials);
        return response.data;
    } catch (error) {
        console.error("Registration API error:", error);
        if (axios.isAxiosError(error) && error.response) {
            // Extract backend error message if available
            throw error.response.data as ApiError;
        }
        throw { message: 'An unknown registration error occurred.' } as ApiError; // Throw generic error
    }
};

export const loginUser = async (credentials: {email: string, password: string}): Promise<AuthResponse> => {
    try {
        const response = await axios.post<AuthResponse>(`${API_BASE_URL}/login`, credentials);
        return response.data;
    } catch (error) {
        console.error("Login API error:", error);
        if (axios.isAxiosError(error) && error.response) {
             throw error.response.data as ApiError;
        }
         throw { message: 'An unknown login error occurred.' } as ApiError;
    }
};

export const getCurrentUserProfile = async (): Promise<UserProfile> => {
    try {
        const response = await axios.get<UserProfile>(`${API_BASE_URL}/me`);
        return response.data;
    } catch (error) {
        console.error("Get Profile API error:", error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data as ApiError;
        }
        throw { message: 'An unknown error occurred fetching user profile.' } as ApiError;
    }
};