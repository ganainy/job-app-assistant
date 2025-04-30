// server/src/utils/aiExtractor.ts
import axios from 'axios';
// Correct the import to use a named import
import { geminiModel } from './geminiClient';
import { GoogleGenerativeAIError } from '@google/generative-ai';

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
            // Basic validation - check for essential fields
            if (typeof parsed.jobTitle === 'string' &&
                typeof parsed.companyName === 'string' &&
                typeof parsed.jobDescriptionText === 'string' &&
                typeof parsed.language === 'string') {
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
async function extractFieldsWithGemini(htmlContent: string, url: string): Promise<ExtractedJobData> {
    console.log(`Requesting Gemini to extract fields from HTML (length: ${htmlContent.length}) for URL: ${url}`);
    const maxHtmlLength = 100000; // Truncate if needed
    if (htmlContent.length > maxHtmlLength) {
        console.warn(`HTML content truncated to ${maxHtmlLength} characters for Gemini prompt.`);
        htmlContent = htmlContent.substring(0, maxHtmlLength);
    }

    // Detailed prompt asking for multiple fields and specific JSON output
    const prompt = `
        Analyze the following HTML source code from the webpage URL "${url}".
        Your task is to extract specific details about the job posting found on the page.

        Instructions:
        1. Identify the main job title.
        2. Identify the hiring company's name.
        3. Extract the full job description text, focusing on responsibilities, qualifications, etc. Ignore irrelevant page elements like headers, footers, navigation, ads, and unrelated content.
        4. Determine the primary language of the job posting (e.g., "en" for English, "de" for German, "es" for Spanish, etc.). Use standard ISO 639-1 language codes if possible.
        5. Optionally, extract any other key details or keywords relevant to the job application (e.g., location, salary if explicitly mentioned, required technologies) and provide them as a single string in the 'notes' field.

        Output Format:
        Return ONLY a single JSON object enclosed in triple backticks (\`\`\`json ... \`\`\`). This JSON object MUST contain exactly these top-level keys: "jobTitle", "companyName", "jobDescriptionText", "language", and optionally "notes".
        - If a required field (jobTitle, companyName, jobDescriptionText, language) cannot be reliably determined, return null for its value.
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
        const result = await geminiModel.generateContent(prompt);
        const response = result.response;
        const responseText = response.text();
        console.log("Received field extraction response from Gemini.");
        return parseExtractionResponse(responseText); // Parse and validate structure

    } catch (error: any) {
        console.error("Error during Gemini field extraction:", error);
        if (error instanceof GoogleGenerativeAIError || (error.response && error.response.promptFeedback)) {
            const blockReason = error.response?.promptFeedback?.blockReason;
            throw new Error(`AI content generation blocked during extraction: ${blockReason || 'Unknown reason'}`);
        }
        throw new Error("Failed to get valid extraction response from AI service.");
    }
}

// Main exported function for this utility
export async function extractJobDataFromUrl(url: string): Promise<ExtractedJobData> {
    if (!url || !url.startsWith('http')) {
        throw new Error("Invalid or missing URL provided.");
    }
    const html = await fetchHtml(url);
    const extractedData = await extractFieldsWithGemini(html, url);

    // Add final check for essential nulls after AI processing
    if (!extractedData.jobTitle || !extractedData.companyName || !extractedData.jobDescriptionText || !extractedData.language) {
        console.warn("AI failed to extract one or more essential fields (Title, Company, Description, Language). Extracted:", extractedData);
        throw new Error("AI could not extract all essential job details from the page.");
    }

    return extractedData;
}