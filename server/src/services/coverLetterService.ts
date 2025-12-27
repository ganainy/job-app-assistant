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
        prompt = `You are a hiring expert helping me write a short, natural-sounding cover letter for a software role.

**Target Language:** ${languageName}

**Inputs:**
1. **CV Data:**
\`\`\`json
${JSON.stringify(cvJson, null, 2)}
\`\`\`

2. **Job Information:**
   - Job Title: ${jobTitle}
   - Company: ${companyName}
   - Job Description:
   ---
   ${jobDescription}
   ---

**Instructions:**

Use ONLY information from my CV and the job description. If a requirement from the job is not covered by my CV, do not invent it; instead, mention honestly that I have not done it yet and that I am motivated and willing to learn it quickly.

**My goal:**
Write a cover letter that sounds like a human wrote it, not an AI.

**Structure:**

1. **Header:**
   - Start with my contact info (Name, Address, Phone, Email) from the CV \`basics\` section.
   - Follow with today's date: ${todayDateFormatted}

2. **Salutation:**
   - "Dear Hiring Manager," (or ${languageName} equivalent).

3. **First paragraph:**
   - Refer to the role and company by name.
   - One sentence on why the role interests me.
   - One sentence connecting my background to their main focus (e.g. mobile, backend, Kotlin, Java, TypeScript, Android).

4. **Second paragraph:**
   - Pick 2–3 of the most relevant experiences from my CV and relate them directly to the job requirements.
   - Use concrete, down-to-earth phrasing (e.g. “built”, “debugged”, “shipped”, “worked in a small team”) instead of hype.
   - If the job asks for skills/technologies not clearly in my CV, explicitly say something like: “I have not worked with [MISSING-SKILL] yet, but I have done [RELATED-THING from my CV], and I am confident I can learn [MISSING-SKILL] quickly.”

5. **Third paragraph:**
   - One sentence about what I want to contribute/learn in this role.
   - One sentence about availability (e.g. starting date) if it is in my CV or I provide it.
   - Simple closing line (no clichés like “dream job” or “perfect fit”).

**Style guidelines:**
- Use first person singular (“I”) and simple, clear language.
- Use short to medium-length sentences.
- Avoid very formal phrases like “herewith”, “therefore”, or “to whom it may concern”.
- Avoid listing too many technologies; choose only those that match the job description.
- Do not copy sentences from my CV; rephrase them.
- IF job location not near where i live: mention that iam willing to relocate.
- Cover letter language: same as job description language (${languageName}).
- Keep it concise: max 3 short paragraphs, around 200–250 words.
- No buzzword stuffing, no exaggerated claims, no generic filler.
- Match the tone of a normal, motivated junior/mid software engineer.

**Output:**
- Return ONLY the final cover letter text.
- No markdown blocks, no explanations.`;
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

