
import express, { Router, RequestHandler } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { getJobApplicationStats } from '../controllers/analyticsController';

const router: Router = express.Router();

router.get(
    '/job-applications',
    authMiddleware as RequestHandler,
    getJobApplicationStats
);

export default router;
