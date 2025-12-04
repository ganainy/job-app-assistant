// server/src/services/jobRelevanceService.ts
import { getGeminiModel } from '../utils/geminiClient';

/**
 * Result of relevance check
 */
export interface RelevanceResult {
    isRelevant: boolean;
    reason: string;
}

/**
 * Check if a job is relevant to the user's resume
 * Uses Gemini AI to make intelligent relevance decisions
 */
export const checkRelevance = async (
    structuredResume: any,
    jobDescription: string,
    geminiApiKey: string
): Promise<RelevanceResult> => {
    const gemini = getGeminiModel(geminiApiKey);

    // Extract key info from structured resume for the prompt
    const resumeSummary = JSON.stringify({
        summary: structuredResume.summary,
        skills: structuredResume.skills,
        experience: structuredResume.experience?.map((exp: any) => ({
            title: exp.title,
            company: exp.company
        }))
    }, null, 2);

    const prompt = `You are a job filtering assistant helping a job seeker find relevant opportunities.

Given this candidate's resume summary:
${resumeSummary}

And this job description:
${jobDescription}

Determine if this job is a good fit for the candidate. Consider:
- Skill match (do they have the required skills?)
- Experience level match (does their experience align with requirements?)
- Career progression (is this a logical next step?)

Return ONLY a JSON object with:
{
  "isRelevant": true or false,
  "reason": "Brief explanation (1-2 sentences) of why it is or isn't relevant"
}`;

    const result = await gemini.generateContent(prompt);
    const responseText = result.response.text();

    // Clean up response
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(jsonText);
    return {
        isRelevant: parsed.isRelevant,
        reason: parsed.reason
    };
};
