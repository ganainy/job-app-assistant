// server/src/routes/generator.ts
import express, { Router, Request, Response, RequestHandler } from 'express';
import * as fsPromises from 'fs/promises'; // For async file operations like access, unlink
import * as fs from 'fs'; // For stream operations like createReadStream
import * as path from 'path'; // For path manipulation
import authMiddleware from '../middleware/authMiddleware';
import JobApplication from '../models/JobApplication'; // Potentially needed for context/logging
import User from '../models/User'; // Potentially needed for context/logging
import geminiModel from '../utils/geminiClient'; // Needed for initial generation
import { GoogleGenerativeAIError } from '@google/generative-ai';
import { generateCvPdfFromJsonResume, generateCoverLetterPdf } from '../utils/pdfGenerator'; // PDF utilities
import { JsonResumeSchema, JsonResumeWorkItem, JsonResumeEducationItem, JsonResumeSkillItem } from '../types/jsonresume'; // Schema type + specific types if used in mapping

const router: Router = express.Router();
router.use(authMiddleware as RequestHandler); // Apply auth to all routes in this file

// --- Interfaces ---
interface AiGenerationOutput { tailoredCvJson: JsonResumeSchema; coverLetterText: string; }

interface IntermediateData {
    tailoredCvJson: JsonResumeSchema;
    coverLetterTemplate: string;
    language: 'en' | 'de';
    jobId: string;
    userId: string;
    cvFilenamePrefix: string;
    clFilenamePrefix: string;
}

interface UserInputData { [key: string]: string; }
// For required inputs with type info
interface RequiredInputInfo {
    name: string;
    type: 'text' | 'number' | 'date' | 'textarea';
}
// For the pending response structure
interface GeneratePendingResponse {
    status: "pending_input";
    message: string;
    requiredInputs: RequiredInputInfo[];
    intermediateData: IntermediateData;
}
// For the success response structure
interface GenerateSuccessResponse {
    status: "success";
    message: string;
    cvFilename: string;
    coverLetterFilename: string;
}
// Union type for the response from the initial POST /:jobId endpoint
type GenerateInitialResponse = GenerateSuccessResponse | GeneratePendingResponse;


// --- Helper Functions ---

// Parse Gemini response (expecting CV + Cover Letter JSON object)
function parseGenerationResponse(responseText: string): AiGenerationOutput | null {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const jsonMatch = responseText.match(jsonRegex);
    if (jsonMatch && jsonMatch[1]) {
        const extractedJsonString = jsonMatch[1].trim();
        console.log("Attempting to parse generated JSON content (CV+CL)...");
        try {
            const parsedObject = JSON.parse(extractedJsonString);
            if (parsedObject && typeof parsedObject.tailoredCvJson === 'object' && parsedObject.tailoredCvJson !== null && typeof parsedObject.coverLetterText === 'string') {
                if (!parsedObject.tailoredCvJson.basics) console.warn("Parsed tailoredCvJson missing basics, potential schema deviation.");
                console.log("Successfully parsed generation response structure.");
                return parsedObject as AiGenerationOutput;
            } else { throw new Error("AI response missing expected structure or types."); }
        } catch (parseError: any) {
            console.error("JSON.parse failed:", parseError.message, "Content:", extractedJsonString);
            throw new Error("AI response was not valid JSON.");
        }
    }
    console.warn("Gemini response did not contain ```json formatting.");
    console.error("Could not parse valid JSON. Raw response:\n---\n", responseText, "\n---");
    return null;
}

// Infer input type for placeholder modal
function inferInputType(placeholderName: string): RequiredInputInfo['type'] {
    const lowerName = placeholderName.toLowerCase();
    if (lowerName.includes('salary') || lowerName.includes('amount') || lowerName.includes('number') || lowerName.includes('gehalt')) return 'number';
    if (lowerName.includes('date') || lowerName.includes('datum') || lowerName.includes('start')) return 'date';
    if (lowerName.includes('description') || lowerName.includes('reason') || lowerName.includes('details') || lowerName.includes('notes')) return 'textarea';
    return 'text';
}

// Map AI output to JSON Resume Schema (needed for CL context in finalize)
function mapAiOutputToSchema(aiData: any): JsonResumeSchema {
    console.log("Mapping AI output to JSON Resume Schema for CL context...");
    const resume: JsonResumeSchema = {};
    const aiBasics = aiData.basics || aiData.personalInfo || {}; // Handle both possible keys
    resume.basics = { name: aiBasics.name || "Applicant", /* ... map other basics ... */ profiles: [] };
    // Add mappings for work, education, skills as needed by cover letter template
    console.log("Mapping complete for CL context.");
    return resume;
}

// --- Route Handlers ---

// Handler for Finalize step (replaces placeholders, generates PDFs)
const finalizeGenerationHandler: RequestHandler = async (req, res) => {
    console.log("--- Finalize Endpoint Hit ---");
    if (!req.user) { res.status(401).json({ message: 'User not authenticated correctly.' }); return; }

    const { intermediateData, userInputData } = req.body as { intermediateData: IntermediateData, userInputData: UserInputData };

    if (!intermediateData || typeof intermediateData !== 'object' || !userInputData || typeof userInputData !== 'object') {
        console.error("Finalize Error: Missing or invalid intermediateData or userInputData.");
        res.status(400).json({ message: 'Missing required data for finalization.' }); return;
    }
    if (!intermediateData.tailoredCvJson || !intermediateData.coverLetterTemplate || !intermediateData.jobId || intermediateData.userId !== req.user.id) {
        console.error("Finalize Error: Invalid intermediate data or user mismatch.");
        res.status(400).json({ message: 'Invalid intermediate data provided.' }); return;
    }

    console.log("User Input Data Received:", userInputData);
    console.log("Intermediate Data Job ID:", intermediateData.jobId);

    try {
        // Replace Placeholders using user input (as strings)
        let finalCoverLetterText = intermediateData.coverLetterTemplate;
        const placeholderRegex = /\[\[ASK_USER:([^\]]+)\]\]/g;
        let match;
        const requiredPlaceholders = [...intermediateData.coverLetterTemplate.matchAll(placeholderRegex)].map(m => m[1].trim());

        for (const placeholderKey of requiredPlaceholders) {
            let userValue = userInputData[placeholderKey];
            if (userValue === undefined || userValue === null || userValue.trim() === '') {
                console.warn(`User did not provide input for placeholder: ${placeholderKey}`);
                res.status(400).json({ message: `Missing input for required field: ${placeholderKey}` }); return;
            }
            console.log(`Replacing placeholder [[ASK_USER:${placeholderKey}]] with value: "${userValue}"`);
            const replaceRegex = new RegExp(`\\[\\[ASK_USER:${placeholderKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\]\\]`, 'g');
            finalCoverLetterText = finalCoverLetterText.replace(replaceRegex, userValue.trim());
        }
        if (placeholderRegex.test(finalCoverLetterText)) { throw new Error("Failed to replace all placeholders."); }
        console.log("Placeholders replaced successfully.");

        // Generate Final PDFs
        console.log("Generating final PDF documents...");
        const { tailoredCvJson,  language, cvFilenamePrefix, clFilenamePrefix } = intermediateData;
        const generatedCvFilename = await generateCvPdfFromJsonResume(tailoredCvJson,  cvFilenamePrefix + `_${language}`);
        const mappedCvForCL = mapAiOutputToSchema(tailoredCvJson); // Map for CL context
        const generatedClFilename = await generateCoverLetterPdf(finalCoverLetterText, mappedCvForCL, clFilenamePrefix + `_${language}`);
        console.log("Final PDF documents generated and saved temporarily.");

        // Send Success Response
        const successResponse: GenerateSuccessResponse = {
            status: "success",
            message: `Documents finalized and generated successfully.`,
            cvFilename: generatedCvFilename,
            coverLetterFilename: generatedClFilename
        };
        res.status(200).json(successResponse);

    } catch (error: any) {
        console.error(`Error finalizing documents for job ${intermediateData?.jobId || 'unknown'}:`, error);
        if (error instanceof Error && error.message.includes("placeholder")) { res.status(500).json({ message: error.message }); return; }
        if (error instanceof Error && error.message.includes("PDF generation failed")) { res.status(500).json({ message: "Failed to generate final PDF documents." }); return; }
        res.status(500).json({ message: 'Failed to finalize document generation.', error: error.message || 'Unknown server error' });
    }
};

// Handler for Initial Generation (checks for placeholders)
const generateDocumentsHandler: RequestHandler = async (req, res) => {
    if (!req.user) { res.status(401).json({ message: 'User not authenticated correctly.' }); return; }

    const { jobId } = req.params;
    const requestedLanguage = req.body.language === 'de' ? 'de' : 'en';
    const languageName = requestedLanguage === 'de' ? 'German' : 'English';
    const userId = req.user._id; // userId might be ObjectId or similar

    try {
        // Fetch Job & User Data
        const job = await JobApplication.findOne({ _id: jobId, userId: userId });
        if (!job) { res.status(404).json({ message: 'Job application not found or access denied.' }); return; }
        if (!job.jobDescriptionText || job.jobDescriptionText.trim().length < 50) { res.status(400).json({ message: 'Job description text is missing or too short.' }); return; }
        const currentUser = await User.findById(userId);
        if (!currentUser) { res.status(404).json({ message: "User not found." }); return; }
        const baseCvJson = currentUser.cvJson;
        if (!baseCvJson || typeof baseCvJson !== 'object' || Object.keys(baseCvJson).length === 0) { res.status(400).json({ message: 'No valid base CV found.' }); return; }

        // 2. Construct ENHANCED Gemini Prompt (with language, placeholders, schema target)
        const prompt = `
            You are an expert career advisor and document writer specialized in the ${languageName} job market.
            Your task is to tailor a provided base CV (in JSON Resume format) and write a compelling cover letter for a specific job application, ensuring the output is in ${languageName} and strictly adheres to the JSON Resume Schema.

            **Target Language:** ${languageName} (${requestedLanguage})

            **Inputs:**
            1.  **Base CV Data (JSON Resume Schema):**
                \`\`\`json
                ${JSON.stringify(baseCvJson, null, 2)}
                \`\`\`
            2.  **Target Job Description (Text):**
                ---
                ${job.jobDescriptionText}
                ---

            **Instructions:**

            A.  **Tailor the CV (in ${languageName}, STRICT JSON Resume Schema):**
                *   Analyze the Base CV Data and the Target Job Description.
                *   Identify relevant skills, experiences, qualifications.
                *   Rewrite/rephrase content in the corresponding JSON Resume sections ('basics.summary', 'work.highlights', 'projects.highlights') to emphasize relevance IN ${languageName}, using keywords from the Job Description naturally.
                *   Maintain factual integrity (dates, names, degrees). Translate only if conventional.
                *   Optimize item order within arrays ('work', 'education', 'skills', 'projects') for relevance if beneficial.
                *   **CRITICAL OUTPUT STRUCTURE:** The output for the tailored CV MUST be a valid JSON object strictly adhering to the JSON Resume Schema (https://jsonresume.org/schema/). It MUST include the following top-level keys if corresponding data exists: \`basics\`, \`work\`, \`volunteer\`, \`education\`, \`awards\`, \`certificates\`, \`publications\`, \`skills\`, \`languages\`, \`interests\`, \`references\`, \`projects\`.
                *   **Date Format Requirements:**
                    - All dates (startDate, endDate) MUST be in ISO format: "YYYY-MM-DD"
                    - For ongoing positions, use "Present" (not current date)
                    - If a date is unknown, omit the field or use null
                    - Never use partial dates or invalid date strings
                *   **Specific Key Mapping:** Ensure you use the EXACT schema keys:
                    *   Use \`basics\` for personal info (containing \`name\`, \`label\`, \`email\`, \`phone\`, \`url\`, \`summary\`, \`location\` object, \`profiles\` array). DO NOT use 'personalInfo'.
                    *   Use \`work\` for work experience (array of objects containing \`name\` or \`company\`, \`position\` or \`jobTitle\`, \`startDate\`, \`endDate\`, \`summary\`, \`highlights\` array). DO NOT use 'experience'.
                    *   Use \`education\` (array of objects containing \`institution\`, \`area\`, \`studyType\` or \`degree\`, \`startDate\`, \`endDate\`, \`score\`, \`courses\` array).
                    *   Use \`skills\` (array of objects containing \`name\` [category], \`level\` [optional], \`keywords\` array [specific skills]). DO NOT use a simple object with categories as keys.
                    *   Use \`projects\` (array of objects containing \`name\`, \`description\`, \`highlights\`, \`keywords\`, \`url\`, etc.)
                *   All textual content in the final JSON object MUST be in ${languageName}.

            B.  **Write the Cover Letter (in ${languageName}):**
                *   Generate a concise, professional cover letter... IN ${languageName}.
                *   Address it appropriately...
                *   Introduce applicant and role: "${job.jobTitle}" at "${job.companyName}".
                *   Highlight 2-3 key qualifications...
                *   Express enthusiasm...
                *   **Placeholders:** If salary expectation or start date are needed but not inferable, insert "[[ASK_USER:Salary Expectation]]" or "[[ASK_USER:Earliest Start Date]]". Fill in today's date: "${new Date().toLocaleDateString(requestedLanguage === 'de' ? 'de-DE' : 'en-CA')}".
                *   Conclude professionally...
                *   The output must be a single string of text IN ${languageName}.

            **Output Format:**
            Return ONLY a single JSON object enclosed in triple backticks (\`\`\`json ... \`\`\`). This JSON object MUST contain exactly two top-level keys:
            1.  \`tailoredCvJson\`: The complete, tailored CV data as a JSON Resume Schema object (in ${languageName}).
            2.  \`coverLetterText\`: The complete cover letter as a single string (in ${languageName}, may contain [[ASK_USER:...]] placeholders).
        `;

        // Call Gemini
        console.log(`Generating ${languageName} documents for job ${jobId}...`);
        const result = await geminiModel.generateContent(prompt);
        const response = result.response;
        const responseText = response.text();
        console.log("Received generation response from Gemini.");

        // Parse & Validate Response
        const generatedData = parseGenerationResponse(responseText);
        if (!generatedData) { throw new Error("AI failed to return data in expected format."); }
        const { tailoredCvJson, coverLetterText } = generatedData;
        console.log("--- Structure returned by AI (before PDF generation) ---");
        console.log(JSON.stringify(tailoredCvJson, null, 2));
        console.log("---------------------------------------------------------");

        // Check for Placeholders
        const placeholderRegex = /\[\[ASK_USER:([^\]]+)\]\]/g;
        const uniquePlaceholderNames = new Set<string>();
        let match;
        while ((match = placeholderRegex.exec(coverLetterText)) !== null) { uniquePlaceholderNames.add(match[1].trim()); }
        const placeholders: RequiredInputInfo[] = Array.from(uniquePlaceholderNames).map(name => ({ name: name, type: inferInputType(name) }));

        if (placeholders.length > 0) {
            // Handle Pending Input
            console.log(`Placeholders found in cover letter for job ${jobId}:`, placeholders);
            const pendingResponse: GeneratePendingResponse = {
                status: "pending_input",
                message: "AI requires additional information to finalize the cover letter.",
                requiredInputs: placeholders,
                intermediateData: { tailoredCvJson, coverLetterTemplate: coverLetterText, language: requestedLanguage, jobId, userId: userId as string, cvFilenamePrefix: `CV_${currentUser.email.split('@')[0]}_${job.companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${job.jobTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`, clFilenamePrefix: `CoverLetter_${currentUser.email.split('@')[0]}_${job.companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${job.jobTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}` }
            };
            res.status(202).json(pendingResponse);
            return;
        }

        // Generate PDFs (No placeholders found)
        console.log("No placeholders found. Generating PDF documents...");
        const safeCompanyName = job.companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const safeJobTitle = job.jobTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const cvFilenamePrefix = `CV_${currentUser.email.split('@')[0]}_${safeCompanyName}_${safeJobTitle}_${requestedLanguage}`;
        const clFilenamePrefix = `CoverLetter_${currentUser.email.split('@')[0]}_${safeCompanyName}_${safeJobTitle}_${requestedLanguage}`;
        const generatedCvFilename = await generateCvPdfFromJsonResume(tailoredCvJson,  cvFilenamePrefix);
        const mappedCvForCL = mapAiOutputToSchema(tailoredCvJson);
        const generatedClFilename = await generateCoverLetterPdf(coverLetterText, mappedCvForCL, clFilenamePrefix);
        console.log("PDF documents generated and saved temporarily.");

        // Send Success Response
        const successResponse: GenerateSuccessResponse = {
            status: "success",
            message: `CV and cover letter generated successfully in ${languageName}.`,
            cvFilename: generatedCvFilename,
            coverLetterFilename: generatedClFilename
        };
        res.status(200).json(successResponse);

    } catch (error: any) {
        // ... existing detailed error handling ...
        console.error(`Error generating documents for job ${jobId}:`, error);
        if (error instanceof Error && (error.message.includes("missing") || error.message.includes("No base CV found") || error.message.includes("not found or invalid") || error.message.includes("Job description text"))) { res.status(400).json({ message: error.message }); return; }
        if (error instanceof Error && error.message.includes("AI failed")) { res.status(500).json({ message: error.message }); return; }
        if (error instanceof GoogleGenerativeAIError || (error.response && error.response.promptFeedback) || (error instanceof Error && error.message.includes("AI content generation blocked"))) { const blockReason = error.response?.promptFeedback?.blockReason; res.status(400).json({ message: `Content generation blocked by AI: ${blockReason || error.message || 'Unknown reason'}` }); return; }
        if (error instanceof Error && error.message.includes("PDF generation failed")) { res.status(500).json({ message: "Failed to generate PDF documents after AI processing." }); return; }
        if (error instanceof Error && error.name === 'CastError') { res.status(400).json({ message: 'Invalid job ID format' }); return; }
        res.status(500).json({ message: 'Failed to generate documents.', error: error.message || 'Unknown server error' });
    }
};

// Handler for downloading generated files
const downloadFileHandler: RequestHandler = async (req, res) => {
    if (!req.user) { res.status(401).json({ message: 'Authentication required to download.' }); return; }
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    if (safeFilename !== filename || filename.includes('..')) { res.status(400).json({ message: 'Invalid filename.' }); return; }
    const TEMP_PDF_DIR = path.join(__dirname, '..', '..', 'temp_pdfs');
    const filePath = path.join(TEMP_PDF_DIR, safeFilename);
    try { await fsPromises.access(filePath); console.log(`Serving file for download: ${filePath}`); res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`); res.setHeader('Content-Type', 'application/pdf'); const fileStream = fs.createReadStream(filePath); fileStream.pipe(res); fileStream.on('close', async () => { try { await fsPromises.unlink(filePath); console.log(`Cleaned up ${filePath}`); } catch (e) { console.error(`Error cleaning up ${filePath}`, e); } }); fileStream.on('error', (e: NodeJS.ErrnoException) => { console.error(`Stream error ${filePath}`, e); if (!res.headersSent) { res.status(500).json({ message: 'Error streaming file.' }); } else { res.end(); } }); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') { res.status(404).json({ message: 'File not found or already deleted.' }); return; } console.error(`Download prep error ${filePath}`, error); res.status(500).json({ message: 'Server error preparing download.' }); }
};


// === ROUTE DEFINITIONS (Order Matters!) ===
router.post('/finalize', finalizeGenerationHandler); // Finalize *before* generic :jobId
router.post('/:jobId', generateDocumentsHandler); // Generate initial
router.get('/download/:filename', downloadFileHandler); // Download last

export default router;