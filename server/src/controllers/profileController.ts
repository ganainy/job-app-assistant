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
 * Get aggregated profile with integrated data from GitHub and LinkedIn
 * GET /api/profile/aggregated/:username
 */
export const getAggregatedProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const { username } = req.params;

    // Find user by username (we need to add username to User model or use email)
    // For now, let's assume we can find by email or we'll need to add username field
    // Let's check if username is actually an email
    const user = await User.findOne({
      $or: [{ email: username }, { username: username }],
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const profile = await Profile.findOne({ userId: user._id });

    if (!profile) {
      throw new NotFoundError('Profile not found');
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
    let linkedinData = null;
    const forceLinkedInRefresh = req.query.refreshLinkedIn === 'true';
    
    if (forceLinkedInRefresh && profile.socialLinks?.linkedin) {
      // Only fetch fresh LinkedIn data if explicitly requested
      try {
        const linkedinUrl = profile.socialLinks.linkedin;
        const linkedinUsername = getUsernameFromUrl(linkedinUrl);
        
        if (linkedinUsername) {
          const linkedinProfile = await fetchLinkedInProfile(linkedinUsername);
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
        // Note: experience and skills from LinkedIn are not currently saved
        // They would need to be added to the Profile model to be cached
      };
    }

    // Combine skills from saved projects
    const combinedSkills = {
      programmingLanguages: [...new Set([...githubSkills.programmingLanguages])],
      otherSkills: [...new Set([...githubSkills.otherSkills])],
    };

    // Ensure URLs are absolute
    const ensureFullUrl = (url: string | undefined): string | undefined => {
      if (!url) return url;
      if (url.startsWith('http')) return url;
      return `${req.protocol}://${req.get('host')}${url}`;
    };

    const aggregatedProfile = {
      ...profile.toObject(),
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

    const user = await User.findOne({
      $or: [{ email: username }, { username: username }],
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const profile = await Profile.findOne({ userId: user._id });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    res.status(200).json({
      status: 'success',
      data: {
        profile,
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
      profile = await Profile.create({ userId });
    }

    res.status(200).json({
      status: 'success',
      data: {
        profile,
        user: {
          email: req.user.email,
          id: req.user._id,
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

    // Update profile
    const updatedProfile = await Profile.findOneAndUpdate(
      { userId },
      filteredBody,
      {
        new: true,
        runValidators: true,
        upsert: true,
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        profile: updatedProfile,
      },
    });
  }
);

