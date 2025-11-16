// server/src/routes/github.ts
import express, { Router } from 'express';
import { getGithubRepos, getSkills, transformRepo } from '../controllers/githubController';
import authMiddleware from '../middleware/authMiddleware';

const router: Router = express.Router();

// Public routes (no auth required for viewing public GitHub data)
router.get('/repos/:username', getGithubRepos);
router.get('/skills/:username', getSkills);

// Protected routes (auth required for transforming repos)
router.post('/transform-repo', authMiddleware, transformRepo);

export default router;

