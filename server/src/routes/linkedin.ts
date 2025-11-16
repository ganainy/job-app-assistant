// server/src/routes/linkedin.ts
import express, { Router } from 'express';
import { syncLinkedInProfile, getLinkedInProfile } from '../controllers/linkedinController';
import authMiddleware from '../middleware/authMiddleware';

const router: Router = express.Router();

// All LinkedIn routes require authentication
router.post('/sync', authMiddleware, syncLinkedInProfile);
router.get('/profile', authMiddleware, getLinkedInProfile);

export default router;

