// server/src/services/linkedinService.ts
import Profile from '../models/Profile';
import { InternalServerError } from '../utils/errors/AppError';
import { getApifyToken } from '../utils/apiKeyHelpers';

interface LinkedInProfileData {
  basic_info?: {
    fullname?: string;
    headline?: string;
    about?: string;
    location?: {
      full?: string;
      city?: string;
      country?: string;
    };
    profile_picture_url?: string;
    profileImageUrl?: string;
    profilePicture?: string;
    image?: string;
    photo?: string;
    profile_image?: string;
  };
  profile_picture_url?: string;
  profileImageUrl?: string;
  profilePicture?: string;
  image?: string;
  photo?: string;
  profile_image?: string;
  summary?: string;
  bio?: string;
  description?: string;
  experience?: Array<{
    title?: string;
    company?: string;
    description?: string;
    location?: string;
    start_date?: {
      year?: number;
      month?: string;
    };
    end_date?: {
      year?: number;
      month?: string;
    };
    is_current?: boolean;
    skills?: string[];
  }>;
  skills?: Array<string | { name?: string; title?: string }>;
  languages?: Array<{
    language?: string;
    proficiency?: string;
  }>;
}

/**
 * Extract username from LinkedIn URL
 */
export const getUsernameFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const parts = path.split('/').filter((part) => part.length > 0);
    if (parts[0] === 'in' && parts[1]) {
      return parts[1];
    }
  } catch (e) {
    console.error('[LinkedIn API] Invalid LinkedIn URL:', url);
    return null;
  }
  return null;
};

/**
 * Fetch LinkedIn profile using Apify API
 * @param userId - User ID (required to get their Apify token)
 * @param username - LinkedIn username
 */
export const fetchLinkedInProfile = async (userId: string, username: string): Promise<LinkedInProfileData | null> => {
  const apiToken = await getApifyToken(userId);

  const apiUrl = `https://api.apify.com/v2/acts/apimaestro~linkedin-profile-detail/run-sync-get-dataset-items?token=${apiToken}`;
  const requestBody = { username, includeEmail: true };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new InternalServerError(
      `Apify actor start failed: ${response.status} ${response.statusText} - Response Body: ${errorText}`
    );
  }

  const runData = await response.json();

  if (!Array.isArray(runData) || runData.length === 0) {
    return null;
  }

  return runData[0] as LinkedInProfileData;
};

/**
 * Update user profile with LinkedIn data
 */
export const updateProfileFromLinkedInData = async (
  userId: string,
  linkedinData: LinkedInProfileData,
  forceUpdate: boolean = false
): Promise<void> => {
  try {
    console.log(
      `[LinkedIn API] Updating profile for user ${userId} with LinkedIn data${forceUpdate ? ' (force update)' : ''}`
    );

    // Get current profile
    const profile = await Profile.findOne({ userId });
    if (!profile) {
      console.warn(`[LinkedIn API] Profile not found for user ${userId}`);
      return;
    }

    const updates: Partial<typeof profile> = {};

    // Update basic profile fields if they're empty or if force update is enabled
    if (linkedinData.basic_info?.fullname && (!profile.name || forceUpdate)) {
      updates.name = linkedinData.basic_info.fullname;
    }

    if (linkedinData.basic_info?.headline && (!profile.title || forceUpdate)) {
      updates.title = linkedinData.basic_info.headline;
    }

    // Use about/bio in order of preference
    const bioText =
      linkedinData.basic_info?.about ||
      linkedinData.summary ||
      linkedinData.bio ||
      linkedinData.description;
    if (bioText && (!profile.bio || forceUpdate)) {
      updates.bio = bioText;
    }

    if (linkedinData.basic_info?.location && (!profile.location || forceUpdate)) {
      // Use the full location string if available, otherwise construct from city/country
      const location =
        linkedinData.basic_info.location.full ||
        linkedinData.basic_info.location.city ||
        `${linkedinData.basic_info.location.city}, ${linkedinData.basic_info.location.country}`;
      updates.location = location;
    }

    // Extract profile image from various possible field names
    const profileImageUrl =
      linkedinData.basic_info?.profile_picture_url ||
      linkedinData.basic_info?.profileImageUrl ||
      linkedinData.basic_info?.profilePicture ||
      linkedinData.basic_info?.image ||
      linkedinData.basic_info?.photo ||
      linkedinData.basic_info?.profile_image ||
      linkedinData.profile_picture_url ||
      linkedinData.profileImageUrl ||
      linkedinData.profilePicture ||
      linkedinData.image ||
      linkedinData.photo ||
      linkedinData.profile_image;

    if (profileImageUrl && (!profile.profileImageUrl || forceUpdate)) {
      updates.profileImageUrl = profileImageUrl;
    }

    // Update LinkedIn experience, skills, and languages
    if (linkedinData.experience && (forceUpdate || !profile.linkedInExperience || profile.linkedInExperience.length === 0)) {
      updates.linkedInExperience = linkedinData.experience.map((exp) => ({
        title: exp.title,
        company: exp.company,
        description: exp.description,
        location: exp.location,
        startDate: exp.start_date ? { year: exp.start_date.year, month: exp.start_date.month } : undefined,
        endDate: exp.end_date ? { year: exp.end_date.year, month: exp.end_date.month } : undefined,
        isCurrent: exp.is_current,
      }));
    }

    if (linkedinData.skills && (forceUpdate || !profile.linkedInSkills || profile.linkedInSkills.length === 0)) {
      updates.linkedInSkills = linkedinData.skills.map((skill) =>
        typeof skill === 'string' ? skill : skill.name || skill.title || ''
      ).filter(Boolean);
    }

    if (linkedinData.languages && (forceUpdate || !profile.linkedInLanguages || profile.linkedInLanguages.length === 0)) {
      updates.linkedInLanguages = linkedinData.languages.map((lang) => ({
        language: lang.language,
        proficiency: lang.proficiency,
      }));
    }

    // Update profile if we have changes
    if (Object.keys(updates).length > 0) {
      await Profile.findOneAndUpdate({ userId }, { $set: updates }, { new: true });
      console.log(`[LinkedIn API] Updated profile fields: ${Object.keys(updates).join(', ')}`);
    }

    console.log(`[LinkedIn API] Successfully updated profile for user ${userId} with LinkedIn data`);
  } catch (error: any) {
    console.error(`[LinkedIn API] Error updating profile from LinkedIn data: ${error.message}`);
    // Don't throw - we don't want to fail the sync if profile update fails
  }
};

/**
 * Extract relevant data from LinkedIn profile
 */
export const extractLinkedInData = (profileData: LinkedInProfileData): {
  name?: string;
  title?: string;
  bio?: string;
  location?: string;
  profileImageUrl?: string;
  experience?: any[];
  skills?: string[];
  languages?: any[];
} => {
  // Extract profile image from various possible field names
  const profileImageUrl =
    profileData.basic_info?.profile_picture_url ||
    profileData.basic_info?.profileImageUrl ||
    profileData.basic_info?.profilePicture ||
    profileData.basic_info?.image ||
    profileData.basic_info?.photo ||
    profileData.basic_info?.profile_image ||
    profileData.profile_picture_url ||
    profileData.profileImageUrl ||
    profileData.profilePicture ||
    profileData.image ||
    profileData.photo ||
    profileData.profile_image;

  return {
    name: profileData.basic_info?.fullname,
    title: profileData.basic_info?.headline,
    bio:
      profileData.basic_info?.about ||
      profileData.summary ||
      profileData.bio ||
      profileData.description,
    location: profileData.basic_info?.location?.full || profileData.basic_info?.location?.city,
    profileImageUrl,
    experience: profileData.experience || [],
    skills: profileData.skills?.map((skill) =>
      typeof skill === 'string' ? skill : skill.name || skill.title || ''
    ) || [],
    languages: profileData.languages || [],
  };
};

