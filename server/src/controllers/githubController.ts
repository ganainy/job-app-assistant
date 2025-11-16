// server/src/controllers/githubController.ts
import { Request, Response } from 'express';
import {
  getApiToken,
  fetchUserRepositories,
  extractSkillsFromRepos,
  transformGitHubRepoToProject,
} from '../services/githubService';
import { asyncHandler } from '../utils/asyncHandler';
import { InternalServerError } from '../utils/errors/AppError';

/**
 * Get GitHub repositories for a user
 * GET /api/github/repos/:username
 */
export const getGithubRepos = asyncHandler(
  async (req: Request, res: Response) => {
    const { username } = req.params;
    const userId = (req as any).user?._id?.toString();

    try {
      const token = await getApiToken(userId);
      // Token is optional - public repos work without token (60 requests/hour limit)
      const repos = await fetchUserRepositories(username, token);

      res.status(200).json({
        status: 'success',
        data: repos,
      });
    } catch (error: any) {
      throw new InternalServerError(
        error.message || 'Failed to fetch GitHub repositories'
      );
    }
  }
);

/**
 * Extract skills from GitHub repositories
 * GET /api/github/skills/:username
 */
export const getSkills = asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.params;
  const userId = (req as any).user?._id?.toString();

  try {
    const token = await getApiToken(userId);
    // Token is optional - public repos work without token (60 requests/hour limit)
    const repos = await fetchUserRepositories(username, token);
    const skills = extractSkillsFromRepos(repos);

    res.status(200).json({
      status: 'success',
      data: skills,
    });
  } catch (error: any) {
    throw new InternalServerError(
      error.message || 'Failed to extract skills from GitHub repositories'
    );
  }
});

/**
 * Transform a GitHub repository to a project
 * POST /api/github/transform-repo
 */
export const transformRepo = asyncHandler(
  async (req: Request, res: Response) => {
    const { repo } = req.body;
    const userId = (req as any).user?._id?.toString();

    if (!repo) {
      throw new InternalServerError('Repo data is required in the request body.');
    }

    try {
      const token = await getApiToken(userId);
      // Token is optional - public repos work without token (60 requests/hour limit)
      const transformedProject = await transformGitHubRepoToProject(repo, token);

      if (!transformedProject) {
        throw new InternalServerError(
          'Repository cannot be transformed, likely because it is a private repository or a fork.'
        );
      }

      res.status(200).json({
        status: 'success',
        data: transformedProject,
      });
    } catch (error: any) {
      throw new InternalServerError(
        error.message || 'Failed to transform GitHub repository'
      );
    }
  }
);

