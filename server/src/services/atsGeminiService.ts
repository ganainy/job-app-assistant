// ATS analysis service (provider-agnostic)
import { generateStructuredResponse } from '../utils/aiService';
import { JsonResumeSchema } from '../types/jsonresume';
import { convertJsonResumeToText } from '../utils/cvTextExtractor';
import { 
    ISkillMatchDetails, 
    IAtsComplianceDetails,
    ISectionCompleteness,
    IQuantifiableMetrics,
    ISkillsAnalysis,
    ILengthAnalysis,
    IStandardHeaders
} from '../models/CvAnalysis';

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
    // New comprehensive metrics
    sectionCompleteness?: {
        present: string[];
        missing: string[];
        score: number;
    };
    quantifiableMetrics?: {
        hasMetrics: boolean;
        examples: string[];
        score: number;
    };
    skillsAnalysis?: {
        hardSkills: string[];
        softSkills: string[];
        score: number;
    };
    lengthAnalysis?: {
        pageCount: number;
        wordCount: number;
        isOptimal: boolean;
        score: number;
    };
    readabilityScore?: number;
    atsBlockingElements?: string[];
    standardHeaders?: {
        isStandard: boolean;
        nonStandardHeaders: string[];
        score: number;
    };
    // Enhanced keyword analysis for general CV
    industryKeywords?: string[]; // Industry-standard keywords found in CV
    missingIndustryKeywords?: string[]; // Common industry keywords missing
}

/**
 * Safely converts a value to a number, returning undefined if NaN or invalid
 */
function safeNumber(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;
    const num = typeof value === 'number' ? value : Number(value);
    return (isNaN(num) || !isFinite(num)) ? undefined : num;
}

/**
 * Safely gets a number with a default fallback, ensuring no NaN
 */
function safeNumberWithDefault(value: any, defaultValue: number): number {
    const num = safeNumber(value);
    return num !== undefined ? num : defaultValue;
}

/**
 * Analyzes CV against job description using Gemini AI for ATS compatibility
 * @param userId - User ID (required to get their Gemini API key)
 * @param cvJson - The CV in JSON Resume format
 * @param jobDescription - Optional job description for matching analysis
 * @returns ATS analysis results compatible with existing interface
 */
export async function analyzeWithGemini(
    userId: string,
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

**Comprehensive Analysis Requirements - Evaluate ALL 11 Key Metrics:**

1. **ATS Compatibility Score (0-100):**
   - Calculate overall ATS compatibility score (0-100)
   - When job description provided: reflect keyword matching, skill alignment, and overall fit
   - When no job description: evaluate general ATS compatibility (structure, formatting, keyword optimization, completeness)
   - Higher scores indicate better ATS compatibility

2. **Keyword Presence:**
   - If job description provided: identify keywords from job description found/missing in CV
   - If no job description: identify industry-standard keywords and common terms that ATS typically look for
   - Check for relevant technical terms, skills, qualifications, industry-specific terminology
   - Provide lists of matched keywords and missing keywords (or industry keywords found/missing for general analysis)

3. **Formatting Quality:**
   - Check for ATS-friendly format: simple layouts without complex tables, images, or graphics
   - Identify formatting problems that could confuse ATS parsing
   - Examples: complex tables, graphics, non-standard section names, special characters, unusual fonts
   - List specific formatting issues found

4. **Section Completeness:**
   - Verify presence of essential sections: Contact Information, Summary/Profile, Work Experience, Education, Skills
   - List which essential sections are present and which are missing
   - Provide a completeness score (0-100) based on presence of essential sections

5. **Quantifiable Metrics Usage:**
   - Check for presence of measurable achievements or data points that highlight impact
   - Identify examples of quantifiable metrics (percentages, numbers, dollar amounts, timeframes, etc.)
   - Assess whether achievements are quantified with specific metrics
   - Provide score (0-100) and list examples found

6. **Hard and Soft Skills Inclusion:**
   - Identify both technical/hard skills (programming languages, tools, certifications) and interpersonal/soft skills (communication, leadership, teamwork)
   - List hard skills and soft skills separately
   - Assess whether both types are appropriately included
   - Provide score (0-100) based on comprehensive skills coverage

7. **Length and Word Count:**
   - Evaluate CV length (optimal is usually 1-2 pages)
   - Count approximate word count
   - Assess if length balances detail without overwhelming
   - Determine if length is optimal (1-2 pages is ideal)
   - Provide score (0-100) based on optimal length

8. **Readability and Consistency:**
   - Check for consistent fonts throughout the document
   - Verify consistent bullet point usage and formatting
   - Assess logical flow and organization
   - Ensure ATS and human readers can navigate easily
   - Provide readability score (0-100)

9. **Absence of ATS-Blocking Elements:**
   - Check for headers/footers (these can confuse ATS parsing)
   - Identify text boxes or unusual formatting
   - Check for unusual fonts that hinder parsing
   - Look for graphics, images, or visual elements that block parsing
   - List all ATS-blocking elements found

10. **Use of Standard Job Titles and Section Headers:**
    - Verify use of standard, recognizable section headers (e.g., "Work Experience", "Education", "Skills")
    - Check for creative or non-standard names for roles or sections
    - Identify any non-standard headers that could confuse ATS
    - Assess whether job titles are standard and clear
    - Provide score (0-100) and list non-standard headers found

11. **Individual Section Scores:**
    - Evaluate and score each major CV section individually (0-100) for ATS compatibility
    - Score sections like: "Work Experience", "Education", "Skills", "Summary", "Contact Information", "Certifications", "Languages", "Projects"
    - For each section, consider: completeness, keyword usage, formatting, ATS-friendliness, and relevance
    - Provide sectionScores as an object with section names as keys and scores (0-100) as values
    - Only include sections that exist in the CV

**CV Content:**
${cvText}

**CV JSON Structure:**
${cvJsonString}
`;

        if (jobDescription) {
            prompt += `\n\n**Job Description:**\n${jobDescription}\n\nAnalyze the CV specifically against this job description. Calculate the ATS compatibility score that shows how well the resume aligns with these job requirements. Focus on keyword matching (highlight matched keywords, identify missing keywords crucial for shortlisting), skill alignment, and overall fit. Evaluate all 11 metrics comprehensively, including individual section scores for each major CV section.`;
        } else {
            prompt += `\n\n**Note:** No job description provided. Perform comprehensive general ATS compatibility analysis evaluating all 11 key metrics:
- ATS Compatibility Score (general ATS compatibility)
- Keyword Presence (industry-standard keywords)
- Formatting Quality
- Section Completeness
- Quantifiable Metrics Usage
- Hard and Soft Skills Inclusion
- Length and Word Count
- Readability and Consistency
- Absence of ATS-Blocking Elements
- Use of Standard Job Titles and Section Headers
- Individual Section Scores (score each major CV section separately)

Provide detailed analysis for each metric to ensure the CV can pass through ATS systems smoothly.`;
        }

        prompt += `\n\n**Output Format:**\nReturn ONLY a JSON object wrapped in triple backticks (\`\`\`json ... \`\`\`) with the following structure:
{
  "atsScore": <number 0-100>,
  "matchedKeywords": <array of strings - keywords from job description found in CV, or industry keywords if no job description>,
  "missingKeywords": <array of strings - keywords from job description missing, or missing industry keywords if no job description>,
  "industryKeywords": <array of strings - industry-standard keywords found, only if no job description>,
  "missingIndustryKeywords": <array of strings - common industry keywords missing, only if no job description>,
  "matchedSkills": <array of strings>,
  "missingSkills": <array of strings>,
  "formattingIssues": <array of strings>,
  "recommendations": <array of strings>,
  "sectionScores": <REQUIRED object with section names as keys and scores 0-100 as values. Must include scores for all major sections present in the CV (e.g., "Work Experience": 85, "Education": 90, "Skills": 75, "Summary": 80, "Contact Information": 95, etc.). Each score reflects ATS compatibility for that specific section.>,
  "skillMatchPercentage": <number 0-100, optional>,
  "gapAnalysis": <object with gap details, optional>,
  "sectionCompleteness": {
    "present": <array of strings - essential sections found>,
    "missing": <array of strings - essential sections missing>,
    "score": <number 0-100>
  },
  "quantifiableMetrics": {
    "hasMetrics": <boolean>,
    "examples": <array of strings - examples of quantifiable achievements>,
    "score": <number 0-100>
  },
  "skillsAnalysis": {
    "hardSkills": <array of strings - technical skills identified>,
    "softSkills": <array of strings - interpersonal skills identified>,
    "score": <number 0-100>
  },
  "lengthAnalysis": {
    "pageCount": <number - approximate page count>,
    "wordCount": <number - approximate word count>,
    "isOptimal": <boolean - true if 1-2 pages>,
    "score": <number 0-100>
  },
  "readabilityScore": <number 0-100>,
  "atsBlockingElements": <array of strings - headers/footers, text boxes, unusual fonts, etc.>,
  "standardHeaders": {
    "isStandard": <boolean>,
    "nonStandardHeaders": <array of strings - non-standard section headers found>,
    "score": <number 0-100>
  }
}`;

        // Call AI service
        const combinedPrompt = `${prompt}\n\nAnalyze the following CV in JSON Resume format:\n\n${cvJsonString}`;
        const geminiResult: GeminiAtsResponse = await generateStructuredResponse<GeminiAtsResponse>(
            userId,
            combinedPrompt
        );

        // Map Gemini results to existing interface structure
        const atsScore = safeNumber(geminiResult.atsScore) ?? null;
        
        // Calculate skillMatchPercentage safely, avoiding NaN
        let skillMatchPercentage: number | undefined = safeNumber(geminiResult.skillMatchPercentage);
        if (skillMatchPercentage === undefined) {
            const matchedCount = geminiResult.matchedSkills?.length || 0;
            const missingCount = geminiResult.missingSkills?.length || 0;
            const totalCount = matchedCount + missingCount;
            
            if (totalCount > 0) {
                const calculated = Math.round((matchedCount / totalCount) * 100);
                skillMatchPercentage = safeNumber(calculated);
            }
        }

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
            keywordsMatched: geminiResult.matchedKeywords || geminiResult.industryKeywords || [],
            keywordsMissing: geminiResult.missingKeywords || geminiResult.missingIndustryKeywords || [],
            formattingIssues: geminiResult.formattingIssues || [],
            suggestions: geminiResult.recommendations || [],
            sectionScores: geminiResult.sectionScores ? (() => {
                const scores: Record<string, number> = {};
                for (const [key, value] of Object.entries(geminiResult.sectionScores)) {
                    const safeValue = safeNumber(value);
                    if (safeValue !== undefined) {
                        scores[key] = safeValue;
                    }
                }
                return Object.keys(scores).length > 0 ? scores : undefined;
            })() : undefined,
            sectionCompleteness: geminiResult.sectionCompleteness ? {
                present: geminiResult.sectionCompleteness.present || [],
                missing: geminiResult.sectionCompleteness.missing || [],
                score: safeNumberWithDefault(geminiResult.sectionCompleteness.score, 0)
            } : undefined,
            quantifiableMetrics: geminiResult.quantifiableMetrics ? {
                hasMetrics: geminiResult.quantifiableMetrics.hasMetrics || false,
                examples: geminiResult.quantifiableMetrics.examples || [],
                score: safeNumberWithDefault(geminiResult.quantifiableMetrics.score, 0)
            } : undefined,
            skillsAnalysis: geminiResult.skillsAnalysis ? {
                hardSkills: geminiResult.skillsAnalysis.hardSkills || [],
                softSkills: geminiResult.skillsAnalysis.softSkills || [],
                score: safeNumberWithDefault(geminiResult.skillsAnalysis.score, 0)
            } : undefined,
            lengthAnalysis: geminiResult.lengthAnalysis ? {
                pageCount: safeNumberWithDefault(geminiResult.lengthAnalysis.pageCount, 0),
                wordCount: safeNumberWithDefault(geminiResult.lengthAnalysis.wordCount, 0),
                isOptimal: geminiResult.lengthAnalysis.isOptimal || false,
                score: safeNumberWithDefault(geminiResult.lengthAnalysis.score, 0)
            } : undefined,
            readabilityScore: safeNumber(geminiResult.readabilityScore),
            atsBlockingElements: geminiResult.atsBlockingElements || [],
            standardHeaders: geminiResult.standardHeaders ? {
                isStandard: geminiResult.standardHeaders.isStandard || false,
                nonStandardHeaders: geminiResult.standardHeaders.nonStandardHeaders || [],
                score: safeNumberWithDefault(geminiResult.standardHeaders.score, 0)
            } : undefined
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

