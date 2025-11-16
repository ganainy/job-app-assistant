// server/src/utils/apiKeyHelpers.ts
import Profile from '../models/Profile';
import { NotFoundError } from './errors/AppError';

/**
 * Get Apify API token from user's profile
 * @param userId - User ID (required)
 * @returns Apify API token
 * @throws NotFoundError if token is not found
 */
export const getApifyToken = async (userId: string): Promise<string> => {
  try {
    const profile = await Profile.findOne({ userId });
    const token = profile?.integrations?.apify?.accessToken;
    
    if (!token) {
      throw new NotFoundError(
        'Apify API key is required to fetch LinkedIn profile data. Please add your Apify API key in Settings. You can get a free API token from https://console.apify.com/account/integrations'
      );
    }
    
    return token;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new NotFoundError(
      'Apify API key is required to fetch LinkedIn profile data. Please add your Apify API key in Settings. You can get a free API token from https://console.apify.com/account/integrations'
    );
  }
};

/**
 * Get Gemini API key from user's profile
 * @param userId - User ID (required)
 * @returns Gemini API key
 * @throws NotFoundError if key is not found
 */
export const getGeminiApiKey = async (userId: string): Promise<string> => {
  try {
    const profile = await Profile.findOne({ userId });
    const key = profile?.integrations?.gemini?.accessToken;
    
    if (!key) {
      throw new NotFoundError(
        'Gemini API key is required to use AI features like job extraction, CV analysis, and document generation. Please add your Gemini API key in Settings. You can get a free API key from https://makersuite.google.com/app/apikey'
      );
    }
    
    return key;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new NotFoundError(
      'Gemini API key is required to use AI features like job extraction, CV analysis, and document generation. Please add your Gemini API key in Settings. You can get a free API key from https://makersuite.google.com/app/apikey'
    );
  }
};

