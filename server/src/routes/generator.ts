// server/src/routes/generator.ts
import express, { Router, Request, Response, RequestHandler } from 'express';
import * as fsPromises from 'fs/promises'; // Added for fs.access
import * as fs from 'fs'; // Added for fs.createReadStream
import * as path from 'path'; // Added for path operations
import authMiddleware from '../middleware/authMiddleware';
import JobApplication from '../models/JobApplication';
import User from '../models/User';
import geminiModel from '../utils/geminiClient';
import { GoogleGenerativeAIError } from '@google/generative-ai';
// Import NEW PDF generator and schema type
import { generateCvPdfFromJsonResume, generateCoverLetterPdf } from '../utils/pdfGenerator'; // Correct import path
import { JsonResumeSchema } from '../types/jsonresume'; // Import schema type

const router: Router = express.Router();
router.use(authMiddleware as RequestHandler); // Apply auth to all routes in this file

// --- Interface for expected Gemini Output (JSON Resume based) ---
interface AiGenerationOutput { tailoredCvJson: JsonResumeSchema; coverLetterText: string; }
interface IntermediateData {
    tailoredCvJson: JsonResumeSchema;
    coverLetterTemplate: string;
    language: 'en' | 'de';
    theme: string;
    jobId: string;
    userId: string;
    cvFilenamePrefix: string;
    clFilenamePrefix: string;
}
interface UserInputData {
    [key: string]: string; // e.g., { "Salary Expectation": "€65,000", "Earliest Start Date": "2024-06-01" }
}
// ---  Helper to parse Gemini response (JSON Resume specific) ---
function parseGenerationResponse(responseText: string): AiGenerationOutput | null { // Return null on failure
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const jsonMatch = responseText.match(jsonRegex);

    if (jsonMatch && jsonMatch[1]) {
        const extractedJsonString = jsonMatch[1].trim();
        console.log("Attempting to parse generated JSON content (CV+CL)...");
        try {
            const parsedObject = JSON.parse(extractedJsonString);
            // Validate expected structure and basic types
            if (parsedObject &&
                typeof parsedObject.tailoredCvJson === 'object' && // Check if CV JSON is an object
                parsedObject.tailoredCvJson !== null &&             // Check if it's not null
                typeof parsedObject.coverLetterText === 'string'   // Check if cover letter is a string
               ) {
                 // Optional: More detailed validation of tailoredCvJson against JsonResumeSchema structure
                 if (!parsedObject.tailoredCvJson.basics || typeof parsedObject.tailoredCvJson.basics.name !== 'string') {
                     console.warn("Parsed tailoredCvJson missing basics.name, potential schema deviation.");
                     // Depending on strictness, you could throw an error here or allow it
                 }
                console.log("Successfully parsed generation response structure.");
                return parsedObject as AiGenerationOutput;
            } else {
                 console.error("Parsed JSON object missing required keys (tailoredCvJson object, coverLetterText string) or has incorrect types. Parsed:", parsedObject);
                 throw new Error("AI response missing expected structure or types.");
            }
        } catch (parseError: any) {
            console.error("JSON.parse failed on extracted generation content:", parseError.message);
            console.error("Extracted Content causing failure:\n---\n", extractedJsonString, "\n---");
            throw new Error("AI response was not valid JSON.");
        }
    } else {
        console.warn("Gemini generation response did not contain expected ```json formatting.");
    }
    console.error("Could not parse valid JSON with expected structure from Gemini response. Raw response:\n---\n", responseText, "\n---");
    // Return null instead of throwing here, main handler will check for null
    return null;
}

const finalizeGenerationHandler: RequestHandler = async (req, res) => {
    console.log("--- Finalize Endpoint Hit ---");
    if (!req.user) { // Still good to check auth middleware worked
        res.status(401).json({ message: 'User not authenticated correctly.' });
        return;
    }

    // --- 1. Extract and Validate Input ---
    const { intermediateData, userInputData } = req.body as { intermediateData: IntermediateData, userInputData: UserInputData };

    if (!intermediateData || typeof intermediateData !== 'object' || !userInputData || typeof userInputData !== 'object') {
        console.error("Finalize Error: Missing or invalid intermediateData or userInputData in request body.");
        res.status(400).json({ message: 'Missing required data for finalization.' });
        return;
    }

    // Basic check: Ensure intermediate data seems correct (can add more checks)
    if (!intermediateData.tailoredCvJson || !intermediateData.coverLetterTemplate || !intermediateData.jobId || intermediateData.userId !== req.user.id) {
         // Check if userId matches the authenticated user for security
         console.error("Finalize Error: Invalid intermediate data or user mismatch.");
         res.status(400).json({ message: 'Invalid intermediate data provided.' });
         return;
     }

    console.log("User Input Data Received:", userInputData);
    console.log("Intermediate Data Job ID:", intermediateData.jobId);

    try {
        // --- 2. Replace Placeholders ---
        let finalCoverLetterText = intermediateData.coverLetterTemplate;
        const placeholderRegex = /\[\[ASK_USER:([^\]]+)\]\]/g;
        let match;
        let allPlaceholdersFilled = true;

        // Use a loop to replace all occurrences
        while ((match = placeholderRegex.exec(intermediateData.coverLetterTemplate)) !== null) {
             const placeholderKey = match[1].trim(); // e.g., "Salary Expectation"
             const userValue = userInputData[placeholderKey];

             if (userValue !== undefined && userValue !== null && userValue.trim() !== '') {
                 console.log(`Replacing placeholder [[ASK_USER:${placeholderKey}]] with provided value.`);
                 // Replace ALL instances of this placeholder in the final text
                 // Need RegExp with 'g' flag for global replace
                 const replaceRegex = new RegExp(`\\[\\[ASK_USER:${placeholderKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\]\\]`, 'g');
                 finalCoverLetterText = finalCoverLetterText.replace(replaceRegex, userValue);
             } else {
                 console.warn(`User did not provide input for placeholder: ${placeholderKey}`);
                 allPlaceholdersFilled = false;
                 // Option 1: Leave placeholder (might look bad in PDF)
                 // Option 2: Replace with a default string (e.g., "[Not Provided]")
                 // Option 3: Return an error (let's do this for now)
                  res.status(400).json({ message: `Missing input for required field: ${placeholderKey}` });
                  return;
             }
        }
        // Optional check after loop: ensure no placeholders remain
        if (placeholderRegex.test(finalCoverLetterText)) {
             console.error("Failed to replace all placeholders in cover letter template.");
             throw new Error("Error during placeholder replacement.");
        }
        console.log("Placeholders replaced successfully.");


        // --- 3. Generate Final PDFs ---
        console.log("Generating final PDF documents...");
        const { tailoredCvJson, theme, language, cvFilenamePrefix, clFilenamePrefix } = intermediateData;

        // Call PDF generators with finalized data
        const generatedCvFilename = await generateCvPdfFromJsonResume(tailoredCvJson, theme, cvFilenamePrefix + `_${language}`); // Add lang to prefix if not already there
        const generatedClFilename = await generateCoverLetterPdf(finalCoverLetterText, tailoredCvJson, clFilenamePrefix + `_${language}`); // Use final text

        console.log("Final PDF documents generated and saved temporarily.");

        // --- 4. Send Success Response ---
        res.status(200).json({
            status: "success",
            message: `Documents finalized and generated successfully.`,
            cvFilename: generatedCvFilename,
            coverLetterFilename: generatedClFilename
        });

    } catch (error: any) {
        console.error(`Error finalizing documents for job ${intermediateData?.jobId || 'unknown'}:`, error);
        // Handle specific errors from placeholder replacement or PDF generation
        if (error instanceof Error && error.message.includes("PDF generation failed")) {
             res.status(500).json({ message: "Failed to generate final PDF documents."});
             return;
        }
        res.status(500).json({ message: 'Failed to finalize document generation.', error: error.message || 'Unknown server error' });
    }
};
// POST /api/generator/finalize
router.post('/finalize', finalizeGenerationHandler);

// ---  POST /api/generator/:jobId ---
const generateDocumentsHandler: RequestHandler = async (req, res) => {
    if (!req.user) { res.status(401).json({ message: 'User not authenticated correctly.' }); return; }

    const { jobId } = req.params;
    // --- Extract language and theme from request body ---
    const requestedLanguage = req.body.language === 'de' ? 'de' : 'en';
    const requestedTheme = req.body.theme as string | undefined; // Theme ID from frontend

    const languageName = requestedLanguage === 'de' ? 'German' : 'English';
    const userId = req.user._id;

    try {
        // 1. Fetch Job Application & User (ensure it belongs to the user & get fresh CV data)
        // Fetch job first
        const job = await JobApplication.findOne({ _id: jobId, userId: userId });
        if (!job) { res.status(404).json({ message: 'Job application not found or access denied.' }); return; }
        if (!job.jobDescriptionText || job.jobDescriptionText.trim().length < 50) {
            res.status(400).json({ message: 'Job description text is missing or too short for this job application. Please add it first.' });
            return;
        }

        // Fetch user to get latest CV and preferred theme
        const currentUser = await User.findById(userId);
        if (!currentUser) { res.status(404).json({ message: "User associated with token not found." }); return; }
        const baseCvJson = currentUser.cvJson;
        if (!baseCvJson || typeof baseCvJson !== 'object' || Object.keys(baseCvJson).length === 0) {
            res.status(400).json({ message: 'No valid base CV (JSON Resume format) found for user. Please upload/process your CV first.' });
            return;
        }

        // Determine theme to use
        const userPreferredTheme = currentUser.preferredTheme;
        const defaultTheme = 'class'; // Your chosen default theme ID
        const themeToUse = requestedTheme || userPreferredTheme || defaultTheme;

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

        // 3. Call Gemini API
        console.log(`Generating ${languageName} documents for job ${jobId} (Theme: ${themeToUse})...`);
        const result = await geminiModel.generateContent(prompt);
        const response = result.response;
        const responseText = response.text();
        console.log("Received generation response from Gemini.");

        // 4. Parse and Validate Gemini Response
        const generatedData = parseGenerationResponse(responseText);
        if (!generatedData) { // Check if parsing failed
             throw new Error("AI failed to return the generated content in the expected format after parsing attempt.");
         }
        const { tailoredCvJson, coverLetterText } = generatedData;


        // --- Add a log here to inspect the structure Gemini *actually* returned ---
        console.log("--- Structure returned by AI (before PDF generation) ---");
        console.log(JSON.stringify(tailoredCvJson, null, 2)); // Log the AI's CV JSON output
        console.log("---------------------------------------------------------");


        // 5. Check for Placeholders in Cover Letter
        const placeholderRegex = /\[\[ASK_USER:([^\]]+)\]\]/g; // Regex to find [[ASK_USER:...]]
        const placeholders = [...coverLetterText.matchAll(placeholderRegex)].map(match => match[1].trim()); // Extract unique field names

        if (placeholders.length > 0) {
            // --- Handle Pending Input ---
            console.log(`Placeholders found in cover letter for job ${jobId}:`, placeholders);
            res.status(202).json({ // 202 Accepted, but not final
                status: "pending_input",
                message: "AI requires additional information to finalize the cover letter.",
                requiredInputs: placeholders, // Send the list of needed field names
                intermediateData: { // Send data needed for finalization
                    tailoredCvJson: tailoredCvJson,
                    coverLetterTemplate: coverLetterText, // CL text with placeholders
                    language: requestedLanguage,
                    theme: themeToUse,
                    jobId: jobId,
                    userId: userId, // Could be useful for finalize step auth
                    // Add Filename Prefixes for consistency in finalize step
                    cvFilenamePrefix: `CV_${currentUser.email.split('@')[0]}_${job.companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${job.jobTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`,
                    clFilenamePrefix: `CoverLetter_${currentUser.email.split('@')[0]}_${job.companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${job.jobTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`
                }
            });
            return; // Stop processing, wait for finalize call
        }

        // --- 6. Generate PDFs (If NO placeholders found) ---
        // NOTE: We are now relying on tailoredCvJson being schema-compliant
        // The generateCvPdfFromJsonResume function *might* still need its internal defaults
        // as a safety net, but ideally the AI provides the correct structure now.
        console.log("No placeholders found. Generating PDF documents...");
        const safeCompanyName = job.companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const safeJobTitle = job.jobTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const cvFilenamePrefix = `CV_${currentUser.email.split('@')[0]}_${safeCompanyName}_${safeJobTitle}_${requestedLanguage}`;
        const clFilenamePrefix = `CoverLetter_${currentUser.email.split('@')[0]}_${safeCompanyName}_${safeJobTitle}_${requestedLanguage}`;

        const generatedCvFilename = await generateCvPdfFromJsonResume(tailoredCvJson, themeToUse, cvFilenamePrefix);
        // Pass the schema-compliant tailoredCvJson for context if the CL template uses it
        const generatedClFilename = await generateCoverLetterPdf(coverLetterText, tailoredCvJson, clFilenamePrefix);

        console.log("PDF documents generated and saved temporarily.");

        // --- 7. Send Success Response with Filenames ---
        res.status(200).json({
            status: "success", // Add status for clarity on frontend
            message: `CV and cover letter generated successfully in ${languageName} (Theme: ${themeToUse}).`,
            cvFilename: generatedCvFilename,
            coverLetterFilename: generatedClFilename
        });

    } catch (error: any) {
        console.error(`Error generating documents for job ${jobId}:`, error);
         // Handle specific errors
        if (error instanceof Error && (error.message.includes("missing") || error.message.includes("No base CV found") || error.message.includes("not found or invalid") || error.message.includes("Job description text"))) {
             res.status(400).json({ message: error.message });
             return;
        }
         if (error instanceof Error && error.message.includes("AI failed")) {
             res.status(500).json({ message: error.message });
             return;
         }
         if (error instanceof GoogleGenerativeAIError || (error.response && error.response.promptFeedback) || (error instanceof Error && error.message.includes("AI content generation blocked"))) {
             const blockReason = error.response?.promptFeedback?.blockReason;
             res.status(400).json({ message: `Content generation blocked by AI: ${blockReason || error.message || 'Unknown reason'}` });
             return;
         }
        if (error instanceof Error && error.message.includes("PDF generation failed")) {
             res.status(500).json({ message: "Failed to generate PDF documents after AI processing."});
             return;
        }
         if (error instanceof Error && error.name === 'CastError') {
             res.status(400).json({ message: 'Invalid job ID format' });
             return;
        }
        // Generic fallback
        res.status(500).json({ message: 'Failed to generate documents.', error: error.message || 'Unknown server error' });
    }
};
// Assign handler to route
router.post('/:jobId', generateDocumentsHandler);


// --- GET /api/generator/download/:filename (Keep as is) ---
const downloadFileHandler: RequestHandler = async (req, res) => {
    // Apply authMiddleware here too if you want to ensure only the user who generated can download?
    // Or rely on obscure filenames? For simplicity now, we allow any authenticated user.
   if (!req.user) {
       res.status(401).json({ message: 'Authentication required to download.' });
       return;
   }

   const { filename } = req.params;
   const safeFilename = path.basename(filename);
   if (safeFilename !== filename || filename.includes('..')) { // Enhanced check
        res.status(400).json({ message: 'Invalid filename.' });
        return;
   }

   const TEMP_PDF_DIR = path.join(__dirname, '..', '..', 'temp_pdfs');
   const filePath = path.join(TEMP_PDF_DIR, safeFilename);

   try {
       await fsPromises.access(filePath); // Use fsPromises.access
       console.log(`Serving file for download: ${filePath}`);
       res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
       res.setHeader('Content-Type', 'application/pdf');
       const fileStream = fs.createReadStream(filePath); // Use fs.createReadStream
       fileStream.pipe(res);

       fileStream.on('close', async () => { /* ... cleanup ... */ });
       fileStream.on('error', (streamError: NodeJS.ErrnoException) => { // Corrected type annotation
           console.error(`Error during file stream for ${filePath}:`, streamError);
           // Ensure response is sent only once
           if (!res.headersSent) {
               res.status(500).json({ message: 'Error streaming file.' });
           }
        });

   } catch (error) {
       if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
           console.warn(`Download request for non-existent file: ${filePath}`);
            res.status(404).json({ message: 'File not found or already downloaded/deleted.' });
            return;
       }
       console.error(`Error preparing file ${filePath} for download:`, error);
        res.status(500).json({ message: 'Server error preparing file for download.' });
   }
};
router.get('/download/:filename', downloadFileHandler);


// --- Placeholder for Finalize Endpoint (Phase 3) ---
// router.post('/finalize', authMiddleware, finalizeGenerationHandler);


export default router;