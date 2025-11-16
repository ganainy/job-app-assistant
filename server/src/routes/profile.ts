// server/src/routes/profile.ts
import express, { Router } from 'express';
import {
  getAggregatedProfile,
  getProfileByUsername,
  getCurrentUserProfile,
  updateProfile,
} from '../controllers/profileController';
import authMiddleware from '../middleware/authMiddleware';

const router: Router = express.Router();

// Public routes
router.get('/aggregated/:username', getAggregatedProfile);
router.get('/:username', getProfileByUsername);

// Protected routes
router.get('/', authMiddleware, getCurrentUserProfile);
router.put('/', authMiddleware, updateProfile);

export default router;

