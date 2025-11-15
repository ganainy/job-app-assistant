import express, { Router } from 'express';
import { analyzeCv, getAnalysisResults, generateImprovement, deleteAnalysis } from '../controllers/analysisController';
import authMiddleware from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router: Router = express.Router();

// Protect all routes with authentication
router.use(authMiddleware);

// Analysis routes - wrapped with asyncHandler to automatically catch errors
router.post('/analyze', asyncHandler(analyzeCv));
router.get('/:id', asyncHandler(getAnalysisResults));
router.post('/:id/improve/:section', asyncHandler(generateImprovement));
router.delete('/:id', asyncHandler(deleteAnalysis));

export default router;
