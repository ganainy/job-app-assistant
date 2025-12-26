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
    language: 'en' | 'de' = 'en',
    customPrompt?: string
): Promise<string> {
    const languageName = language === 'de' ? 'German' : 'English';
    const todayDateFormatted = new Date().toLocaleDateString(language === 'de' ? 'de-DE' : 'en-CA');

    let prompt: string;

    if (customPrompt) {
        // Use custom prompt but inject necessary context variables
        prompt = customPrompt
            .replace('{{language}}', languageName)
            .replace('{{cvData}}', JSON.stringify(cvJson, null, 2))
            .replace('{{jobTitle}}', jobTitle)
            .replace('{{companyName}}', companyName)
            .replace('{{jobDescription}}', jobDescription)
            .replace('{{todayDate}}', todayDateFormatted);

        // Fallback: If variables aren't used, append context at the end to ensure AI has data
        if (!customPrompt.includes('{{cvData}}')) {
            prompt += `\n\n**Context Data:**\nCV Data: ${JSON.stringify(cvJson, null, 2)}\nJob Description: ${jobDescription}\nJob Title: ${jobTitle}\nCompany: ${companyName}\nLanguage: ${languageName}`;
        }
    } else {
        // Construct a focused prompt for cover letter generation
        prompt = `
You are a professional candidate applying for a job. Your task is to write a short, authentic, and human-sounding cover letter in ${languageName}.

**Target Language:** ${languageName} (${language})

**Inputs:**
1. **My Experience (CV Data):**
\`\`\`json
${JSON.stringify(cvJson, null, 2)}
\`\`\`

2. **The Job (Description & Details):**
   - Job Title: ${jobTitle}
   - Company: ${companyName}
   - Description:
   ---
   ${jobDescription}
   ---

**Instructions for Writing:**

1.  **Header:** Start with my contact info (Name, Address, Phone, Email) from the CV \`basics\` section, formatted as a standard letter header. Follow with today's date: ${todayDateFormatted}.

2.  **Tone & Style:**
    -   **Be Human:** Write naturally. Avoid "AI buzzwords" (like "I am thrilled to submit," "aligns perfectly," "unwavering commitment"). Use simple, strong verbs.
    -   **Be Concise:** Keep it short (max 250 words excluding header). Get to the point.
    -   **Be Specific:** Do not summarize my whole career. Pick 1-2 specific achievements from the CV that *directly* solve a problem mentioned in the Job Description.
    -   **No Fluff:** Skip empty adjectives. Show, don't tell.

3.  **Structure:**
    -   **Salutation:** "Dear Hiring Manager," (or German equivalent).
    -   **Opening:** Briefly state what I'm applying for and why I'm interested (1 sentence).
    -   **Middle:** Connect *one* specific past success to a key requirement of this job. Explain how I can help them immediately.
    -   **Closing:** A quick wrap-up and call to action (e.g., "I'd love to discuss how I can help [Company Name]..."). Sign off professionally.

**Output:**
-   Return ONLY the final cover letter text.
-   No markdown blocks, no explanations.
`;
    }

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

