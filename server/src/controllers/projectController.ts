// server/src/controllers/projectController.ts
import { Request, Response } from 'express';
import Project from '../models/Project';
import User from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError, InternalServerError } from '../utils/errors/AppError';
import { getApiToken, fetchUserRepositories, transformGitHubRepoToProject } from '../services/githubService';

/**
 * Get projects by username
 * GET /api/projects/:username
 */
export const getProjectsByUsername = asyncHandler(
  async (req: Request, res: Response) => {
    const { username } = req.params;

    const user = await User.findOne({
      $or: [{ email: username }, { username: username }],
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const projects = await Project.find({
      userId: user._id,
      isVisibleInPortfolio: true,
    }).sort({ order: 1, createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: projects,
    });
  }
);

/**
 * Import projects from GitHub
 * POST /api/projects/import-github
 */
export const importGitHubProjects = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user || !req.user._id) {
      throw new InternalServerError('User not authenticated');
    }
    const userId = req.user._id;

    const { githubUsername } = req.body;

    if (!githubUsername) {
      throw new InternalServerError('GitHub username is required');
    }

    try {
      const token = await getApiToken(userId.toString());
      if (!token) {
        throw new InternalServerError(
          'GitHub API token is required. Please configure GITHUB_TOKEN in environment variables or add your token in profile settings.'
        );
      }

      const repos = await fetchUserRepositories(githubUsername, token);

      // Transform repos to projects
      const projectPromises = repos.map((repo) =>
        transformGitHubRepoToProject(repo, token)
      );
      const transformedProjects = (await Promise.all(projectPromises)).filter(
        (p) => p !== null
      );

      // Save projects to database
      const savedProjects = [];
      for (const projectData of transformedProjects) {
        // Check if project already exists
        const existingProject = await Project.findOne({
          userId,
          githubUrl: projectData.repoUrl,
        });

        if (!existingProject) {
          const project = await Project.create({
            userId,
            title: projectData.title,
            description: projectData.description,
            technologies: projectData.technologies,
            githubUrl: projectData.repoUrl,
            projectUrl: projectData.liveUrl,
            videoUrl: projectData.videoUrl || undefined,
            sourceType: 'github',
            isImported: true,
            isVisibleInPortfolio: true,
          });
          savedProjects.push(project);
        }
      }

      res.status(200).json({
        status: 'success',
        message: `Imported ${savedProjects.length} projects from GitHub`,
        data: savedProjects,
      });
    } catch (error: any) {
      throw new InternalServerError(
        error.message || 'Failed to import projects from GitHub'
      );
    }
  }
);

/**
 * Get current user's projects
 * GET /api/projects
 */
export const getCurrentUserProjects = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user || !req.user._id) {
      throw new InternalServerError('User not authenticated');
    }
    const userId = req.user._id;

    const projects = await Project.find({ userId }).sort({
      order: 1,
      createdAt: -1,
    });

    res.status(200).json({
      status: 'success',
      data: projects,
    });
  }
);

/**
 * Create a new project
 * POST /api/projects
 */
export const createProject = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user._id) {
    throw new InternalServerError('User not authenticated');
  }
  const userId = req.user._id;

  const project = await Project.create({
    userId,
    ...req.body,
  });

  res.status(201).json({
    status: 'success',
    data: project,
  });
});

/**
 * Update a project
 * PUT /api/projects/:id
 */
export const updateProject = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!req.user || !req.user._id) {
      throw new InternalServerError('User not authenticated');
    }
    const userId = req.user._id;

    const project = await Project.findOneAndUpdate(
      { _id: id, userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    res.status(200).json({
      status: 'success',
      data: project,
    });
  }
);

/**
 * Delete a project
 * DELETE /api/projects/:id
 */
export const deleteProject = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!req.user || !req.user._id) {
      throw new InternalServerError('User not authenticated');
    }
    const userId = req.user._id;

    const project = await Project.findOneAndDelete({ _id: id, userId });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    res.status(200).json({
      status: 'success',
      message: 'Project deleted successfully',
    });
  }
);

