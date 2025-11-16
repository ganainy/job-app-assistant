import express, { Router } from 'express';
import { analyzeCv, getAnalysisResults, generateImprovement, deleteAnalysis, analyzeCvSection, analyzeAllCvSections } from '../controllers/analysisController';
import authMiddleware from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validateRequest';
import { analyzeCvBodySchema, improveSectionParamsSchema, improveSectionBodySchema, analyzeCvSectionBodySchema, analyzeAllCvSectionsBodySchema } from '../validations/analysisSchemas';
import { analysisIdParamSchema } from '../validations/commonSchemas';

const router: Router = express.Router();

// Protect all routes with authentication
router.use(authMiddleware);

// Analysis routes - wrapped with asyncHandler to automatically catch errors
router.post('/analyze', validateRequest({ body: analyzeCvBodySchema }), asyncHandler(analyzeCv));
router.post('/analyze-all-sections', validateRequest({ body: analyzeAllCvSectionsBodySchema }), asyncHandler(analyzeAllCvSections));
router.post('/cv-section', validateRequest({ body: analyzeCvSectionBodySchema }), asyncHandler(analyzeCvSection));
router.get('/:id', validateRequest({ params: analysisIdParamSchema }), asyncHandler(getAnalysisResults));
router.post('/:id/improve/:section', validateRequest({ params: improveSectionParamsSchema, body: improveSectionBodySchema }), asyncHandler(generateImprovement));
router.delete('/:id', validateRequest({ params: analysisIdParamSchema }), asyncHandler(deleteAnalysis));

export default router;
