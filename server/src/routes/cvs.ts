// server/src/routes/cvs.ts
/**
 * Unified CV Routes
 * 
 * Handles all CV operations using the unified CV model.
 * Replaces the old cv.ts routes that stored master CV in User model.
 */
import express, { Router, Request, Response, RequestHandler } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/authMiddleware';
import CV, { ICV } from '../models/CV';
import User from '../models/User';
import JobApplication from '../models/JobApplication';
import { generateContentWithFile } from '../utils/aiService';
import { GoogleGenerativeAIError } from '@google/generative-ai';
import { NotFoundError, ValidationError } from '../utils/errors/AppError';
import { JsonResumeSchema } from '../types/jsonresume';
import { generateCvPdfBuffer } from '../utils/pdfGenerator';
import { CVTemplate } from '../utils/cvTemplates';
import { asyncHandler } from '../utils/asyncHandler';
import fs from 'fs';
import path from 'path';

const router: Router = express.Router();

// Configure Multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/rtf', 'text/rtf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'text/plain'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Allowed types: PDF, RTF, DOCX, TXT.'));
        }
    }
});

// Apply auth middleware to all routes
router.use(authMiddleware as RequestHandler);

/**
 * Helper: Parse AI response to JSON Resume schema
 */
function parseJsonResponseToSchema(responseText: string): JsonResumeSchema | null {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const jsonMatch = responseText.match(jsonRegex);

    if (jsonMatch && jsonMatch[1]) {
        const extractedJsonString = jsonMatch[1].trim();
        try {
            const parsedObject = JSON.parse(extractedJsonString);
            if (typeof parsedObject === 'object' && parsedObject !== null) {
                return parsedObject as JsonResumeSchema;
            }
            throw new Error('AI response was not a valid object structure.');
        } catch (parseError: any) {
            console.error('JSON.parse failed:', parseError.message);
            throw new Error('AI response was not valid JSON.');
        }
    }
    throw new Error('AI failed to return CV data in the expected format.');
}

/**
 * GET /api/cvs
 * Get all CVs for the current user
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;

    const cvs = await CV.find({ userId })
        .populate('jobApplication', 'jobTitle companyName status')
        .sort({ isMasterCv: -1, createdAt: -1 });

    res.json({
        cvs: cvs.map(cv => ({
            _id: cv._id,
            isMasterCv: cv.isMasterCv,
            jobApplicationId: cv.jobApplicationId,
            jobApplication: (cv as any).jobApplication || null,
            cvJson: cv.cvJson,
            templateId: cv.templateId,
            filename: cv.filename,
            createdAt: cv.createdAt,
            updatedAt: cv.updatedAt,
        }))
    });
}));

/**
 * GET /api/cvs/master
 * Get the master CV for the current user
 */
router.get('/master', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id as string;

    const masterCv = await CV.getMasterCv(userId);

    if (!masterCv) {
        res.json({
            cv: null,
            message: 'No master CV found'
        });
        return;
    }

    // Get user's default template if CV doesn't have one
    const user = await User.findById(userId).select('selectedTemplate');
    const effectiveTemplate = masterCv.templateId || user?.selectedTemplate || 'modern-clean';

    res.json({
        cv: {
            _id: masterCv._id,
            isMasterCv: true,
            cvJson: masterCv.cvJson,
            templateId: effectiveTemplate,
            filename: masterCv.filename,
            analysisCache: masterCv.analysisCache,
            createdAt: masterCv.createdAt,
            updatedAt: masterCv.updatedAt,
        }
    });
}));

/**
 * GET /api/cvs/:id
 * Get a specific CV by ID
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const cvId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(cvId)) {
        throw new ValidationError('Invalid CV ID');
    }

    const cv = await CV.findOne({ _id: cvId, userId })
        .populate('jobApplication', 'jobTitle companyName status jobUrl');

    if (!cv) {
        throw new NotFoundError('CV not found');
    }

    // Get user's default template if CV doesn't have one
    const user = await User.findById(userId).select('selectedTemplate');
    const effectiveTemplate = cv.templateId || user?.selectedTemplate || 'modern-clean';

    res.json({
        cv: {
            _id: cv._id,
            isMasterCv: cv.isMasterCv,
            jobApplicationId: cv.jobApplicationId,
            jobApplication: (cv as any).jobApplication || null,
            cvJson: cv.cvJson,
            templateId: effectiveTemplate,
            filename: cv.filename,
            analysisCache: cv.analysisCache,
            createdAt: cv.createdAt,
            updatedAt: cv.updatedAt,
        }
    });
}));

/**
 * GET /api/cvs/job/:jobId
 * Get the CV for a specific job application
 */
router.get('/job/:jobId', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const jobId = req.params.jobId;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
        throw new ValidationError('Invalid job ID');
    }

    // Verify job belongs to user
    const job = await JobApplication.findOne({ _id: jobId, userId });
    if (!job) {
        throw new NotFoundError('Job application not found');
    }

    const cv = await CV.getJobCv(jobId);

    if (!cv) {
        res.json({
            cv: null,
            message: 'No CV found for this job'
        });
        return;
    }

    // Get user's default template if CV doesn't have one
    const user = await User.findById(userId).select('selectedTemplate');
    const effectiveTemplate = cv.templateId || user?.selectedTemplate || 'modern-clean';

    res.json({
        cv: {
            _id: cv._id,
            isMasterCv: cv.isMasterCv,
            jobApplicationId: cv.jobApplicationId,
            cvJson: cv.cvJson,
            templateId: effectiveTemplate,
            filename: cv.filename,
            createdAt: cv.createdAt,
            updatedAt: cv.updatedAt,
        }
    });
}));

/**
 * POST /api/cvs/upload
 * Upload and parse a new CV file (creates/replaces master CV)
 */
router.post(
    '/upload',
    upload.single('cvFile'),
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!._id;

        if (!req.file) {
            throw new ValidationError('No CV file uploaded.');
        }

        console.log(`Processing CV file: ${req.file.originalname}, MIME Type: ${req.file.mimetype}`);

        // Save file temporarily for AI processing
        const tempDir = path.join(process.cwd(), 'temp_uploads');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempFilePath = path.join(tempDir, `cv_${Date.now()}_${req.file.originalname}`);
        fs.writeFileSync(tempFilePath, req.file.buffer);

        try {
            const prompt = `
        Analyze the content of the attached CV file (${req.file.originalname}).
        Your task is to extract the information and structure it precisely according to the JSON Resume Schema (details at https://jsonresume.org/schema/).

        Instructions:
        - Parse the entire document.
        - Populate the standard JSON Resume fields: basics, work, education, skills, projects, languages, etc., based *only* on the content found in the file.
        - For 'basics.profiles', extract common profiles like LinkedIn, GitHub, Portfolio, etc.
        - For 'work.highlights' or 'work.description', use bullet points (array of strings for highlights) or a single description string. Prioritize 'highlights' if possible.
        - For 'skills', try to group them under relevant 'name' properties (e.g., "Programming Languages", "Frameworks", "Tools") with specific skills listed in 'keywords'. If grouping isn't clear, create a single skill entry with a general name and list all skills under its 'keywords'.
        - Format dates as YYYY-MM-DD, YYYY-MM, or YYYY where possible. Use "Present" for ongoing roles/studies.
        - If a standard section (like 'awards' or 'volunteer') is not present in the CV, omit that key entirely from the JSON output.
        - If a specific field within a section (like 'work.location') is not found, omit that field or set it to null.

        **CRITICAL: Do NOT include any comments (e.g., // or /* */) within the JSON output.**

        Output Format:
        Return ONLY a single, valid JSON object enclosed in triple backticks (\`\`\`json ... \`\`\`) that strictly adheres to the JSON Resume Schema structure. Do not include any explanatory text before or after the JSON block.
      `;

            console.log('Sending CV parsing request to AI...');
            const result = await generateContentWithFile(
                String(userId),
                prompt,
                tempFilePath,
                req.file.mimetype
            );
            const responseText = result.text;
            console.log('Received CV parsing response from AI.');

            const cvJsonResume = parseJsonResponseToSchema(responseText);

            if (!cvJsonResume) {
                throw new Error('Failed to parse AI response into valid JSON Resume structure.');
            }

            // Delete existing master CV (if any) and create new one
            await CV.deleteOne({ userId, isMasterCv: true });

            const newCv = await CV.create({
                userId,
                isMasterCv: true,
                cvJson: cvJsonResume,
                filename: req.file.originalname,
                templateId: null, // Will inherit from user settings
            });

            console.log(`Master CV created for user ${req.user!.email}`);

            res.status(200).json({
                message: 'CV uploaded and parsed successfully.',
                cv: {
                    _id: newCv._id,
                    isMasterCv: true,
                    cvJson: cvJsonResume,
                    filename: newCv.filename,
                    createdAt: newCv.createdAt,
                    updatedAt: newCv.updatedAt,
                }
            });
        } finally {
            // Clean up temp file
            try {
                fs.unlinkSync(tempFilePath);
            } catch (err) {
                console.error('Error deleting temp file:', err);
            }
        }
    })
);

/**
 * POST /api/cvs/job/:jobId
 * Create a job-specific CV (copies from master CV if no body provided)
 */
router.post('/job/:jobId', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const jobId = req.params.jobId;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
        throw new ValidationError('Invalid job ID');
    }

    // Verify job belongs to user
    const job = await JobApplication.findOne({ _id: jobId, userId });
    if (!job) {
        throw new NotFoundError('Job application not found');
    }

    // Check if CV already exists for this job
    const existingCv = await CV.getJobCv(jobId);
    if (existingCv) {
        throw new ValidationError('CV already exists for this job. Use PUT to update.');
    }

    // Get CV data from body or copy from master
    let cvJson: JsonResumeSchema;
    if (req.body.cvJson) {
        cvJson = req.body.cvJson;
    } else {
        // Copy from master CV
        const masterCv = await CV.getMasterCv(userId as string);
        if (!masterCv) {
            throw new ValidationError('No master CV found. Please upload a CV first.');
        }
        cvJson = JSON.parse(JSON.stringify(masterCv.cvJson)); // Deep copy
    }

    const newCv = await CV.create({
        userId,
        isMasterCv: false,
        jobApplicationId: new mongoose.Types.ObjectId(jobId),
        cvJson,
        templateId: req.body.templateId || null,
    });

    res.status(201).json({
        message: 'Job CV created successfully.',
        cv: {
            _id: newCv._id,
            isMasterCv: false,
            jobApplicationId: newCv.jobApplicationId,
            cvJson: newCv.cvJson,
            templateId: newCv.templateId,
            createdAt: newCv.createdAt,
            updatedAt: newCv.updatedAt,
        }
    });
}));

/**
 * PUT /api/cvs/:id
 * Update a CV by ID
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const cvId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(cvId)) {
        throw new ValidationError('Invalid CV ID');
    }

    const cv = await CV.findOne({ _id: cvId, userId });
    if (!cv) {
        throw new NotFoundError('CV not found');
    }

    const { cvJson, templateId } = req.body;

    if (cvJson) {
        if (typeof cvJson !== 'object' || !cvJson.basics) {
            throw new ValidationError('CV data must be a valid object with a basics section.');
        }
        cv.cvJson = cvJson;
        cv.analysisCache = null; // Invalidate cache when CV changes
    }

    if (templateId !== undefined) {
        cv.templateId = templateId;
    }

    await cv.save();

    console.log(`CV ${cvId} updated for user ${req.user!.email}`);

    res.json({
        message: 'CV updated successfully.',
        cv: {
            _id: cv._id,
            isMasterCv: cv.isMasterCv,
            jobApplicationId: cv.jobApplicationId,
            cvJson: cv.cvJson,
            templateId: cv.templateId,
            updatedAt: cv.updatedAt,
        }
    });
}));

/**
 * DELETE /api/cvs/:id
 * Delete a CV by ID
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const cvId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(cvId)) {
        throw new ValidationError('Invalid CV ID');
    }

    const cv = await CV.findOne({ _id: cvId, userId });
    if (!cv) {
        throw new NotFoundError('CV not found');
    }

    await CV.deleteOne({ _id: cvId });

    console.log(`CV ${cvId} deleted for user ${req.user!.email}`);

    res.json({
        message: cv.isMasterCv ? 'Master CV deleted successfully.' : 'Job CV deleted successfully.',
        deletedCvId: cvId,
    });
}));

/**
 * POST /api/cvs/:id/promote
 * Promote a job CV to become the master CV
 */
router.post('/:id/promote', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id as string;
    const cvId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(cvId)) {
        throw new ValidationError('Invalid CV ID');
    }

    const promotedCv = await CV.promoteToMaster(cvId, userId);

    console.log(`CV ${cvId} promoted to master for user ${req.user!.email}`);

    res.json({
        message: 'CV promoted to master successfully.',
        cv: {
            _id: promotedCv._id,
            isMasterCv: true,
            cvJson: promotedCv.cvJson,
            templateId: promotedCv.templateId,
            updatedAt: promotedCv.updatedAt,
        }
    });
}));

/**
 * POST /api/cvs/:id/preview
 * Generate PDF preview for a CV
 */
router.post('/:id/preview', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const cvId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(cvId)) {
        throw new ValidationError('Invalid CV ID');
    }

    const cv = await CV.findOne({ _id: cvId, userId });
    if (!cv) {
        throw new NotFoundError('CV not found');
    }

    // Get effective template
    const user = await User.findById(userId).select('selectedTemplate');
    const template = req.body.template || cv.templateId || user?.selectedTemplate || 'modern-clean';

    const pdfBuffer = await generateCvPdfBuffer(
        cv.cvJson as JsonResumeSchema,
        template as CVTemplate
    );

    const base64Pdf = pdfBuffer.toString('base64');

    res.json({
        message: 'CV preview generated successfully.',
        pdfBase64: base64Pdf
    });
}));

/**
 * POST /api/cvs/preview
 * Generate PDF preview from provided CV data (without saving)
 */
router.post('/preview', asyncHandler(async (req: Request, res: Response) => {
    const { cvData, template } = req.body;

    if (!cvData || typeof cvData !== 'object') {
        throw new ValidationError('CV data is required in the request body.');
    }

    const pdfBuffer = await generateCvPdfBuffer(
        cvData as JsonResumeSchema,
        (template as CVTemplate) || CVTemplate.HARVARD
    );

    const base64Pdf = pdfBuffer.toString('base64');

    res.json({
        message: 'CV preview generated successfully.',
        pdfBase64: base64Pdf
    });
}));

export default router;
