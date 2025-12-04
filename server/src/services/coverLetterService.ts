// server/src/services/coverLetterService.ts
import { JsonResumeSchema } from '../types/jsonresume';
import { generateContent } from '../utils/aiService';

/**
 * Generates a cover letter using Gemini API based on CV data and job description
 * @param userId The user ID to get the API key for
 * @param cvJson The user's CV in JSON Resume format
 * @param jobDescription The job description text
 * @param jobTitle The job title
 * @param companyName The company name
 * @param language The language for the cover letter ('en' or 'de')
 * @returns The generated cover letter text
 */
export async function generateCoverLetter(
    userId: string,
    cvJson: JsonResumeSchema,
    jobDescription: string,
    jobTitle: string,
    companyName: string,
    language: 'en' | 'de' = 'en'
): Promise<string> {
    const languageName = language === 'de' ? 'German' : 'English';
    const todayDateFormatted = new Date().toLocaleDateString(language === 'de' ? 'de-DE' : 'en-CA');

    // Construct a focused prompt for cover letter generation
    const prompt = `
You are an expert career advisor and professional cover letter writer specialized in the ${languageName} job market.
Your task is to write a compelling, tailored cover letter for a specific job application in ${languageName}.

**Target Language:** ${languageName} (${language})

**Inputs:**
1. **CV Data (JSON Resume Schema):**
\`\`\`json
${JSON.stringify(cvJson, null, 2)}
\`\`\`

2. **Target Job Information:**
   - Job Title: ${jobTitle}
   - Company: ${companyName}
   - Job Description:
   ---
   ${jobDescription}
   ---

**Instructions:**

Write a professional cover letter in ${languageName} following these guidelines:

1. **Header Section:**
   - Start the cover letter with the sender's contact information block at the very top
   - Extract the following details directly from the CV's \`basics\` section:
     * \`basics.name\`
     * \`basics.location.address\` (if available, include street address on its own line)
     * \`basics.location.city\`, \`basics.location.postalCode\` (combine on one line, e.g., "Berlin, 10117" or "12345 Example City")
     * \`basics.phone\` (if available, label appropriately, e.g., "Phone: +49 123 456789")
     * \`basics.email\` (if available, label appropriately, e.g., "Email: your.email@example.com")
   - Format these details cleanly as a standard sender address block, with each piece of information on a new line where appropriate
   - After the sender's address block, include today's date on its own line: ${todayDateFormatted}

2. **Salutation:**
   - Use "Dear Hiring Manager," for English or "Sehr geehrte Damen und Herren," for German
   - Only use a specific name if it can be reliably extracted from the job description

3. **Body Content (3-4 paragraphs):**
   - **Opening Paragraph:** Introduce yourself and clearly state the role you are applying for: "${jobTitle}" at "${companyName}". Express genuine enthusiasm for the position.
   - **Middle Paragraphs (1-2 paragraphs):** Highlight 2-3 key qualifications or experiences from your CV that directly match the most important requirements in the job description. Explain why these qualifications make you a strong fit. Use specific examples and achievements from your CV.
   - **Closing Paragraph:** Express your enthusiasm for the specific role and company. Include a call to action (e.g., expressing eagerness for an interview) and a professional closing (e.g., "Sincerely," / "Mit freundlichen Grüßen,").

4. **Tone and Style:**
   - Professional, confident, and enthusiastic
   - Tailored specifically to the job description
   - Use keywords from the job description naturally
   - Avoid generic phrases and clichés
   - Keep it concise (approximately 3-4 paragraphs in the body)
   - All content must be in ${languageName}

5. **Output Format:**
   - Return ONLY the complete cover letter text as a single string
   - Include the header with contact information and date
   - Include the salutation, body paragraphs, and closing
   - Use newline characters (\\n) to separate lines appropriately
   - Do NOT wrap the response in JSON or markdown code blocks
   - Do NOT include any explanations or additional text outside the cover letter content

**Important:** The entire cover letter must be returned as plain text, ready to use. Do not include placeholders or ask for additional information.
`;

    try {
        console.log(`Generating ${languageName} cover letter for ${jobTitle} at ${companyName}...`);
        
        const result = await generateContent(userId, prompt);
        const coverLetterText = result.text.trim();
        
        // Basic validation
        if (!coverLetterText || coverLetterText.length < 100) {
            throw new Error('Generated cover letter is too short or empty');
        }

        console.log(`Cover letter generated successfully (${coverLetterText.length} characters)`);
        return coverLetterText;

    } catch (error: any) {
        console.error('Error generating cover letter:', error);
        
        if (error.message) {
            throw error;
        }
        
        throw new Error(`Failed to generate cover letter: ${error.message || 'Unknown error'}`);
    }
}

