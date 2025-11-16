// client/src/services/settingsApi.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

// Helper to get the auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export interface ApiKeys {
  gemini: {
    accessToken: string | null;
    enabled: boolean;
  };
  apify: {
    accessToken: string | null;
    enabled: boolean;
  };
}

export interface UpdateApiKeysRequest {
  gemini?: {
    accessToken: string | null;
    enabled?: boolean;
  };
  apify?: {
    accessToken: string | null;
    enabled?: boolean;
  };
}

/**
 * Get user's API keys (masked)
 */
export const getApiKeys = async (): Promise<ApiKeys> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token found.');
  }

  try {
    const response = await axios.get<ApiKeys>(`${API_BASE_URL}/settings/api-keys`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching API keys:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch API keys');
  }
};

/**
 * Update user's API keys
 */
export const updateApiKeys = async (keys: UpdateApiKeysRequest): Promise<ApiKeys> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token found.');
  }

  try {
    const response = await axios.put<ApiKeys>(`${API_BASE_URL}/settings/api-keys`, keys, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating API keys:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to update API keys');
  }
};

/**
 * Delete a specific API key
 */
export const deleteApiKey = async (service: 'gemini' | 'apify'): Promise<void> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token found.');
  }

  try {
    await axios.delete(`${API_BASE_URL}/settings/api-keys/${service}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  } catch (error: any) {
    console.error('Error deleting API key:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to delete API key');
  }
};

