// server/src/routes/cv.ts
import express, { Router, Request, Response, RequestHandler } from 'express'; // Add RequestHandler
import multer from 'multer';
import authMiddleware from '../middleware/authMiddleware';
import User from '../models/User';
import geminiModel from '../utils/geminiClient'; // Import configured Gemini model
import { GoogleGenerativeAIError } from '@google/generative-ai';
import { JsonResumeSchema } from '../types/jsonresume';

const router: Router = express.Router();

// Configure Multer for in-memory storage (easier for processing)
// Increase limits if handling large CVs
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Increased limit slightly for files (e.g., 10MB)
    fileFilter: (req, file, cb) => {
        // Accept common document types Gemini might handle (check Gemini docs for full list)
        const allowedTypes = [
            'application/pdf',
            'application/rtf', 'text/rtf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/msword', // .doc (might be less reliable)
            'text/plain' // .txt
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Allowed types: PDF, RTF, DOCX, TXT.'));
        }
    }
});

// --- MODIFIED Helper Function to Parse Gemini Response (JSON Resume specific) ---
function parseJsonResponseToSchema(responseText: string, schemaType: 'JsonResume'): JsonResumeSchema | null { // Made more specific
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const jsonMatch = responseText.match(jsonRegex);

    if (jsonMatch && jsonMatch[1]) {
        const extractedJsonString = jsonMatch[1].trim();
        console.log(`Attempting to parse JSON for ${schemaType} schema...`);
        try {
            const parsedObject = JSON.parse(extractedJsonString);

            // Basic validation: check if it's an object and maybe has a 'basics' key as expected
            if (typeof parsedObject === 'object' && parsedObject !== null) {
                console.log(`${schemaType} schema parsed successfully (basic check).`);
                // NOTE: Add more thorough validation against the JsonResumeSchema interface here if needed
                // This could involve checking types of nested properties, required fields etc.
                // For now, we'll trust the AI + basic object check.
                return parsedObject as JsonResumeSchema; // Cast to our interface
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


// --- Helper Function to Parse Gemini Response ---
function parseGeminiResponse(responseText: string): any {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const jsonMatch = responseText.match(jsonRegex);

    if (jsonMatch && jsonMatch[1]) {
        const extractedJson = jsonMatch[1].trim(); // <-- Trim whitespace
        console.log("Attempting to parse extracted JSON content..."); // Added log
        try {
            return JSON.parse(extractedJson); // Parse the trimmed content
        } catch (parseError: any) {
            console.error("JSON.parse failed on extracted content:", parseError.message);
            console.error("Extracted Content causing failure:\n---\n", extractedJson, "\n---"); // Log the problematic string
            // Fall through to throw the generic error
        }
    } else {
        // If the ```json ``` block wasn't found at all
        console.warn("Gemini response did not contain ```json formatting. Cannot parse.");
        // Consider trying a direct parse only if you sometimes expect plain JSON without backticks
        /*
        try {
             console.log("Attempting direct parse as fallback...");
             return JSON.parse(responseText.trim());
        } catch (directParseError: any) {
             console.error("Direct JSON.parse failed:", directParseError.message);
             // Fall through
        }
        */
    }

    // If parsing failed above or format wasn't found
    console.error("Could not parse valid JSON from Gemini response. Raw response:\n---\n", responseText, "\n---");
    throw new Error("AI failed to return valid JSON structure.");
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

            // 1. Prepare File Data Part (as before)
            const fileDataPart = {
                inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype }
            };

            // 2. Construct MODIFIED Gemini Prompt (Targeting JSON Resume Schema)
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

                Output Format:
                Return ONLY a single, valid JSON object enclosed in triple backticks (\`\`\`json ... \`\`\`) that strictly adheres to the JSON Resume Schema structure. Do not include any explanatory text before or after the JSON block.
            `;

            // 3. Call Gemini API (as before)
            console.log("Sending CV parsing request to Gemini...");
            const result = await geminiModel.generateContent([prompt, fileDataPart]); // Send prompt and file data
            const response = result.response;
            const responseText = response.text();
            console.log("Received CV parsing response from Gemini.");

            // 4. Parse Gemini Response into JSON Resume Schema object
            const cvJsonResume = parseJsonResponseToSchema(responseText, 'JsonResume'); // Use modified parser

            if (!cvJsonResume) { // Check if parsing returned null due to format errors
                throw new Error("Failed to parse Gemini response into valid JSON Resume structure.");
            }

            // 5. Save JSON to User document
            const updatedUser = await User.findByIdAndUpdate(
                req.user._id,
                { $set: { cvJson: cvJsonResume } }, // Save the schema-compliant JSON
                { new: true }
            ).select('-passwordHash -cvJson'); // Exclude password and potentially large CV from response

            if (!updatedUser) { res.status(404).json({ message: "User not found after update." }); return; }

            console.log(`JSON Resume CV data saved for user ${req.user.email}`);
            res.status(200).json({
                message: 'CV uploaded and parsed successfully (JSON Resume format).',
                // Send back confirmation, maybe just the basics or nothing to avoid large payload
                // cvData: cvJsonResume // Decide if frontend needs the full parsed data immediately
            });

        } catch (error: any) {
            console.error("CV Upload/Parsing Error:", error);
            // Handle specific errors (file type, AI block, parsing fail)
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
            res.status(500).json({ message: 'Failed to process CV.', error: error.message || 'Unknown server error' });
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
        // User might not have cvJson yet if they haven't uploaded
        res.status(200).json({ cvData: req.user.cvJson || null });
    } catch (error) {
        console.error("Error fetching CV data:", error);
        res.status(500).json({ message: 'Failed to retrieve CV data.' });
    }
});


export default router;