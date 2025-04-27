// server/src/routes/cv.ts
import express, { Router, Request, Response, RequestHandler } from 'express'; // Add RequestHandler
import multer from 'multer';
import authMiddleware from '../middleware/authMiddleware';
import User from '../models/User';
import geminiModel from '../utils/geminiClient'; // Import configured Gemini model
import { GoogleGenerativeAIError } from '@google/generative-ai'; 

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
    authMiddleware as RequestHandler, // Explicitly cast middleware
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
            console.log(`Processing file: ${req.file.originalname}, MIME Type: ${req.file.mimetype}, Size: ${req.file.size} bytes`);

            // 1. Prepare File Data Part for Gemini
            const fileDataPart = {
                inlineData: {
                    // Convert buffer to base64 is standard for inline data
                    data: req.file.buffer.toString('base64'),
                    mimeType: req.file.mimetype,
                },
            };

            // 2. Construct Gemini Prompt (Instruct it to use the file content)
            const prompt = `
                Analyze the content of the attached CV file (${req.file.originalname}) and convert it into a structured JSON object.
                The JSON object should have these top-level keys: "personalInfo", "summary", "experience", "education", "skills".

                - "personalInfo": An object containing "name", "email", "phone", "address", "linkedin" (if found in the file).
                - "summary": A string containing the professional summary or objective (if found).
                - "experience": An array of objects. Each object should have "jobTitle", "company", "location" (optional), "dates" (string, e.g., "Jan 2020 - Present"), and "description" (string or array of strings).
                - "education": An array of objects. Each object should have "degree", "institution", "location" (optional), and "dates" (string, e.g., "Sep 2015 - May 2019").
                - "skills": An array of strings listing technical and soft skills, or an object categorizing skills (e.g., {"Programming Languages": ["JavaScript", "Python"], "Tools": ["Docker", "Git"]}).

                Extract the information accurately based SOLELY on the provided file content. If a section or piece of information isn't present, omit the key or use an empty array/string/null where appropriate. Return ONLY the JSON object, enclosed in triple backticks with the json identifier.
            `;

            // 3. Call Gemini API with Prompt and File Data
            console.log("Sending request to Gemini with file data...");
            // Send prompt text AND file data part in an array
            const result = await geminiModel.generateContent([prompt, fileDataPart]);
            const response = result.response;
            const responseText = response.text();
            console.log("Received response from Gemini.");

            // 4. Parse Gemini Response into JSON
            const cvJson = parseGeminiResponse(responseText);
            // Add more robust validation of cvJson structure here if needed

            // 5. Save JSON to User document
            const updatedUser = await User.findByIdAndUpdate(
                req.user._id,
                { $set: { cvJson: cvJson } },
                { new: true }
            ).select('-passwordHash');

            if (!updatedUser) {
                 res.status(404).json({ message: "User not found after update." });
                 return;
            }

            console.log(`CV JSON saved for user ${req.user.email}`);
            res.status(200).json({
                message: 'CV uploaded and processed successfully.',
                cvData: updatedUser.cvJson
            });

        } catch (error: any) {
            console.error("CV Upload/Processing Error:", error);

            // Handle specific errors
            if (error instanceof Error && error.message.includes("Invalid file type")) {
                 res.status(400).json({ message: error.message });
                 return;
            }
            if (error instanceof Error && error.message.includes("AI failed to return valid JSON")) {
                  res.status(500).json({ message: error.message });
                  return;
             }
            // Handle potential Gemini API errors (e.g., safety blocks, unsupported file)
             if (error instanceof GoogleGenerativeAIError || (error.response && error.response.promptFeedback)) {
                 console.error("Gemini API Error Details:", JSON.stringify(error, null, 2));
                 // Check for specific block reasons
                 const blockReason = error.response?.promptFeedback?.blockReason;
                 if (blockReason) {
                       res.status(400).json({ message: `Content blocked by AI: ${blockReason}` });
                       return;
                 }
                  res.status(500).json({ message: 'An error occurred while communicating with the AI service.' });
                  return;
             }

            // Generic fallback
            res.status(500).json({ message: 'Failed to process CV.', error: error.message || 'Unknown server error' });
        }
    }
);

// Optional: GET route to retrieve the user's current CV JSON
router.get('/', authMiddleware as RequestHandler , async (req: Request, res: Response) => {
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