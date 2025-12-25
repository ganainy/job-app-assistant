// server/src/utils/aiExtractor.ts
import axios from 'axios';
// Correct the import to use a named import
import { generateContent } from './aiService';
import { GoogleGenerativeAIError } from '@google/generative-ai';
import { cleanHtmlForAi } from './htmlCleaner';
import { NotFoundError } from './errors/AppError';

// Define the expected structure returned by Gemini
export interface ExtractedJobData {
    jobTitle: string | null;
    companyName: string | null;
    jobDescriptionText: string | null;
    language: string | null; // e.g., "en", "de", "es"
    location?: string | null; // Extracted location
    salary?: string | null; // Extracted salary info
    keyDetails?: string | null; // AI extracted highlights (bullet points)
    notes?: string; // Reserved for user, typically null from AI
}

// Fetch HTML with retry logic and increased timeout
async function fetchHtml(url: string, retries: number = 3): Promise<string> {
    const maxRetries = retries;
    const timeout = 45000; // Increased to 45 seconds for slow-responding sites
    const baseDelay = 2000; // Base delay of 2 seconds between retries

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`Fetching HTML for AI extraction (attempt ${attempt}/${maxRetries}): ${url}`);
        try {
            const response = await axios.get(url, {
                headers: { // Basic headers
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml',
                    'Accept-Language': 'en-US,en',
                },
                timeout: timeout,
                maxRedirects: 5, // Allow up to 5 redirects
            });
            if (response.status !== 200) throw new Error(`Status ${response.status}`);
            if (!response.data || typeof response.data !== 'string' || !response.data.toLowerCase().includes('<html')) {
                throw new Error('Invalid HTML content received.');
            }
            console.log(`Fetched HTML (length: ${response.data.length})`);
            return response.data;
        } catch (error: any) {
            const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
            const isLastAttempt = attempt === maxRetries;

            if (isLastAttempt) {
                console.error(`Error fetching URL ${url} for AI after ${maxRetries} attempts:`, error.message);
                const errorMessage = isTimeout
                    ? `Request timed out after ${timeout}ms. The website may be slow or unresponsive.`
                    : error.message;
                throw new Error(`Could not fetch content from URL for AI processing. ${errorMessage}`);
            }

            // Calculate exponential backoff delay: 2s, 4s, 8s, etc.
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.warn(`Attempt ${attempt} failed for ${url}: ${error.message}. Retrying in ${delay}ms...`);

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error(`Failed to fetch HTML after ${maxRetries} attempts`);
}

// Parse Gemini's JSON response for extracted data
function parseExtractionResponse(responseText: string): ExtractedJobData {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const jsonMatch = responseText.match(jsonRegex);
    if (jsonMatch && jsonMatch[1]) {
        const extractedJsonString = jsonMatch[1].trim();
        try {
            const parsed = JSON.parse(extractedJsonString);
            // Basic validation - check for essential fields (allow null for jobDescriptionText as fallback)
            if (typeof parsed.jobTitle === 'string' &&
                typeof parsed.companyName === 'string' &&
                (typeof parsed.jobDescriptionText === 'string' || parsed.jobDescriptionText === null) &&
                typeof parsed.language === 'string') {
                // If jobDescriptionText is null, provide a fallback
                if (parsed.jobDescriptionText === null) {
                    console.warn("AI returned null for jobDescriptionText. Using fallback description.");
                    parsed.jobDescriptionText = parsed.notes
                        ? `Job details: ${parsed.notes}`
                        : `Job posting at ${parsed.companyName || 'the company'}. Please refer to the original job posting for full details.`;
                }
                return parsed as ExtractedJobData; // Assume structure matches if key fields exist
            } else {
                console.warn("Parsed JSON from AI missing essential fields (jobTitle, companyName, jobDescriptionText, language):", parsed);
                throw new Error("AI response structure validation failed.");
            }
        } catch (e: any) {
            console.error("JSON.parse failed on extracted content:", e.message);
            throw new Error("AI response was not valid JSON.");
        }
    }
    console.error("AI response did not contain expected ```json formatting. Raw:", responseText);
    throw new Error("AI failed to return data in the expected JSON format.");
}


// Main function using Gemini to extract data from HTML
async function extractFieldsWithGemini(htmlContent: string, url: string, userId: string): Promise<ExtractedJobData> {
    console.log(`Requesting Gemini to extract fields from HTML (length: ${htmlContent.length}) for URL: ${url}`);
    const maxHtmlLength = 100000; // Maximum length after cleaning
    // Clean HTML to remove noise and extract main content before truncation
    htmlContent = cleanHtmlForAi(htmlContent, maxHtmlLength);

    // Detailed prompt asking for multiple fields and specific JSON output
    const prompt = `
        Analyze the following HTML source code from the webpage URL "${url}".
        Your task is to extract specific details about the job posting found on the page.

        Instructions:
        1. Identify the main job title.
        2. Identify the hiring company's name.
        3. Extract the full job description text, focusing on responsibilities, qualifications, requirements, benefits, and any other relevant details. This is CRITICAL - make every effort to extract the complete job description text. Look for sections like "Job Description", "Responsibilities", "Requirements", "Qualifications", "What we offer", etc. Ignore irrelevant page elements like headers, footers, navigation, ads, and unrelated content, but DO extract all job-related content.
        4. Determine the primary language of the job posting (e.g., "en" for English, "de" for German, "es" for Spanish, etc.). Use standard ISO 639-1 language codes if possible.
        5. Extract the job location (e.g., "remote", "Berlin", "Hybrid").
        6. Extract any salary or compensation information provided (e.g., "€60k - €80k", "$120,000", "Competitive").
        7. Place any other unexpected data, key details not covered above, or keywords relevant to the job application in the 'keyDetails' field. Format this strictly as a bulleted list (using '*' or '-') with newlines. Leave the 'notes' field NULL or empty.

        Output Format:
        Return ONLY a single JSON object enclosed in triple backticks (\`\`\`json ... \`\`\`). This JSON object MUST contain exactly these top-level keys: "jobTitle", "companyName", "jobDescriptionText", "language", "location", "salary", "keyDetails", and "notes".
        - jobTitle, companyName, language, location, salary, and keyDetails should be strings if found, or null.
        - jobDescriptionText is REQUIRED.
        - 'notes' should be null.

        Example structure:
        \`\`\`json
        {
          "jobTitle": "Software Engineer",
          "companyName": "Tech Corp",
          "jobDescriptionText": "...",
          "language": "en",
          "location": "Berlin / Hybrid",
          "salary": "€80k",
          "keyDetails": "* Contract: Full-time\n* Benefits: Health, Gym",
          "notes": null
        }
        \`\`\`

        HTML Source Code:
        ---
        ${htmlContent}
        ---
    `;

    try {
        const result = await generateContent(userId, prompt);
        const responseText = result.text;
        console.log("Received field extraction response from AI.");
        return parseExtractionResponse(responseText); // Parse and validate structure

    } catch (error: any) {
        console.error("Error during Gemini field extraction:", error);

        // Preserve NotFoundError (e.g., missing API key) with its detailed message
        if (error instanceof NotFoundError) {
            throw error;
        }

        // Handle Gemini API errors
        if (error instanceof GoogleGenerativeAIError || (error.response && error.response.promptFeedback)) {
            const blockReason = error.response?.promptFeedback?.blockReason;
            throw new Error(`AI content generation blocked during extraction: ${blockReason || 'Unknown reason'}`);
        }

        // For other errors, preserve the original message if available
        if (error?.message) {
            throw new Error(error.message);
        }

        throw new Error("Failed to get valid extraction response from AI service.");
    }
}

// Main exported function for this utility
export async function extractJobDataFromUrl(url: string, userId: string): Promise<ExtractedJobData> {
    if (!url || !url.startsWith('http')) {
        throw new Error("Invalid or missing URL provided.");
    }
    const html = await fetchHtml(url);
    const extractedData = await extractFieldsWithGemini(html, url, userId);

    // Add final check for essential nulls after AI processing
    // Note: jobDescriptionText may have been set to a fallback value in parseExtractionResponse
    if (!extractedData.jobTitle || !extractedData.companyName || !extractedData.jobDescriptionText || !extractedData.language) {
        console.warn("AI failed to extract one or more essential fields (Title, Company, Description, Language). Extracted:", extractedData);
        throw new Error("AI could not extract all essential job details from the page.");
    }

    return extractedData;
}

// Extract job data from pasted text content (no URL fetching)
export async function extractJobDataFromText(rawText: string, userId: string): Promise<ExtractedJobData> {
    if (!rawText || rawText.trim().length < 50) {
        throw new Error("Please paste more job description text. The content seems too short.");
    }

    console.log(`Extracting job data from pasted text (length: ${rawText.length})`);

    // Truncate if too long
    const maxLength = 100000;
    const textContent = rawText.length > maxLength ? rawText.substring(0, maxLength) : rawText;

    // Prompt for extracting from raw text
    const prompt = `
        Analyze the following text that was copied from a job posting webpage.
        Your task is to extract specific details about the job posting.

        Instructions:
        1. Identify the main job title.
        2. Identify the hiring company's name.
        3. Extract the full job description text, focusing on responsibilities, qualifications, requirements, benefits, and any other relevant details.
        4. Determine the primary language of the job posting (e.g., "en" for English, "de" for German, "es" for Spanish). Use standard ISO 639-1 language codes.
        5. Extract the job location (e.g., "remote", "Berlin", "Hybrid").
        6. Extract any salary or compensation information provided.
        7. Place any other unexpected data, key details not covered above, or keywords relevant to the job application in the 'keyDetails' field. Format this strictly as a bulleted list. Leave the 'notes' field NULL.

        Output Format:
        Return ONLY a single JSON object enclosed in triple backticks (\`\`\`json ... \`\`\`). This JSON object MUST contain exactly these top-level keys: "jobTitle", "companyName", "jobDescriptionText", "language", "location", "salary", "keyDetails", and "notes".
        - jobTitle, companyName, language, location, salary, and keyDetails should be strings if found, or null.
        - jobDescriptionText is REQUIRED.
        - 'notes' should be null.

        Example structure:
        \`\`\`json
        {
          "jobTitle": "Software Engineer",
          "companyName": "Tech Corp",
          "jobDescriptionText": "...",
          "language": "en",
          "location": "SF",
          "salary": "$150k",
          "keyDetails": "* Visa Sponsorship: Yes\n* Team: 5 ppl",
          "notes": null
        }
        \`\`\`

        Job Posting Text:
        ---
        ${textContent}
        ---
    `;

    try {
        const result = await generateContent(userId, prompt);
        const responseText = result.text;
        console.log("Received field extraction response from AI for pasted text.");
        const extractedData = parseExtractionResponse(responseText);

        // Validate essential fields
        if (!extractedData.jobTitle || !extractedData.companyName || !extractedData.jobDescriptionText || !extractedData.language) {
            console.warn("AI failed to extract essential fields from pasted text. Extracted:", extractedData);
            throw new Error("Could not extract all essential job details from the pasted text. Please paste more complete job information.");
        }

        return extractedData;

    } catch (error: any) {
        console.error("Error during AI extraction from pasted text:", error);

        // Preserve NotFoundError (e.g., missing API key)
        if (error instanceof NotFoundError) {
            throw error;
        }

        // Handle Gemini API errors
        if (error instanceof GoogleGenerativeAIError || (error.response && error.response.promptFeedback)) {
            const blockReason = error.response?.promptFeedback?.blockReason;
            throw new Error(`AI content generation blocked: ${blockReason || 'Unknown reason'}`);
        }

        // Preserve original message if available
        if (error?.message) {
            throw new Error(error.message);
        }

        throw new Error("Failed to extract job details from the pasted text.");
    }
}