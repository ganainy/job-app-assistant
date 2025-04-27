// server/src/routes/generator.ts
import express, { Router, Request, Response, RequestHandler } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import JobApplication from '../models/JobApplication';
import User from '../models/User'; // Need User model to get cvJson
import geminiModel from '../utils/geminiClient';
import { GoogleGenerativeAIError } from '@google/generative-ai';
import { generatePdf } from '../utils/pdfGenerator'; // <-- Import PDF generator
import { getCvHtml, getCoverLetterHtml } from '../utils/pdfTemplates'; // <-- Import HTML templates
import fs from 'fs/promises'; // For promise-based fs operations
import fsStandard from 'fs'; // For stream operations
import path from 'path'; // For file paths

const router: Router = express.Router();
router.use(authMiddleware as RequestHandler); // Apply auth middleware to all routes in this router

// --- Helper to parse Gemini response containing CV JSON and Cover Letter ---
// Expecting Gemini to return something like:
// ```json
// {
//   "tailoredCvJson": { ... your cv structure ... },
//   "coverLetterText": "Dear Hiring Manager, ..."
// }
// ```
interface GenerationResponse {
    tailoredCvJson: any; // Define more strictly if possible
    coverLetterText: string;
}

function parseGenerationResponse(responseText: string): GenerationResponse {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const jsonMatch = responseText.match(jsonRegex);

    if (jsonMatch && jsonMatch[1]) {
        const extractedJsonString = jsonMatch[1].trim();
        console.log("Attempting to parse generated JSON content...");
        try {
            const parsedObject = JSON.parse(extractedJsonString);
            // Basic validation of expected structure
            if (parsedObject && typeof parsedObject.tailoredCvJson === 'object' && typeof parsedObject.coverLetterText === 'string') {
                return parsedObject as GenerationResponse;
            } else {
                 console.error("Parsed JSON object missing required keys (tailoredCvJson, coverLetterText). Parsed:", parsedObject);
                 throw new Error("AI response missing expected structure.");
            }
        } catch (parseError: any) {
            console.error("JSON.parse failed on extracted generation content:", parseError.message);
            console.error("Extracted Content causing failure:\n---\n", extractedJsonString, "\n---");
            throw new Error("AI response was not valid JSON.");
        }
    } else {
        console.warn("Gemini generation response did not contain ```json formatting.");
         // Optionally, try a direct parse if you sometimes expect raw JSON (less likely for complex output)
    }

    console.error("Could not parse valid JSON with expected structure from Gemini response. Raw response:\n---\n", responseText, "\n---");
    throw new Error("AI failed to return the generated content in the expected format.");
}


// --- POST /api/generator/:jobId ---
// Generates tailored CV & Cover Letter for a specific Job Application
// For generateDocumentsHandler
const generateDocumentsHandler: RequestHandler = async (req, res): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ message: 'User not authenticated correctly.' });
        return;
    }

    const { jobId } = req.params;
    const userId = req.user._id;

    try {
        // 1. Fetch Job Application (ensure it belongs to the user)
        const job = await JobApplication.findOne({ _id: jobId, userId: userId });
        if (!job) {
            res.status(404).json({ message: 'Job application not found or access denied.' });
            return;
        }
        // Ensure job description text exists (we need it!)
        // NOTE: We haven't implemented scraping yet, so this field might often be empty!
        // For testing, you might need to manually add text via MongoDB Compass or Postman (PUT /api/jobs/:id).
        if (!job.jobDescriptionText || job.jobDescriptionText.trim().length < 50) {
            // TODO: Trigger scraping here if URL exists? Or just return error?
            console.warn(`Job ${jobId} has no description text. Manual scraping might be needed.`);
            // For now, return an error. Implement scraping/manual input later.
             res.status(400).json({ message: 'Job description text is missing or too short for this job application. Please add it first.' });
            return;
        }

        // 2. Fetch User's Base CV JSON
        // We get req.user from authMiddleware, it should have cvJson if uploaded
        const baseCvJson = req.user.cvJson;
        if (!baseCvJson || Object.keys(baseCvJson).length === 0) {
             res.status(400).json({ message: 'No base CV found for user. Please upload your CV first via Manage CV.' });
            return;
        }

        // 3. Construct Gemini Prompt for Tailoring
        // This prompt needs careful crafting!
        const prompt = `
            You are an expert career advisor and document writer. Your task is to tailor a base CV and write a compelling cover letter for a specific job application.

            **Inputs:**
            1.  **Base CV Data (JSON):**
                \`\`\`json
                ${JSON.stringify(baseCvJson, null, 2)}
                \`\`\`
            2.  **Target Job Description (Text):**
                ---
                ${job.jobDescriptionText}
                ---

            **Instructions:**

            A.  **Tailor the CV:**
                *   Analyze the Base CV Data and the Target Job Description.
                *   Identify the most relevant skills, experiences, and qualifications from the Base CV that match the requirements in the Job Description.
                *   Rewrite or rephrase bullet points in the 'experience' and potentially 'summary' sections to *emphasize* these relevant aspects using keywords from the Job Description where appropriate and natural.
                *   Ensure the core facts (company names, dates, degrees) remain unchanged.
                *   Optimize the order of skills or bullet points if it significantly improves relevance to the target job.
                *   The output for the tailored CV must be a valid JSON object following the exact same structure and keys as the input Base CV Data (personalInfo, summary, experience, education, skills).

            B.  **Write the Cover Letter:**
                *   Generate a concise and professional cover letter (approx. 3-4 paragraphs).
                *   Address it appropriately (e.g., "Dear Hiring Manager," if no specific name is available).
                *   Briefly introduce the applicant and the specific role they are applying for (use jobTitle: "${job.jobTitle}", companyName: "${job.companyName}" if helpful).
                *   Highlight 2-3 key qualifications, skills, or experiences from the tailored CV that directly match the most important requirements in the Job Description. Provide brief examples if possible.
                *   Express enthusiasm for the role and the company.
                *   Conclude professionally, indicating a desire for an interview.
                *   The output for the cover letter must be a single string of text.

            **Output Format:**
            Return ONLY a single JSON object enclosed in triple backticks (\`\`\`json ... \`\`\`). This JSON object MUST contain exactly two top-level keys:
            1.  \`tailoredCvJson\`: The complete, tailored CV data as a JSON object (matching the input structure).
            2.  \`coverLetterText\`: The complete cover letter as a single string.

            Example structure:
            \`\`\`json
            {
              "tailoredCvJson": { /* full tailored CV JSON structure */ },
              "coverLetterText": "Dear Hiring Manager, ..."
            }
            \`\`\`
        `;

        // 4. Call Gemini API
        console.log(`Generating documents for job ${jobId} for user ${req.user.email}...`);
        const result = await geminiModel.generateContent(prompt);
        const response = result.response;
        const responseText = response.text();
        console.log("Received generation response from Gemini.");

        // 5. Parse Gemini Response
        const generatedData = parseGenerationResponse(responseText);
        const { tailoredCvJson, coverLetterText } = generatedData;
        console.log("Successfully parsed generation response from Gemini.");
        
        // --- 6. Generate PDFs ---
        console.log("Generating PDF documents...");
        // Create filename prefixes (sanitize if needed)
        const safeCompanyName = job.companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const safeJobTitle = job.jobTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const cvFilenamePrefix = `CV_${req.user.email.split('@')[0]}_${safeCompanyName}_${safeJobTitle}`;
        const clFilenamePrefix = `CoverLetter_${req.user.email.split('@')[0]}_${safeCompanyName}_${safeJobTitle}`;

        // Generate HTML content using templates
        const cvHtml = getCvHtml(tailoredCvJson);
        const coverLetterHtml = getCoverLetterHtml(coverLetterText, tailoredCvJson); // Pass cvData for potential use in CL template

        // Call the PDF generator utility for both files
        const generatedCvFilename = await generatePdf(cvHtml, cvFilenamePrefix);
        const generatedClFilename = await generatePdf(coverLetterHtml, clFilenamePrefix);
        console.log("PDF documents generated and saved temporarily.");

        // --- 7. Send Response with Filenames ---
        res.status(200).json({
            message: "CV and cover letter generated successfully.",
            // We don't need to send the raw data anymore if we provide download links
            // generationResult: generatedData
            cvFilename: generatedCvFilename,
            coverLetterFilename: generatedClFilename
        });

    } catch (error: any) {
        console.error(`Error generating documents for job ${jobId}:`, error);

        // Handle specific errors (e.g., missing data, Gemini issues)
        if (error instanceof Error && (error.message.includes("missing or too short") || error.message.includes("No base CV found"))) {
            res.status(400).json({ message: error.message });
            return;
        }
        if (error instanceof Error && error.message.includes("AI failed")) { // Errors from parseGenerationResponse
              res.status(500).json({ message: error.message });
              return;
         }
        if (error instanceof GoogleGenerativeAIError || (error.response && error.response.promptFeedback)) {
             console.error("Gemini API Error Details:", JSON.stringify(error, null, 2));
             const blockReason = error.response?.promptFeedback?.blockReason;
             if (blockReason) {
                   res.status(400).json({ message: `Content generation blocked by AI: ${blockReason}` });
                   return;
             }
              res.status(500).json({ message: 'An error occurred while communicating with the AI service for generation.' });
              return;
         }
         if (error instanceof Error && error.name === 'CastError') { // If jobId format is wrong
              res.status(400).json({ message: 'Invalid job ID format' });
              return;
        }
        if (error.message.includes("PDF generation failed")) {
             res.status(500).json({ message: "Failed to generate PDF documents after AI processing."});
             return;
       }

        // Generic fallback
        res.status(500).json({ message: 'Failed to generate documents.', error: error.message || 'Unknown server error' });
    }
};

router.post('/:jobId', generateDocumentsHandler); // Use POST as it triggers a process


// --- GET /api/generator/download/:filename ---
// New endpoint to download the temporarily saved files
const downloadFileHandler: RequestHandler = async (req, res) => {
    // Apply authMiddleware here too if you want to ensure only the user who generated can download?
    // Or rely on obscure filenames? For simplicity now, we allow any authenticated user.
   if (!req.user) {
        res.status(401).json({ message: 'Authentication required to download.' });
        return;
   }

   const { filename } = req.params;
   // **SECURITY NOTE:** Basic sanitization. A robust solution would prevent path traversal (`../`).
   // Consider using a library for secure path joining or ensuring filename contains no slashes.
   const safeFilename = path.basename(filename); // Prevents basic directory traversal
   if (safeFilename !== filename) {
        res.status(400).json({ message: 'Invalid filename.' });
        return;
   }

   const TEMP_PDF_DIR = path.join(__dirname, '..', '..', 'temp_pdfs'); // Get temp dir path again
   const filePath = path.join(TEMP_PDF_DIR, safeFilename);

   try {
       // Check if file exists
       await fs.access(filePath); // Throws error if not found

       console.log(`Serving file for download: ${filePath}`);

       // Set headers for download
       res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`); // Tells browser to download
       res.setHeader('Content-Type', 'application/pdf');

       // Stream the file - use the standard fs module for createReadStream
       const fileStream = fsStandard.createReadStream(filePath);

        // Pipe the stream to the response
       fileStream.pipe(res);

       // --- Cleanup: Delete file after streaming ---
       fileStream.on('close', async () => {
           console.log(`Finished streaming ${safeFilename}, attempting cleanup.`);
           try {
               await fs.unlink(filePath); // Delete the temporary file
               console.log(`Successfully deleted temporary file: ${filePath}`);
           } catch (unlinkError) {
               console.error(`Error deleting temporary file ${filePath}:`, unlinkError);
               // Log error but don't prevent download completion
           }
       });

       fileStream.on('error', (streamError) => {
            console.error(`Error streaming file ${filePath}:`, streamError);
            // Try to send an error response if headers haven't been sent
           if (!res.headersSent) {
                res.status(500).json({ message: 'Error reading file for download.' });
           } else {
               // If headers already sent, just end the response abruptly
               res.end();
           }
            // Attempt cleanup even on stream error? Maybe not, file might be corrupted.
       });


   } catch (error) {
       // Handle file not found error (from fs.access)
       if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
           console.warn(`Download request for non-existent file: ${filePath}`);
            res.status(404).json({ message: 'File not found or already downloaded.' });
            return;
       }
       // Other errors
       console.error(`Error preparing file ${filePath} for download:`, error);
       res.status(500).json({ message: 'Server error preparing file for download.' });
   }
};
router.get('/download/:filename', downloadFileHandler);


export default router;