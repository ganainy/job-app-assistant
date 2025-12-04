// server/src/utils/apiKeyHelpers.ts
import Profile from '../models/Profile';
import { NotFoundError } from './errors/AppError';
import { decrypt, encrypt, isEncrypted } from './encryption';

/**
 * Get Apify API token from user's profile
 * @param userId - User ID (required)
 * @returns Apify API token
 * @throws NotFoundError if token is not found
 */
export const getApifyToken = async (userId: string): Promise<string> => {
  try {
    const profile = await Profile.findOne({ userId });
    const storedToken = profile?.integrations?.apify?.accessToken;
    
    if (!storedToken) {
      throw new NotFoundError(
        'Apify API key is required to fetch LinkedIn profile data. Please add your Apify API key in Settings. You can get a free API token from https://console.apify.com/account/integrations'
      );
    }
    
    // Check if the token is encrypted (migration support)
    let decryptedToken: string | null;
    if (isEncrypted(storedToken)) {
      // Token is encrypted, decrypt it
      decryptedToken = decrypt(storedToken);
      if (!decryptedToken) {
        throw new NotFoundError(
          'Failed to decrypt Apify API key. Please update your API key in Settings.'
        );
      }
    } else {
      // Token is not encrypted (legacy data), use it as-is and encrypt it for next time
      decryptedToken = storedToken;
      
      // Automatically encrypt the unencrypted token in the background
      const encryptedToken = encrypt(decryptedToken);
      if (encryptedToken && profile) {
        // Update the profile with encrypted token (non-blocking)
        Profile.findOneAndUpdate(
          { userId },
          { $set: { 'integrations.apify.accessToken': encryptedToken } }
        ).catch((err) => {
          console.error('Failed to encrypt legacy Apify token:', err);
        });
      }
    }
    
    return decryptedToken;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new NotFoundError(
      'Apify API key is required to fetch LinkedIn profile data. Please add your Apify API key in Settings. You can get a free API token from https://console.apify.com/account/integrations'
    );
  }
};


