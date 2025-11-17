// Chat API service for frontend
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001/api';

// Helper to get the auth token from localStorage
const getAuthToken = (): string | null => {
    return localStorage.getItem('authToken');
};

export interface ChatMessageResponse {
    answer: string;
}

export interface ChatMessage {
    sender: 'user' | 'ai';
    text: string;
    timestamp: string;
}

export interface ChatHistoryResponse {
    history: ChatMessage[];
}

/**
 * Get chat history for a job posting
 * @param jobId - The job application ID
 * @returns The chat history
 */
export const getChatHistory = async (jobId: string): Promise<ChatHistoryResponse> => {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found.');
    }

    if (!jobId) {
        throw new Error('Job ID is required.');
    }

    try {
        const response = await axios.get<ChatHistoryResponse>(
            `${API_BASE_URL}/chat/${jobId}/history`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        return response.data;
    } catch (error: any) {
        console.error('Error fetching chat history:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to fetch chat history');
    }
};

/**
 * Send a chat message to the AI about a job posting
 * @param jobId - The job application ID
 * @param question - The user's question about the job
 * @returns The AI's response
 */
export const postChatMessage = async (
    jobId: string,
    question: string
): Promise<ChatMessageResponse> => {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found.');
    }

    if (!jobId) {
        throw new Error('Job ID is required.');
    }

    if (!question || question.trim().length === 0) {
        throw new Error('Question cannot be empty.');
    }

    try {
        const response = await axios.post<ChatMessageResponse>(
            `${API_BASE_URL}/chat/${jobId}`,
            {
                question: question.trim()
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error: any) {
        console.error('Error sending chat message:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to send chat message');
    }
};

