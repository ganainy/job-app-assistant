import express, { Router, Request, Response, RequestHandler } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import authMiddleware from '../middleware/authMiddleware';
import JobApplication from '../models/JobApplication';
import User from '../models/User';
import geminiModel from '../utils/geminiClient';
import { GoogleGenerativeAIError } from '@google/generative-ai';
import { JsonResumeSchema } from '../types/jsonresume';
import mongoose from 'mongoose';

const router: Router = express.Router();
router.use(authMiddleware as RequestHandler); // Apply auth to all routes in this file

// --- Interfaces ---
interface AiGenerationOutput { tailoredCvJson: JsonResumeSchema; coverLetterText: string; }
interface IntermediateData {
    tailoredCvJson: JsonResumeSchema; coverLetterTemplate: string;
    language: 'en' | 'de';
    jobId: string; userId: string;
}
interface UserInputData { [key: string]: string; }
// For required inputs with type info
interface RequiredInputInfo { name: string; type: 'text' | 'number' | 'date' | 'textarea'; }
// Update GeneratePendingResponse to use modified IntermediateData
interface GeneratePendingResponse { status: "pending_input"; message: string; requiredInputs: RequiredInputInfo[]; intermediateData: IntermediateData; }
interface GenerateDraftReadyResponse { status: "draft_ready"; message: string; jobId: string; } // New response type
// Union type for initial generation attempt
type GenerateInitialOrPendingResponse = GeneratePendingResponse | GenerateDraftReadyResponse;


// --- Helper Functions ---

// Parse Gemini response (expecting CV + Cover Letter JSON object)
function parseGenerationResponse(responseText: string): AiGenerationOutput | null {
    const jsonRegex = /```json\\s*([\\s\\S]*?)\\s*```/;
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

// Define an interface for the expected user object structure
interface AuthenticatedUser {
    _id: mongoose.Types.ObjectId | string;
}


// ---  POST /api/generator/:jobId ---
// This endpoint now generates DRAFTS or returns pending_input
const generateDocumentsHandler: RequestHandler = async (req, res) => {
    // Use type assertion for req.user
    const user = req.user as AuthenticatedUser;
    if (!user) { res.status(401).json({ message: 'User not authenticated correctly.' }); return; }

    const { jobId } = req.params;
    const requestedLanguage = req.body.language === 'de' ? 'de' : 'en';
    const languageName = requestedLanguage === 'de' ? 'German' : 'English';
    const userId = user._id.toString(); // Now TS knows _id exists

    try {
        // 1. Fetch Job & User data (as before)
        const job = await JobApplication.findOne({ _id: jobId, userId: userId });
        if (!job) { res.status(404).json({ message: 'Job application not found or access denied.' }); return; }
        if (!job.jobDescriptionText) { res.status(400).json({ message: 'Job description text is missing.' }); return; }
        const currentUser = await User.findById(userId);
        if (!currentUser) { res.status(404).json({ message: "User not found." }); return; }
        const baseCvJson = currentUser.cvJson;
        if (!baseCvJson) { res.status(400).json({ message: 'No base CV found.' }); return; }

        // 2. Construct Gemini Prompt (as before - requesting JSON Resume, placeholders, language)
        // Ensure the prompt clearly asks for [[ASK_USER:...]] placeholders in the cover letter
        // and a complete JSON Resume object for the CV.
        const prompt = `Based on the user's base CV (JSON Resume format):\n${JSON.stringify(baseCvJson, null, 2)}\n\nAnd the following job description:\n${job.jobDescriptionText}\n\nGenerate a tailored CV in JSON Resume format AND a cover letter for this job application. The target language is ${languageName}. For the cover letter, if you need specific information from the user that isn't available (e.g., specific project details, availability date, salary expectations), use placeholders in the format [[ASK_USER:Placeholder description]]. Do NOT invent information. Output the tailored CV JSON first, followed by "---COVER_LETTER_SEPARATOR---", then the cover letter text. Ensure the CV JSON is valid.`;

        // 3. Call Gemini API (as before)
        console.log(`Generating ${languageName} draft documents for job ${jobId}...`);
        // Set generation status to pending immediately
        await JobApplication.updateOne({ _id: jobId, userId: userId }, { $set: { generationStatus: 'pending_generation' } }); // Indicate processing started

        const result = await geminiModel.generateContent(prompt);
        const response = result.response;
        const responseText = response.text();
        console.log("Received generation response from Gemini.");

        // 4. Parse and Validate Gemini Response (using a separator)
        const separator = "---COVER_LETTER_SEPARATOR---";
        const separatorIndex = responseText.indexOf(separator);
        if (separatorIndex === -1) {
            throw new Error("AI response did not contain the expected separator.");
        }
        let cvJsonString = responseText.substring(0, separatorIndex).trim();
        const coverLetterText = responseText.substring(separatorIndex + separator.length).trim();

        // --- FIX 2: More robust handling of ```json block ---
        const prefix = "```json";
        const suffix = "```";

        // Remove potential leading/trailing whitespace *before* checking prefix/suffix
        cvJsonString = cvJsonString.trim();

        if (cvJsonString.startsWith(prefix) && cvJsonString.endsWith(suffix)) {
            console.log("Found ```json prefix and ``` suffix. Extracting content.");
            // Slice from after the prefix to before the suffix, then trim again for internal whitespace
            cvJsonString = cvJsonString.substring(prefix.length, cvJsonString.length - suffix.length).trim();
        } else if (cvJsonString.startsWith(prefix)) {
            // Handle case where suffix might be missing or malformed, try removing prefix only
            console.warn("Found ```json prefix but not the expected ``` suffix. Attempting to parse after prefix.");
            cvJsonString = cvJsonString.substring(prefix.length).trim();
        } else {
            console.log("CV JSON string did not appear to be wrapped in ```json block, parsing as is.");
        }
        // --- End FIX 2 ---

        let tailoredCvJson: JsonResumeSchema;
        try {
            tailoredCvJson = JSON.parse(cvJsonString);
            // Basic validation (can be expanded)
            if (!tailoredCvJson || typeof tailoredCvJson !== 'object' || !tailoredCvJson.basics) {
                throw new Error("Parsed CV JSON is invalid or missing basic structure.");
            }
        } catch (parseError: any) {
            console.error("Failed to parse CV JSON from AI response:", parseError);
            console.error("Received CV JSON string for parsing:", cvJsonString); // Log the string *after* potential extraction
            throw new Error(`AI failed to return valid CV JSON: ${parseError.message}`);
        }

        console.log("--- Parsed CV JSON (for draft) ---");
        // console.log(JSON.stringify(tailoredCvJson, null, 2)); // Keep commented out for cleaner logs unless debugging
        console.log("--- Parsed Cover Letter Text (for draft) ---");
        // console.log(coverLetterText); // Keep commented out for cleaner logs unless debugging
        console.log("------------------------------------------");


        // 5. Check for Placeholders in Cover Letter (as before)
        const placeholderRegex = /\[\[ASK_USER:([^\]]+)\]\]/g;
        // Use a Set to get unique placeholder names
        const placeholderNames = new Set<string>();
        let match;
        while ((match = placeholderRegex.exec(coverLetterText)) !== null) {
            placeholderNames.add(match[1].trim());
        }
        const uniquePlaceholders = Array.from(placeholderNames);

        const requiredInputs: RequiredInputInfo[] = uniquePlaceholders.map(name => ({ name: name, type: inferInputType(name) }));

        if (requiredInputs.length > 0) {
            // --- Handle Pending Input ---
            console.log(`Placeholders found for job ${jobId}:`, uniquePlaceholders);
            const pendingResponse: GeneratePendingResponse = {
                status: "pending_input",
                message: "AI requires additional information to finalize the draft.",
                requiredInputs: requiredInputs,
                // Pass the parsed CV and the cover letter *template*
                intermediateData: { tailoredCvJson, coverLetterTemplate: coverLetterText, language: requestedLanguage, jobId, userId }
            };
            // Update job status to pending_input, DO NOT save drafts yet
            await JobApplication.updateOne({ _id: jobId, userId: userId }, { $set: { generationStatus: 'pending_input' } });
            console.log(`Job ${jobId} status set to pending_input.`);
            res.status(202).json(pendingResponse); // 202 Accepted
            return;
        }

        // --- 6. NO Placeholders Found: Save Draft Directly ---
        console.log(`No placeholders found for job ${jobId}. Saving generated draft...`);
        const updateResult = await JobApplication.findOneAndUpdate(
            { _id: jobId, userId: userId },
            {
                $set: {
                    draftCvJson: tailoredCvJson,
                    draftCoverLetterText: coverLetterText,
                    language: requestedLanguage, // Store language used for draft
                    generationStatus: 'draft_ready' // Set status to draft_ready
                }
            },
            { new: true } // Return updated document
        );

        if (!updateResult) {
            // If findOneAndUpdate returns null, it means the document wasn't found or didn't match the filter
            // This shouldn't happen if the initial findOne worked, but good to handle.
            throw new Error("Failed to find and update job application with draft data.");
        }
        console.log(`Draft saved successfully for job ${jobId}. Status set to draft_ready.`);

        // --- 7. Send Success Response (Draft Ready) ---
        const draftReadyResponse: GenerateDraftReadyResponse = {
            status: "draft_ready",
            message: `Draft CV and cover letter generated successfully in ${languageName}. Ready for review.`,
            jobId: jobId
        };
        res.status(200).json(draftReadyResponse); // 200 OK

    } catch (error: any) {
        console.error(`Error in initial generation for job ${jobId}:`, error);
        // Ensure userId is available for error logging/updating status
        const currentUserId = (req.user as AuthenticatedUser)?._id?.toString();
        if (currentUserId) {
            try {
                await JobApplication.updateOne({ _id: jobId, userId: currentUserId }, { $set: { generationStatus: 'error' } });
            } catch (updateError) {
                console.error(`Failed to update job status to error for job ${jobId}`, updateError);
            }
        }
        // Detailed error response logic
        let statusCode = 500;
        let errorMessage = 'Failed to generate draft documents.';

        if (error instanceof GoogleGenerativeAIError) {
            errorMessage = `Gemini API Error: ${error.message}`;
            // Potentially map specific Gemini errors to different status codes if needed
        } else if (error.message.includes("AI failed to return data") || error.message.includes("AI response did not contain")) {
            errorMessage = `AI response format error: ${error.message}`;
            statusCode = 502; // Bad Gateway - upstream error
        } else if (error.message.includes("Failed to find and update")) {
            errorMessage = "Internal error: Could not save draft data.";
            statusCode = 500;
        } else {
            errorMessage = error.message || 'Unknown server error';
        }

        res.status(statusCode).json({ message: errorMessage, error: error.message }); // Provide error details
    }
};


// --- Finalize Endpoint (`POST /api/generator/finalize`) ---
const finalizeGenerationHandler: RequestHandler = async (req, res) => {
    console.log("--- Finalize Endpoint Hit ---");
    // Use type assertion for req.user
    const user = req.user as AuthenticatedUser;
    if (!user) { res.status(401).json({ message: 'User not authenticated correctly.' }); return; }

    // Ensure intermediateData type matches the updated definition (no theme)
    const { intermediateData, userInputData } = req.body as { intermediateData: IntermediateData, userInputData: UserInputData };

    // Validation
    if (!intermediateData || typeof intermediateData !== 'object' || !userInputData || typeof userInputData !== 'object') {
        console.error("Finalize Error: Missing or invalid intermediateData or userInputData.");
        res.status(400).json({ message: 'Missing required data for finalization.' }); return;
    }
    // Validate required fields within intermediateData and check user ID match
    if (!intermediateData.tailoredCvJson || !intermediateData.coverLetterTemplate || !intermediateData.language || !intermediateData.jobId || !intermediateData.userId || intermediateData.userId !== user._id.toString()) {
        console.error("Finalize Error: Invalid intermediate data structure or user mismatch.", { intermediateUserId: intermediateData.userId, reqUserId: user._id.toString() });
        res.status(400).json({ message: 'Invalid or incomplete intermediate data provided, or user mismatch.' }); return;
    }

    const { tailoredCvJson, coverLetterTemplate, language, jobId, userId } = intermediateData;
    // userId from intermediateData should match user._id.toString()

    console.log("Finalizing draft for Job ID:", jobId);
    console.log("User Input:", userInputData);

    try {
        // Replace Placeholders in Cover Letter Text
        let finalCoverLetterText = coverLetterTemplate;
        const placeholderRegex = /\[\[ASK_USER:([^\]]+)\]\]/g;
        // Use Set to ensure we check each unique placeholder only once for input
        const requiredPlaceholders = new Set<string>();
        let match;
        // *** FIX: Check the original template for placeholders ***
        while ((match = placeholderRegex.exec(coverLetterTemplate)) !== null) {
            requiredPlaceholders.add(match[1].trim());
        }

        for (const placeholderKey of requiredPlaceholders) {
            const userValue = userInputData[placeholderKey];
            if (userValue === undefined || userValue === null || String(userValue).trim() === '') { // Check for empty string after trimming
                console.warn(`Missing input for required field: ${placeholderKey} in job ${jobId}`);
                res.status(400).json({ message: `Missing input for required field: ${placeholderKey}` }); return;
            }
            // Escape special regex characters in the placeholder key before creating the RegExp
            const escapedKey = placeholderKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const replaceRegex = new RegExp(`\\\[\\\[ASK_USER:${escapedKey}\\]\\\]`, 'g');
            finalCoverLetterText = finalCoverLetterText.replace(replaceRegex, String(userValue).trim()); // Ensure value is string and trimmed
        }

        // Double-check if any placeholders remain after replacement
        placeholderRegex.lastIndex = 0; // Reset regex state before re-testing
        if (placeholderRegex.test(finalCoverLetterText)) {
            console.error(`Failed to replace all placeholders for job ${jobId}. Remaining text snippet: ${finalCoverLetterText.substring(0, 100)}`);
            throw new Error("Internal error: Failed to replace all placeholders.");
        }
        console.log("Placeholders replaced successfully for finalize.");

        // Save the finalized drafts and update status
        const updateResult = await JobApplication.findOneAndUpdate(
            { _id: jobId, userId: user._id.toString() }, // Use authenticated user ID for filter
            {
                $set: {
                    // Save the CV JSON that was generated *before* asking user input
                    draftCvJson: tailoredCvJson,
                    // Save the cover letter *after* replacing placeholders
                    draftCoverLetterText: finalCoverLetterText,
                    language: language, // Ensure language is saved/updated
                    generationStatus: 'draft_ready' // Mark as ready for review/rendering
                }
            },
            { new: true } // Return the updated document
        );

        if (!updateResult) {
            // This could happen if the job was deleted between steps, or if userId somehow mismatched
            console.error(`Failed to find and update job application ${jobId} during finalization.`);
            throw new Error("Failed to update job application with finalized draft data. Job may no longer exist.");
        }
        console.log(`Finalized draft saved successfully for job ${jobId}. Status set to draft_ready.`);

        // Respond indicating draft is ready (same response as direct generation)
        const draftReadyResponse: GenerateDraftReadyResponse = {
            status: "draft_ready",
            message: "Draft finalized successfully. Ready for review.",
            jobId: jobId
        };
        res.status(200).json(draftReadyResponse); // 200 OK

    } catch (error: any) {
        console.error(`Error finalizing draft for job ${jobId}:`, error);

        // *** FIX: Move error status update and response logic outside the inner try/catch ***
        // Attempt to update status to error, but don't overwrite if it's already draft_ready
        const currentUserId = (req.user as AuthenticatedUser)?._id?.toString();
        if (currentUserId) {
            try {
                await JobApplication.updateOne(
                    { _id: jobId, userId: currentUserId, generationStatus: { $ne: 'draft_ready' } },
                    { $set: { generationStatus: 'error' } }
                );
            } catch (updateError) {
                console.error(`Failed to update job status to error during finalization for job ${jobId}`, updateError);
            }
        }

        // Now define status code and message for the final response
        let statusCode = 500;
        let errorMessage = 'Failed to finalize draft.';
        if (error instanceof Error) { // Check if it's an Error object
            if (error.message.includes("Missing input")) {
                statusCode = 400;
                errorMessage = error.message;
            } else if (error.message.includes("Failed to update job application")) {
                statusCode = 404; // Or 500, depending on expected cause
                errorMessage = error.message;
            } else if (error.message.includes("Failed to replace all placeholders")) {
                statusCode = 500; // Internal server error
                errorMessage = error.message;
            } else {
                errorMessage = error.message || 'Unknown server error during finalization';
            }
        } else {
            errorMessage = 'An unexpected error occurred during finalization.';
        }

        res.status(statusCode).json({ message: errorMessage, error: error instanceof Error ? error.message : String(error) });
    }
};


// --- Download Endpoint  ---
const downloadFileHandler: RequestHandler = async (req, res) => {
    if (!req.user) { res.status(401).json({ message: 'Authentication required to download.' }); return; }
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    if (safeFilename !== filename || filename.includes('..')) { res.status(400).json({ message: 'Invalid filename.' }); return; }
    const TEMP_PDF_DIR = path.join(__dirname, '..', '..', 'temp_pdfs');
    const filePath = path.join(TEMP_PDF_DIR, safeFilename);
    try { await fs.promises.access(filePath); console.log(`Serving file for download: ${filePath}`); res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`); res.setHeader('Content-Type', 'application/pdf'); const fileStream = fs.createReadStream(filePath); fileStream.pipe(res); fileStream.on('close', async () => { try { await fs.promises.unlink(filePath); console.log(`Cleaned up ${filePath}`); } catch (e) { console.error(`Error cleaning up ${filePath}`, e); } }); fileStream.on('error', (e: NodeJS.ErrnoException) => { console.error(`Stream error ${filePath}`, e); if (!res.headersSent) { res.status(500).json({ message: 'Error streaming file.' }); } else { res.end(); } }); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') { res.status(404).json({ message: 'File not found or already deleted.' }); return; } console.error(`Download prep error ${filePath}`, error); res.status(500).json({ message: 'Server error preparing download.' }); }
};


// === ROUTE DEFINITIONS (Order Matters!) ===
router.post('/finalize', finalizeGenerationHandler); // Finalize *before* generic :jobId
router.post('/:jobId', generateDocumentsHandler); // Generate initial
router.get('/download/:filename', downloadFileHandler); // Download last

export default router;