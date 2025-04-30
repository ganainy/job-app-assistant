// Placeholder for Analysis API routes
import express from 'express';
import { analyzeCv, getAnalysisResults, deleteAnalysis, generateImprovement } from '../controllers/analysisController';
import protect from '../middleware/authMiddleware'; // Import default export and alias it as 'protect'

const router = express.Router();

// POST /api/analysis/analyze
router.post('/analyze', protect, analyzeCv);

// GET /api/analysis/:id
router.get('/:id', protect, getAnalysisResults);

// DELETE /api/analysis/:id
router.delete('/:id', protect, deleteAnalysis);

// POST /api/analysis/:id/improve/:section
router.post('/:id/improve/:section', protect, generateImprovement);

export default router;
