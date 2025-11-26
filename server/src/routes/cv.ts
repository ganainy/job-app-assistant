import express, { Router, Request, Response, RequestHandler } from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/authMiddleware';
import User from '../models/User';
import { getGeminiModel } from '../utils/geminiClient';
import { GoogleGenerativeAIError } from '@google/generative-ai';
import { getGeminiApiKey } from '../utils/apiKeyHelpers';
import { NotFoundError } from '../utils/errors/AppError';
import { JsonResumeSchema } from '../types/jsonresume';
import { generateCvPdfBuffer } from '../utils/pdfGenerator';
import { CVTemplate } from '../utils/cvTemplates';

const router: Router = express.Router();

// Configure Multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
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

// --- Helper Function to Parse Gemini Response ---
function parseJsonResponseToSchema(responseText: string, schemaType: 'JsonResume'): JsonResumeSchema | null {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const jsonMatch = responseText.match(jsonRegex);

    if (jsonMatch && jsonMatch[1]) {
        const extractedJsonString = jsonMatch[1].trim();
        console.log(`Attempting to parse JSON for ${schemaType} schema...`);
        try {
            const parsedObject = JSON.parse(extractedJsonString);
            if (typeof parsedObject === 'object' && parsedObject !== null) {
                console.log(`${schemaType} schema parsed successfully (basic check).`);
                return parsedObject as JsonResumeSchema;
            } else {
                console.error(`Parsed JSON is not a valid object for ${schemaType}. Parsed:`, parsedObject);
                throw new Error(`AI response was not a valid object structure for ${schemaType}.`);
            }
        } catch (parseError: any) {
            console.error(`JSON.parse failed on extracted ${schemaType} content:`, parseError.message);
            console.error("Extracted Content causing failure:\n---\n", extractedJsonString, "\n---");
            throw new Error(`AI response was not valid JSON for ${schemaType}.`);
        }
    } else {
        console.warn(`Gemini response did not contain expected \`\`\`json formatting for ${schemaType}.`);
    }
    console.error(`Could not parse valid ${schemaType} JSON from Gemini response. Raw response:\n---\n`, responseText, "\n---");
    throw new Error(`AI failed to return the ${schemaType} data in the expected format.`);
}

// --- POST /api/cv/upload ---
router.post(
    '/upload',
    authMiddleware as RequestHandler,
    upload.single('cvFile'),
    async (req: Request, res: Response) => {
        if (!req.user) {
            res.status(401).json({ message: 'User not authenticated correctly.' });
            return;
        }
        if (!req.file) {
            res.status(400).json({ message: 'No CV file uploaded.' });
            return;
        }

        try {
            console.log(`Processing CV file: ${req.file.originalname}, MIME Type: ${req.file.mimetype}`);

            const fileDataPart = {
                inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype }
            };

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

            const userId = String(req.user._id);
            const apiKey = await getGeminiApiKey(userId);
            const model = getGeminiModel(apiKey);

            console.log("Sending CV parsing request to Gemini...");
            const result = await model.generateContent([prompt, fileDataPart]);
            const response = result.response;
            const responseText = response.text();
            console.log("Received CV parsing response from Gemini.");

            const cvJsonResume = parseJsonResponseToSchema(responseText, 'JsonResume');

            if (!cvJsonResume) {
                throw new Error("Failed to parse Gemini response into valid JSON Resume structure.");
            }

            const updatedUser = await User.findByIdAndUpdate(
                req.user._id,
                {
                    $set: { cvJson: cvJsonResume },
                    $unset: { cvAnalysisCache: "" }
                },
                { new: true }
            ).select('-passwordHash -cvJson');

            if (!updatedUser) { res.status(404).json({ message: "User not found after update." }); return; }

            console.log(`JSON Resume CV data saved for user ${req.user.email}`);
            res.status(200).json({
                message: 'CV uploaded and parsed successfully (JSON Resume format).',
                cvData: cvJsonResume
            });

        } catch (error: any) {
            console.error("CV Upload/Parsing Error:", error);

            if (error instanceof NotFoundError || (error?.statusCode === 404 && error?.isOperational)) {
                res.status(404).json({ message: error.message });
                return;
            }

            if (error instanceof Error && error.message.includes("Invalid file type")) {
                res.status(400).json({ message: error.message });
                return;
            }
            if (error instanceof Error && error.message.includes("AI failed")) {
                res.status(500).json({ message: error.message });
                return;
            }
            if (error instanceof GoogleGenerativeAIError || (error.response && error.response.promptFeedback)) {
                const blockReason = error.response?.promptFeedback?.blockReason;
                res.status(400).json({ message: `Content processing blocked by AI: ${blockReason || 'Unknown reason'}` });
                return;
            }

            res.status(500).json({
                message: error?.message || 'Failed to process CV. Unknown server error'
            });
        }
    }
);

// Optional: GET route to retrieve the user's current CV JSON
router.get('/', authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ message: 'User not authenticated correctly.' });
        return;
    }
    try {
        const user = await User.findById(req.user._id).select('cvJson cvAnalysisCache selectedTemplate');
        res.status(200).json({
            cvData: user?.cvJson || null,
            analysisCache: user?.cvAnalysisCache || null,
            selectedTemplate: user?.selectedTemplate || 'modern-clean'
        });
    } catch (error) {
        console.error("Error fetching CV data:", error);
        res.status(500).json({ message: 'Failed to retrieve CV data.' });
    }
});

// PUT route to update the user's CV JSON
router.put('/', authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ message: 'User not authenticated correctly.' });
        return;
    }

    try {
        const { cvData, selectedTemplate } = req.body;

        if (!cvData || typeof cvData !== 'object') {
            res.status(400).json({ message: 'CV data is required in the request body.' });
            return;
        }

        if (!cvData.basics) {
            res.status(400).json({ message: 'CV data must include a basics section.' });
            return;
        }

        const updateData: any = {
            $set: { cvJson: cvData as JsonResumeSchema },
            $unset: { cvAnalysisCache: "" }
        };

        // Update selectedTemplate if provided
        if (selectedTemplate && typeof selectedTemplate === 'string') {
            updateData.$set.selectedTemplate = selectedTemplate;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true }
        ).select('-passwordHash -cvJson');

        if (!updatedUser) {
            res.status(404).json({ message: "User not found after update." });
            return;
        }

        console.log(`CV data updated for user ${req.user.email}`);
        res.status(200).json({
            message: 'CV updated successfully.',
            cvData: cvData
        });
    } catch (error: any) {
        console.error("Error updating CV data:", error);
        res.status(500).json({
            message: 'Failed to update CV data.',
            error: error.message || 'Unknown server error'
        });
    }
});

// DELETE route to delete the user's CV
router.delete('/', authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ message: 'User not authenticated correctly.' });
        return;
    }
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $unset: { cvJson: "" } },
            { new: true }
        ).select('-passwordHash -cvJson');

        if (!updatedUser) {
            res.status(404).json({ message: "User not found." });
            return;
        }

        console.log(`CV data deleted for user ${req.user.email}`);
        res.status(200).json({ message: 'CV deleted successfully.' });
    } catch (error) {
        console.error("Error deleting CV data:", error);
        res.status(500).json({ message: 'Failed to delete CV data.' });
    }
});

// POST route to generate CV preview
router.post('/preview', authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ message: 'User not authenticated correctly.' });
        return;
    }

    try {
        const { cvData, template } = req.body;

        if (!cvData || typeof cvData !== 'object') {
            res.status(400).json({ message: 'CV data is required in the request body.' });
            return;
        }

        // Generate PDF buffer
        const pdfBuffer = await generateCvPdfBuffer(
            cvData as JsonResumeSchema,
            (template as CVTemplate) || CVTemplate.HARVARD
        );

        // Convert buffer to base64 string
        const base64Pdf = pdfBuffer.toString('base64');

        res.status(200).json({
            message: 'CV preview generated successfully.',
            pdfBase64: base64Pdf
        });
    } catch (error: any) {
        console.error("Error generating CV preview:", error);
        res.status(500).json({
            message: 'Failed to generate CV preview.',
            error: error.message || 'Unknown server error'
        });
    }
});

export default router;