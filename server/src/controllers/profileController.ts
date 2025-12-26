// server/src/controllers/profileController.ts
import { Request, Response } from 'express';
import Profile from '../models/Profile';
import User from '../models/User';
import Project from '../models/Project';
import { getSkills } from './githubController';
import { getLinkedInProfile } from './linkedinController';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError, InternalServerError } from '../utils/errors/AppError';
import { getApiToken, fetchUserRepositories, extractSkillsFromRepos } from '../services/githubService';
import { getUsernameFromUrl, fetchLinkedInProfile, extractLinkedInData } from '../services/linkedinService';

/**
 * Helper to flatten an object for Mongoose dot notation updates
 * e.g. { integrations: { github: { ... } } } -> { 'integrations.github.accessToken': ... }
 */
const flattenObject = (obj: any, prefix = ''): any => {
  return Object.keys(obj).reduce((acc: any, k) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k]) && !(obj[k] instanceof Date)) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
};

/**
 * Validate GitHub token format
 */
const validateGitHubToken = (token: string | undefined): boolean => {
  if (!token) return true; // Empty token is valid (optional)
  // GitHub personal access tokens start with ghp_ (new) or gho_ (OAuth) or ghu_ (user-to-server)
  // Classic tokens can also start with ghp_
  return /^gh[po]_/.test(token) || token.length > 20; // Allow classic tokens too
};

/**
 * Sanitize profile to remove sensitive data
 * @param profile - The profile object to sanitize
 * @param includeTokens - If true, tokens are included (for own profile). If false, tokens are removed (for public endpoints)
 */
const sanitizeProfile = (profile: any, includeTokens: boolean = false): any => {
  const profileObj = profile.toObject ? profile.toObject() : profile;
  // Remove access tokens from response unless it's the user's own profile
  if (!includeTokens && profileObj.integrations) {
    if (profileObj.integrations.github && profileObj.integrations.github.accessToken) {
      profileObj.integrations.github.accessToken = undefined;
    }
    if (profileObj.integrations.linkedin && profileObj.integrations.linkedin.accessToken) {
      profileObj.integrations.linkedin.accessToken = undefined;
    }
  }
  return profileObj;
};

/**
 * Get all published profiles
 * GET /api/profile/published/all
 */
export const getPublishedProfiles = asyncHandler(
  async (req: Request, res: Response) => {
    // Find all published profiles
    // Populate userId to get username and email
    const profiles = await Profile.find({ isPublished: true })
      .populate('userId', 'username email')
      .select('name title bio profileImageUrl userId createdAt updatedAt');

    const publishedProfiles = profiles.map(profile => {
      // Safe access to userId fields since we populated it
      const user = profile.userId as any;
      return {
        _id: profile._id,
        name: profile.name,
        title: profile.title,
        bio: profile.bio,
        profileImageUrl: profile.profileImageUrl,
        username: user?.username,
        createdAt: profile.createdAt,
      };
    }).filter(p => p.username); // Filter out profiles where user might have been deleted

    res.status(200).json({
      status: 'success',
      data: publishedProfiles,
    });
  }
);

/**
 * Get aggregated profile with integrated data from GitHub and LinkedIn
 * GET /api/profile/aggregated/:username
 */
export const getAggregatedProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const { username } = req.params;

    // Find user by username only (no longer support email lookup)
    const user = await User.findOne({ username: username });

    if (!user) {
      throw new NotFoundError('User not found. Portfolio username may be incorrect.');
    }

    const profile = await Profile.findOne({ userId: user._id });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    // Check if portfolio is published
    if (!profile.isPublished) {
      throw new NotFoundError('Portfolio is not published');
    }

    // Extract skills from saved Projects instead of fetching from GitHub
    // This is much faster and uses already-synced data
    let githubSkills: { programmingLanguages: string[]; otherSkills: string[] } = {
      programmingLanguages: [],
      otherSkills: [],
    };

    try {
      // Get all projects for this user
      const projects = await Project.find({
        userId: user._id,
        isVisibleInPortfolio: true
      });

      // Extract unique technologies from projects
      const allTechnologies = new Set<string>();
      projects.forEach(project => {
        if (project.technologies && Array.isArray(project.technologies)) {
          project.technologies.forEach(tech => {
            if (tech && typeof tech === 'string') {
              allTechnologies.add(tech.trim());
            }
          });
        }
      });

      // Common programming languages to identify
      const programmingLanguages = [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust',
        'PHP', 'Ruby', 'Swift', 'Kotlin', 'Dart', 'Scala', 'R', 'MATLAB',
        'HTML', 'CSS', 'SQL', 'Shell', 'PowerShell'
      ];

      const techArray = Array.from(allTechnologies);
      githubSkills.programmingLanguages = techArray.filter(tech =>
        programmingLanguages.some(lang =>
          tech.toLowerCase().includes(lang.toLowerCase()) ||
          lang.toLowerCase().includes(tech.toLowerCase())
        )
      );
      githubSkills.otherSkills = techArray.filter(tech =>
        !githubSkills.programmingLanguages.includes(tech)
      );
    } catch (error: any) {
      console.warn('Failed to extract skills from projects:', error.message);
    }

    // Use saved profile data instead of fetching from LinkedIn
    // The profile already has name, title, bio, location from LinkedIn sync
    // Only fetch additional LinkedIn data if explicitly requested via query param
    let linkedinData: {
      name?: string;
      title?: string;
      bio?: string;
      location?: string;
      experience?: any[];
      skills?: string[];
      languages?: any[];
    } | null = null;
    const forceLinkedInRefresh = req.query.refreshLinkedIn === 'true';

    if (forceLinkedInRefresh && profile.socialLinks?.linkedin) {
      // Only fetch fresh LinkedIn data if explicitly requested
      try {
        const linkedinUrl = profile.socialLinks.linkedin;
        const linkedinUsername = getUsernameFromUrl(linkedinUrl);

        if (linkedinUsername) {
          const userId = String(user._id);
          const linkedinProfile = await fetchLinkedInProfile(userId, linkedinUsername);
          if (linkedinProfile) {
            linkedinData = extractLinkedInData(linkedinProfile);
          }
        }
      } catch (error: any) {
        console.warn('Failed to fetch LinkedIn profile:', error.message);
      }
    } else {
      // Use saved profile data - it already contains LinkedIn synced data
      linkedinData = {
        name: profile.name,
        title: profile.title,
        bio: profile.bio,
        location: profile.location,
        experience: profile.linkedInExperience || [],
        skills: profile.linkedInSkills || [],
        languages: profile.linkedInLanguages || [],
      };
    }

    // Filter LinkedIn data based on visibility settings
    const settings = profile.settings || {};
    if (linkedinData) {
      if (!settings.showLinkedInName) {
        linkedinData.name = undefined;
        linkedinData.title = undefined;
        linkedinData.bio = undefined;
      }
      if (!settings.showLinkedInExperience) {
        linkedinData.experience = undefined;
      }
      if (!settings.showLinkedInSkills) {
        linkedinData.skills = undefined;
      }
      if (!settings.showLinkedInLanguages) {
        linkedinData.languages = undefined;
      }
    }

    // Combine skills from saved projects
    const combinedSkills = {
      programmingLanguages: [...new Set([...githubSkills.programmingLanguages])],
      otherSkills: [...new Set([...githubSkills.otherSkills])],
    };

    // Ensure URLs are absolute
    const ensureFullUrl = (url: string | undefined): string | undefined => {
      if (!url) return url;
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      // Ensure the URL starts with a slash for proper path construction
      const path = url.startsWith('/') ? url : `/${url}`;
      return `${req.protocol}://${req.get('host')}${path}`;
    };

    // Sanitize profile to remove sensitive data
    const profileObj = sanitizeProfile(profile);

    const aggregatedProfile = {
      ...profileObj,
      skills: combinedSkills,
      linkedinData,
      profileImageUrl: ensureFullUrl(profile.profileImageUrl),
      cvViewUrl: ensureFullUrl(profile.cvViewUrl),
      cvDownloadUrl: ensureFullUrl(profile.cvDownloadUrl),
      user: {
        email: user.email,
        id: user._id,
      },
    };

    res.status(200).json({
      status: 'success',
      data: aggregatedProfile,
    });
  }
);

/**
 * Get profile by username
 * GET /api/profile/:username
 */
export const getProfileByUsername = asyncHandler(
  async (req: Request, res: Response) => {
    const { username } = req.params;

    // Find user by username only
    const user = await User.findOne({ username: username });

    if (!user) {
      throw new NotFoundError('User not found. Portfolio username may be incorrect.');
    }

    const profile = await Profile.findOne({ userId: user._id });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    // Sanitize profile to remove sensitive data
    const sanitizedProfile = sanitizeProfile(profile);

    res.status(200).json({
      status: 'success',
      data: {
        profile: sanitizedProfile,
        user: {
          email: user.email,
          id: user._id,
        },
      },
    });
  }
);

/**
 * Get current user's profile
 * GET /api/profile
 */
export const getCurrentUserProfile = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user || !req.user._id) {
      throw new InternalServerError('User not authenticated');
    }
    const userId = req.user._id;

    let profile = await Profile.findOne({ userId });

    if (!profile) {
      // Create profile if it doesn't exist
      profile = await Profile.create({
        userId,
        autoJobSettings: {
          keywords: '',
          location: '',
          jobType: [],
          experienceLevel: [],
          datePosted: 'any time',
          maxJobs: 100,
          avoidDuplicates: false
        }
      });
    }

    // Include tokens for own profile (user needs to see/edit their token)
    const sanitizedProfile = sanitizeProfile(profile, true);

    res.status(200).json({
      status: 'success',
      data: {
        profile: sanitizedProfile,
        user: {
          email: req.user.email,
          id: req.user._id,
          username: req.user.username,
        },
      },
    });
  }
);

/**
 * Update current user's profile
 * PUT /api/profile
 */
export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user || !req.user._id) {
      throw new InternalServerError('User not authenticated');
    }
    const userId = req.user._id;

    // Fields that should not be updated directly
    const restrictedFields = ['userId', 'createdAt', 'updatedAt'];

    // Filter out restricted fields
    const filteredBody = Object.keys(req.body).reduce((obj: any, key) => {
      if (!restrictedFields.includes(key)) {
        obj[key] = req.body[key];
      }
      return obj;
    }, {});

    // Validate GitHub token if provided
    if (filteredBody.integrations?.github?.accessToken) {
      const token = filteredBody.integrations.github.accessToken;
      if (token && !validateGitHubToken(token)) {
        throw new InternalServerError(
          'Invalid GitHub token format. GitHub personal access tokens should start with "ghp_" or be a valid token.'
        );
      }
    }

    // Convert to dot notation to ensure partial updates of nested fields
    // This prevents overwriting entire objects (e.g. integrations) when updating a single field
    const updateLocal = flattenObject(filteredBody);

    // Update profile
    const updatedProfile = await Profile.findOneAndUpdate(
      { userId },
      { $set: updateLocal },
      {
        new: true,
        runValidators: true,
        upsert: true,
      }
    );

    // Sanitize profile before sending response
    const sanitizedProfile = sanitizeProfile(updatedProfile);

    res.status(200).json({
      status: 'success',
      data: {
        profile: sanitizedProfile,
      },
    });
  }
);

