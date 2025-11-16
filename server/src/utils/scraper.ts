// server/src/utils/scraper.ts
import axios from 'axios';
// Correct the import to use a named import
import { getGeminiModel } from './geminiClient'; // Need Gemini client here
import { GoogleGenerativeAIError } from '@google/generative-ai'; // Import error type
import { getGeminiApiKey } from './apiKeyHelpers';
import { cleanHtmlForAi } from './htmlCleaner';

// Keep fetchHtml function (modified slightly for clarity)
async function fetchHtml(url: string): Promise<string> {
    console.log(`Fetching HTML for: ${url}`);
    try {
        const response = await axios.get(url, {
            headers: { // Basic headers
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml',
                'Accept-Language': 'en-US,en',
            },
            timeout: 15000 // Increased timeout slightly
        });
        if (response.status !== 200) {
            throw new Error(`Failed to fetch URL: Status ${response.status}`);
        }
        // Basic check if response looks like HTML
        if (!response.data || typeof response.data !== 'string' || !response.data.toLowerCase().includes('<html')) {
            throw new Error('Response did not appear to be valid HTML content.');
        }
        console.log(`Successfully fetched HTML (length: ${response.data.length})`);
        return response.data;
    } catch (error: any) {
        console.error(`Error fetching URL ${url}:`, error.message);
        throw new Error(`Could not fetch content from URL. ${error.message}`);
    }
}

// NEW: Function to extract description using Gemini
async function extractDescriptionWithGemini(htmlContent: string, url: string, userId: string): Promise<string | null> {
    console.log(`Requesting Gemini to extract description from HTML (length: ${htmlContent.length}) for URL: ${url}`);

    // Clean HTML to remove noise and extract main content before truncation
    const maxHtmlLength = 100000; // Maximum length after cleaning
    htmlContent = cleanHtmlForAi(htmlContent, maxHtmlLength);

    // Construct prompt for Gemini
    const prompt = `
        Analyze the following HTML source code from the webpage URL "${url}".
        Your task is to extract the main job description text. Ignore navigation menus, sidebars, headers, footers, ads, related job links, and application forms.
        Focus solely on the section detailing the responsibilities, qualifications, requirements, and details about the specific job role being advertised.
        Return ONLY the extracted job description text as plain text. Do not include any introductory phrases like "Here is the job description:". Just return the text itself. If no clear job description is found, return the string "NO_DESCRIPTION_FOUND".

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
        const extractedText = response.text()?.trim(); // Get text and trim whitespace

        if (extractedText && extractedText !== "NO_DESCRIPTION_FOUND" && extractedText.length > 50) { // Check if meaningful text was found
            console.log(`Gemini extracted description (length: ${extractedText.length})`);
            // Optional: Further cleanup (e.g., removing excessive newlines)
            return extractedText.replace(/\n\s*\n/g, '\n'); // Replace multiple blank lines with one
        } else {
            console.warn("Gemini did not find a suitable job description or returned 'NO_DESCRIPTION_FOUND'.");
            return null;
        }
    } catch (error: any) {
        console.error("Error during Gemini description extraction:", error);
        if (error instanceof GoogleGenerativeAIError || (error.response && error.response.promptFeedback)) {
            console.error("Gemini API Error Details for extraction:", JSON.stringify(error, null, 2));
            const blockReason = error.response?.promptFeedback?.blockReason;
            if (blockReason) {
                throw new Error(`AI content generation blocked during extraction: ${blockReason}`);
            }
        }
        throw new Error("Failed to get valid extraction response from AI service.");
    }
}


// --- Modified Main Scraper Function ---
export async function scrapeJobDescription(url: string, userId: string): Promise<string> {
    console.log(`Starting AI-powered scrape for URL: ${url}`);
    if (!url || !url.startsWith('http')) {
        throw new Error("Invalid or missing URL provided for scraping.");
    }

    // Step 1: Fetch HTML using Axios
    const html = await fetchHtml(url);

    // Step 2: Extract Description using Gemini
    const description = await extractDescriptionWithGemini(html, url, userId);

    // Step 3: Check result
    if (!description) {
        throw new Error("AI could not extract a valid job description from the page content.");
    }

    return description;
}