// Gemini-based ATS analysis service
import { generateJsonAnalysis } from '../utils/geminiClient';
import { JsonResumeSchema } from '../types/jsonresume';
import { convertJsonResumeToText } from '../utils/cvTextExtractor';
import { ISkillMatchDetails, IAtsComplianceDetails } from '../models/CvAnalysis';

interface GeminiAtsResponse {
    atsScore: number; // Overall ATS compatibility score (0-100)
    matchedKeywords: string[]; // Keywords from job description found in CV
    missingKeywords: string[]; // Important keywords from job description missing in CV
    matchedSkills: string[]; // Skills from job description found in CV
    missingSkills: string[]; // Important skills from job description missing in CV
    formattingIssues: string[]; // Formatting problems that affect ATS parsing
    recommendations: string[]; // Specific actionable recommendations
    sectionScores?: Record<string, number>; // Scores for different CV sections
    skillMatchPercentage?: number; // Percentage of required skills matched
    gapAnalysis?: Record<string, any>; // Detailed gap analysis
}

/**
 * Analyzes CV against job description using Gemini AI for ATS compatibility
 * @param cvJson - The CV in JSON Resume format
 * @param jobDescription - Optional job description for matching analysis
 * @returns ATS analysis results compatible with existing interface
 */
export async function analyzeWithGemini(
    cvJson: JsonResumeSchema,
    jobDescription?: string
): Promise<{ 
    score: number | null; 
    details: {
        skillMatchDetails: ISkillMatchDetails | null;
        complianceDetails: IAtsComplianceDetails | null;
    };
    error?: string;
}> {
    try {
        // Convert CV to text format for better context
        const cvText = convertJsonResumeToText(cvJson);
        const cvJsonString = JSON.stringify(cvJson, null, 2);

        // Create comprehensive ATS analysis prompt
        let prompt = `
You are an expert ATS (Applicant Tracking System) analyzer. Your task is to analyze a CV/resume for ATS compatibility and match it against a job description if provided.

**Analysis Requirements:**

1. **Resume Matching Percentage (0-100) - This is the core feature:**
   - Calculate and provide a "resume matching percentage" that shows precisely how well the resume aligns with the job requirements
   - This percentage is the primary score that indicates resume-to-job-description alignment
   - When a job description is provided, this score should reflect keyword matching, skill alignment, and overall fit
   - When no job description is provided, evaluate general ATS compatibility (structure, formatting, keyword optimization)
   - Higher percentages indicate better alignment with job requirements

2. **Keyword Highlighting:**
   - If a job description is provided, identify and highlight ALL keywords from the job description that appear in the CV
   - These matched keywords should be clearly listed and emphasized
   - Focus on technical terms, skills, qualifications, industry-specific terminology, and key phrases
   - The keyword highlighting feature allows users to see exactly which keywords are a match between the two documents

3. **Identifying Gaps - Missing Keywords:**
   - Identify which keywords from the job description are MISSING from the CV
   - This gap identification is crucial for getting the resume shortlisted
   - Missing keywords are the most important factor for improving resume visibility in ATS systems
   - Clearly list all missing keywords that the company is looking for
   - Emphasize that these missing keywords are critical for resume shortlisting

4. **Skill Matching:**
   - If a job description is provided, identify required skills
   - List matched skills (skills from job description found in CV)
   - List missing skills (important skills from job description not found in CV)
   - Calculate skill match percentage as part of the overall resume matching percentage

5. **Formatting Issues:**
   - Identify formatting problems that could confuse ATS systems
   - Examples: complex tables, graphics, non-standard section names, special characters
   - List specific formatting issues found

6. **Recommendations:**
   - Provide specific, actionable recommendations to improve ATS compatibility
   - Focus on: adding missing keywords naturally (crucial for shortlisting), improving structure, fixing formatting issues
   - Prioritize recommendations by importance, with missing keywords being the highest priority

7. **Section Scores (optional):**
   - Provide ATS compatibility scores for major sections (work, education, skills, etc.)
   - Scores should be 0-100

8. **Gap Analysis (optional):**
   - If job description provided, analyze gaps between CV and job requirements
   - Identify areas where CV could be improved to better match the job
   - Emphasize missing keywords as the key gaps that need to be addressed

**CV Content:**
${cvText}

**CV JSON Structure:**
${cvJsonString}
`;

        if (jobDescription) {
            prompt += `\n\n**Job Description:**\n${jobDescription}\n\nAnalyze the CV specifically against this job description. Calculate the resume matching percentage that shows how well the resume aligns with these job requirements. Focus on keyword matching (highlight matched keywords, identify missing keywords crucial for shortlisting), skill alignment, and overall fit. The resume matching percentage is the primary metric showing alignment between the CV and job description.`;
        } else {
            prompt += `\n\n**Note:** No job description provided. Perform general ATS compatibility analysis focusing on structure, formatting, and keyword optimization best practices. Provide a resume matching percentage based on general ATS compatibility.`;
        }

        prompt += `\n\n**Output Format:**\nReturn ONLY a JSON object wrapped in triple backticks (\`\`\`json ... \`\`\`) with the following structure:
{
  "atsScore": <number 0-100>,
  "matchedKeywords": <array of strings>,
  "missingKeywords": <array of strings>,
  "matchedSkills": <array of strings>,
  "missingSkills": <array of strings>,
  "formattingIssues": <array of strings>,
  "recommendations": <array of strings>,
  "sectionScores": <object with section names as keys and scores 0-100 as values, optional>,
  "skillMatchPercentage": <number 0-100, optional>,
  "gapAnalysis": <object with gap details, optional>
}`;

        // Call Gemini API
        const geminiResult: GeminiAtsResponse = await generateJsonAnalysis<GeminiAtsResponse>(
            prompt,
            cvJsonString
        );

        // Map Gemini results to existing interface structure
        const atsScore = geminiResult.atsScore ?? null;
        const skillMatchPercentage = geminiResult.skillMatchPercentage ?? 
            (geminiResult.matchedSkills && geminiResult.missingSkills 
                ? Math.round((geminiResult.matchedSkills.length / (geminiResult.matchedSkills.length + geminiResult.missingSkills.length)) * 100)
                : undefined);

        // Map to skill matching details
        const skillMatchDetails: ISkillMatchDetails = {
            skillMatchPercentage: skillMatchPercentage,
            matchedSkills: geminiResult.matchedSkills || [],
            missingSkills: geminiResult.missingSkills || [],
            recommendations: geminiResult.recommendations?.filter(rec => 
                rec.toLowerCase().includes('skill') || 
                rec.toLowerCase().includes('experience') ||
                rec.toLowerCase().includes('qualification')
            ) || [],
            gapAnalysis: geminiResult.gapAnalysis || {}
        };

        // Map to ATS compliance details
        const complianceDetails: IAtsComplianceDetails = {
            keywordsMatched: geminiResult.matchedKeywords || [],
            keywordsMissing: geminiResult.missingKeywords || [],
            formattingIssues: geminiResult.formattingIssues || [],
            suggestions: geminiResult.recommendations || [],
            sectionScores: geminiResult.sectionScores || undefined
        };

        return {
            score: atsScore,
            details: {
                skillMatchDetails,
                complianceDetails
            }
        };

    } catch (error: any) {
        console.error('Error calling Gemini ATS analysis:', error);
        return {
            score: null,
            details: {
                skillMatchDetails: null,
                complianceDetails: null
            },
            error: error.message || 'Failed to analyze with Gemini ATS'
        };
    }
}

