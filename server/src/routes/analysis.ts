import express, { Router } from 'express';
import { analyzeCv, getAnalysisResults, generateImprovement, deleteAnalysis } from '../controllers/analysisController';
import authMiddleware from '../middleware/authMiddleware';

const router: Router = express.Router();

// Protect all routes with authentication
router.use(authMiddleware);

// Analysis routes
router.post('/analyze', analyzeCv as express.RequestHandler);
router.get('/:id', getAnalysisResults as express.RequestHandler);
router.post('/:id/improve/:section', generateImprovement as express.RequestHandler);
router.delete('/:id', deleteAnalysis as express.RequestHandler);

export default router;
