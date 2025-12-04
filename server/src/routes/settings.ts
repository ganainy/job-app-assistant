// server/src/routes/settings.ts
import express, { Router, Request, Response, RequestHandler } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import Profile from '../models/Profile';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError, NotFoundError } from '../utils/errors/AppError';
import { encrypt, decrypt } from '../utils/encryption';

const router: Router = express.Router();
router.use(authMiddleware as RequestHandler); // Apply auth to all routes

/**
 * Mask API key - show only last 4 characters
 * Handles both encrypted and unencrypted keys (for migration compatibility)
 */
function maskApiKey(key: string | undefined | null): string | null {
  if (!key) return null;
  
  // Try to decrypt first (in case it's encrypted)
  // If decryption fails or returns the same value, it might be unencrypted
  const decrypted = decrypt(key);
  const valueToMask = decrypted || key;
  
  if (valueToMask.length <= 4) return '****';
  return '****' + valueToMask.slice(-4);
}

/**
 * Validate Gemini API key format
 */
function validateGeminiKey(key: string): boolean {
  return key.startsWith('AIza') && key.length > 20;
}

/**
 * Validate Apify token format
 */
function validateApifyToken(token: string): boolean {
  return token.startsWith('apify_api_') && token.length > 20;
}

/**
 * GET /api/settings/api-keys
 * Get user's API keys (masked)
 */
router.get('/api-keys', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user._id) {
    throw new ValidationError('User not authenticated');
  }
  const userId = req.user._id.toString();

  // Find or create profile if it doesn't exist
  let profile = await Profile.findOne({ userId });
  if (!profile) {
    // Create a new profile if it doesn't exist
    // Explicitly set autoJobSettings.enabled to false for new users
    profile = await Profile.create({ 
      userId,
      autoJobSettings: {
        enabled: false,
        linkedInSearchUrl: '',
        schedule: '0 9 * * *',
        maxJobs: 50
      }
    });
  }

  res.json({
    gemini: {
      accessToken: maskApiKey(profile.integrations?.gemini?.accessToken),
      enabled: profile.integrations?.gemini?.enabled || false,
    },
    apify: {
      accessToken: maskApiKey(profile.integrations?.apify?.accessToken),
      enabled: profile.integrations?.apify?.enabled || false,
    },
  });
}));

/**
 * PUT /api/settings/api-keys
 * Update user's API keys
 */
router.put('/api-keys', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user._id) {
    throw new ValidationError('User not authenticated');
  }
  const userId = req.user._id.toString();

  const { gemini, apify } = req.body;

  // Validate Gemini key if provided
  if (gemini?.accessToken !== undefined && gemini.accessToken !== null && gemini.accessToken !== '') {
    if (!validateGeminiKey(gemini.accessToken)) {
      throw new ValidationError('Invalid Gemini API key format. Key should start with "AIza"');
    }
  }

  // Validate Apify token if provided
  if (apify?.accessToken !== undefined && apify.accessToken !== null && apify.accessToken !== '') {
    if (!validateApifyToken(apify.accessToken)) {
      throw new ValidationError('Invalid Apify token format. Token should start with "apify_api_"');
    }
  }

  // Find or create profile
  let profile = await Profile.findOne({ userId });
  if (!profile) {
    // Explicitly set autoJobSettings.enabled to false for new users
    profile = await Profile.create({ 
      userId,
      autoJobSettings: {
        enabled: false,
        linkedInSearchUrl: '',
        schedule: '0 9 * * *',
        maxJobs: 50
      }
    });
  }

  // Update integrations
  const updates: any = {};
  
  if (gemini !== undefined) {
    if (gemini.accessToken === null || gemini.accessToken === '') {
      // Remove key
      updates['integrations.gemini.accessToken'] = null;
      updates['integrations.gemini.enabled'] = false;
    } else {
      // Encrypt the API key before storing
      const encryptedKey = encrypt(gemini.accessToken);
      if (!encryptedKey) {
        throw new ValidationError('Failed to encrypt Gemini API key');
      }
      updates['integrations.gemini.accessToken'] = encryptedKey;
      updates['integrations.gemini.enabled'] = gemini.enabled !== undefined ? gemini.enabled : true;
    }
  }

  if (apify !== undefined) {
    if (apify.accessToken === null || apify.accessToken === '') {
      // Remove token
      updates['integrations.apify.accessToken'] = null;
      updates['integrations.apify.enabled'] = false;
    } else {
      // Encrypt the API token before storing
      const encryptedToken = encrypt(apify.accessToken);
      if (!encryptedToken) {
        throw new ValidationError('Failed to encrypt Apify token');
      }
      updates['integrations.apify.accessToken'] = encryptedToken;
      updates['integrations.apify.enabled'] = apify.enabled !== undefined ? apify.enabled : true;
    }
  }

  // Update profile
  await Profile.findOneAndUpdate(
    { userId },
    { $set: updates },
    { new: true, upsert: true }
  );

  // Return masked keys
  const updatedProfile = await Profile.findOne({ userId });
  res.json({
    message: 'API keys updated successfully',
    gemini: {
      accessToken: maskApiKey(updatedProfile?.integrations?.gemini?.accessToken),
      enabled: updatedProfile?.integrations?.gemini?.enabled || false,
    },
    apify: {
      accessToken: maskApiKey(updatedProfile?.integrations?.apify?.accessToken),
      enabled: updatedProfile?.integrations?.apify?.enabled || false,
    },
  });
}));

/**
 * DELETE /api/settings/api-keys/:service
 * Delete a specific API key
 */
router.delete('/api-keys/:service', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user._id) {
    throw new ValidationError('User not authenticated');
  }
  const userId = req.user._id.toString();
  const service = req.params.service;

  if (service !== 'gemini' && service !== 'apify') {
    throw new ValidationError('Invalid service. Must be "gemini" or "apify"');
  }

  const profile = await Profile.findOne({ userId });
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }

  // Remove the key
  await Profile.findOneAndUpdate(
    { userId },
    {
      $set: {
        [`integrations.${service}.accessToken`]: null,
        [`integrations.${service}.enabled`]: false,
      },
    }
  );

  res.json({
    message: `${service} API key deleted successfully`,
  });
}));

export default router;

