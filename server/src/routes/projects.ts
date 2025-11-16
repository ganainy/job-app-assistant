// server/src/routes/projects.ts
import express, { Router } from 'express';
import {
  getProjectsByUsername,
  importGitHubProjects,
  getCurrentUserProjects,
  createProject,
  updateProject,
  updateProjectOrders,
  deleteProject,
} from '../controllers/projectController';
import authMiddleware from '../middleware/authMiddleware';

const router: Router = express.Router();

// Public routes
router.get('/:username', getProjectsByUsername);

// Protected routes
router.get('/', authMiddleware, getCurrentUserProjects);
router.post('/', authMiddleware, createProject);
router.post('/import-github', authMiddleware, importGitHubProjects);
router.put('/reorder', authMiddleware, updateProjectOrders);
router.put('/:id', authMiddleware, updateProject);
router.delete('/:id', authMiddleware, deleteProject);

export default router;

