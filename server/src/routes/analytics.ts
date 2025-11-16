import express, { Router, RequestHandler } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { getJobApplicationStats } from '../controllers/analyticsController';

const router: Router = express.Router();

// All routes in this file require authentication
router.use(authMiddleware as RequestHandler);

// GET /api/analytics/job-applications - Get job application statistics
router.get('/job-applications', getJobApplicationStats as RequestHandler);

export default router;
