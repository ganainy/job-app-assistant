// server/src/services/jobAnalysisService.ts
import { getGeminiModel } from '../utils/geminiClient';

/**
 * Result of job posting analysis
 */
export interface JobAnalysisResult {
    extractedData: {
        skills: string[];
        salary?: {
            min?: number;
            max?: number;
            currency?: string;
        };
        yearsExperience?: number;
        location?: string;
        remoteOption?: string;
    };
}

/**
 * Result of company analysis
 */
export interface CompanyAnalysisResult {
    missionStatement?: string;
    coreValues?: string[];
    businessModel?: string;
}

/**
 * Analyze job posting using Gemini AI to extract key requirements
 */
export const analyzeJobPosting = async (
    jobDescription: string,
    geminiApiKey: string
): Promise<JobAnalysisResult> => {
    const gemini = getGeminiModel(geminiApiKey);

    const prompt = `You are a job application assistant analyzing a job posting.

Extract the following information from this job description:
- skills: Array of required technical and soft skills
- salary: Object with min, max (numbers), and currency (if mentioned)
- yearsExperience: Number of years of experience required (if mentioned)
- location: Job location (city, state, country, or "Remote")
- remoteOption: Type of remote work ("Remote", "Hybrid", "On-site", or null)

Job Description:
${jobDescription}

Return ONLY a JSON object with these fields. Use null for fields not found. Format:
{
  "extractedData": {
    "skills": ["skill1", "skill2"],
    "salary": { "min": 80000, "max": 120000, "currency": "USD" },
    "yearsExperience": 3,
    "location": "San Francisco, CA",
    "remoteOption": "Hybrid"
  }
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
    return parsed;
};

/**
 * Research company using Gemini AI to gather insights
 */
export const analyzeCompany = async (
    companyName: string,
    geminiApiKey: string
): Promise<CompanyAnalysisResult> => {
    const gemini = getGeminiModel(geminiApiKey);

    const prompt = `You are a job application assistant researching a company.

Research "${companyName}" and provide:
- missionStatement: The company's mission statement (1-2 sentences)
- coreValues: Array of core company values (3-5 values)
- businessModel: Brief description of their business model (1 sentence)

Return ONLY a JSON object with these fields. If information is not readily available, use your best judgment based on the company name and common knowledge. Format:
{
  "missionStatement": "...",
  "coreValues": ["value1", "value2", "value3"],
  "businessModel": "..."
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
    return parsed;
};

/**
 * Analyze both job and company in one call
 * More efficient for batch processing
 */
export const analyzeJobAndCompany = async (
    jobDescription: string,
    companyName: string,
    geminiApiKey: string
): Promise<{ job: JobAnalysisResult; company: CompanyAnalysisResult }> => {
    const [jobResult, companyResult] = await Promise.all([
        analyzeJobPosting(jobDescription, geminiApiKey),
        analyzeCompany(companyName, geminiApiKey)
    ]);

    return {
        job: jobResult,
        company: companyResult
    };
};
