// Placeholder for Analysis API routes
import express from 'express';
import { analyzeCv, getAnalysisResults, deleteAnalysis } from '../controllers/analysisController';
// Correct the import for the default export
import protect from '../middleware/authMiddleware'; // Import default export and alias it as 'protect'

const router = express.Router();

// POST /api/analysis/analyze
router.post('/analyze', protect, analyzeCv);

// GET /api/analysis/:id
router.get('/:id', protect, getAnalysisResults);

// DELETE /api/analysis/:id
router.delete('/:id', protect, deleteAnalysis);

export default router;
