// server/src/controllers/linkedinController.ts
import { Request, Response } from 'express';
import {
  getUsernameFromUrl,
  fetchLinkedInProfile,
  updateProfileFromLinkedInData,
  extractLinkedInData,
} from '../services/linkedinService';
import Profile from '../models/Profile';
import { asyncHandler } from '../utils/asyncHandler';
import { InternalServerError, NotFoundError } from '../utils/errors/AppError';

/**
 * Sync LinkedIn profile
 * POST /api/linkedin/sync
 */
export const syncLinkedInProfile = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user || !req.user._id) {
      throw new InternalServerError('User not authenticated');
    }
    const userId = req.user._id.toString();

    // Get user's profile to find LinkedIn URL
    const profile = await Profile.findOne({ userId });
    if (!profile || !profile.socialLinks?.linkedin) {
      throw new NotFoundError(
        'No LinkedIn URL found for this user. Please save your LinkedIn URL in profile settings first.'
      );
    }

    const linkedinUrl = profile.socialLinks.linkedin;
    const username = getUsernameFromUrl(linkedinUrl);

    if (!username) {
      throw new InternalServerError(
        'Invalid LinkedIn URL format. Could not extract username from URL.'
      );
    }

    console.log(`[LinkedIn API] Processing LinkedIn profile for username: ${username}`);

    // Check for force refresh parameter
    const forceRefresh = req.query.refresh === 'true';
    const forceUpdate = req.query.force === 'true' || req.query.overwrite === 'true' || true;

    if (forceRefresh) {
      console.log(`[LinkedIn API] Force refresh requested for ${username}, skipping cache.`);
    }

    // Fetch LinkedIn profile
    const profileData = await fetchLinkedInProfile(username);

    if (!profileData) {
      throw new NotFoundError('No LinkedIn profile data returned from Apify');
    }

    // Update the user's profile with the fresh LinkedIn data
    await updateProfileFromLinkedInData(userId, profileData, forceUpdate);

    // Extract and return relevant data
    const extractedData = extractLinkedInData(profileData);

    res.status(200).json({
      status: 'success',
      message: 'LinkedIn profile synced successfully',
      data: extractedData,
    });
  }
);

/**
 * Get LinkedIn profile data for a user
 * GET /api/linkedin/profile
 */
export const getLinkedInProfile = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user || !req.user._id) {
      throw new InternalServerError('User not authenticated');
    }
    const userId = req.user._id.toString();

    const profile = await Profile.findOne({ userId });

    if (!profile || !profile.socialLinks?.linkedin) {
      throw new NotFoundError(
        'LinkedIn profile not found. No LinkedIn URL is set for this user.'
      );
    }

    const linkedinUrl = profile.socialLinks.linkedin;
    const username = getUsernameFromUrl(linkedinUrl);

    if (!username) {
      throw new InternalServerError('Invalid LinkedIn URL format.');
    }

    // For now, we'll fetch fresh data. In the future, we can add caching.
    try {
      const profileData = await fetchLinkedInProfile(username);
      if (!profileData) {
        throw new NotFoundError('No LinkedIn profile data found');
      }

      const extractedData = extractLinkedInData(profileData);

      res.status(200).json({
        status: 'success',
        data: extractedData,
      });
    } catch (error: any) {
      throw new InternalServerError(
        error.message || 'Failed to fetch LinkedIn profile data'
      );
    }
  }
);

