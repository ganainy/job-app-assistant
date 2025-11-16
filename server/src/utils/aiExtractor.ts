// server/src/utils/aiExtractor.ts
import axios from 'axios';
// Correct the import to use a named import
import { getGeminiModel } from './geminiClient';
import { GoogleGenerativeAIError } from '@google/generative-ai';
import { getGeminiApiKey } from './apiKeyHelpers';
import { cleanHtmlForAi } from './htmlCleaner';
import { NotFoundError } from './errors/AppError';

// Define the expected structure returned by Gemini
export interface ExtractedJobData {
    jobTitle: string | null;
    companyName: string | null;
    jobDescriptionText: string | null;
    language: string | null; // e.g., "en", "de", "es"
    notes?: string; // Optional additional notes/keywords extracted
}

// Fetch HTML (same as before, slightly refined)
async function fetchHtml(url: string): Promise<string> {
    console.log(`Fetching HTML for AI extraction: ${url}`);
    try {
        const response = await axios.get(url, {
            headers: { // Basic headers
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml',
                'Accept-Language': 'en-US,en',
            },
            timeout: 15000
        });
        if (response.status !== 200) throw new Error(`Status ${response.status}`);
        if (!response.data || typeof response.data !== 'string' || !response.data.toLowerCase().includes('<html')) {
            throw new Error('Invalid HTML content received.');
        }
        console.log(`Fetched HTML (length: ${response.data.length})`);
        return response.data;
    } catch (error: any) {
        console.error(`Error fetching URL ${url} for AI:`, error.message);
        throw new Error(`Could not fetch content from URL for AI processing. ${error.message}`);
    }
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
        5. Optionally, extract any other key details or keywords relevant to the job application (e.g., location, salary if explicitly mentioned, required technologies) and provide them as a single string in the 'notes' field.

        Output Format:
        Return ONLY a single JSON object enclosed in triple backticks (\`\`\`json ... \`\`\`). This JSON object MUST contain exactly these top-level keys: "jobTitle", "companyName", "jobDescriptionText", "language", and optionally "notes".
        - jobTitle, companyName, and language should always be strings if found. If not found, return null.
        - jobDescriptionText is REQUIRED and should be a string containing the full job description. Only return null if absolutely no job description content can be found anywhere on the page (this should be very rare).
        - For 'notes', return a string or null if no extra details are found.

        Example structure:
        \`\`\`json
        {
          "jobTitle": "Software Engineer",
          "companyName": "Tech Corp",
          "jobDescriptionText": "We are looking for a skilled engineer...",
          "language": "en",
          "notes": "Location: Berlin, Salary: €80k, Required: React, Node.js"
        }
        \`\`\`

        HTML Source Code:
        ---
        ${htmlContent}
        ---
    `;

    try {
        // Get user's Gemini API key
        const apiKey = await getGeminiApiKey(userId);
        const model = getGeminiModel(apiKey);
        
        const result = await model.generateContent(prompt);
        const response = result.response;
        const responseText = response.text();
        console.log("Received field extraction response from Gemini.");
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