// server/src/services/jobAnalysisService.ts
import { generateContent, generateStructuredResponse } from '../utils/aiService';
import { convertJsonResumeToText } from '../utils/cvTextExtractor';
import { JsonResumeSchema } from '../types/jsonresume';

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
 * LinkedIn scraper structured data (partial)
 */
export interface LinkedInStructuredData {
    skills?: string[];
    salary_details?: {
        min_salary?: string;
        max_salary?: string;
        currency_code?: string;
        pay_period?: string;
    };
    job_location?: string;
    remote_allow?: boolean;
    experience_level?: string;
    company_description?: string;
    [key: string]: any;
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
 * Extract job data from structured LinkedIn scraper data
 * This avoids AI calls when structured data is available
 */
const extractFromStructuredData = (
    structuredData: LinkedInStructuredData
): Partial<JobAnalysisResult['extractedData']> => {
    const extracted: Partial<JobAnalysisResult['extractedData']> = {};

    // Skills - directly from scraper
    if (structuredData.skills && structuredData.skills.length > 0) {
        extracted.skills = structuredData.skills;
    }

    // Salary - convert from scraper format
    if (structuredData.salary_details) {
        const salary = structuredData.salary_details;
        extracted.salary = {
            min: salary.min_salary ? parseFloat(salary.min_salary) : undefined,
            max: salary.max_salary ? parseFloat(salary.max_salary) : undefined,
            currency: salary.currency_code || 'USD'
        };
    }

    // Location - directly from scraper
    if (structuredData.job_location) {
        extracted.location = structuredData.job_location;
    }

    // Remote option - convert boolean to string
    if (structuredData.remote_allow !== undefined) {
        extracted.remoteOption = structuredData.remote_allow ? 'Remote' : 'On-site';
    }

    return extracted;
};

/**
 * Extract years of experience from job description using AI
 * Only called when structured data doesn't provide this info
 */
const extractYearsExperience = async (
    jobDescription: string,
    experienceLevel: string | undefined,
    userId: string
): Promise<number | undefined> => {
    // Try to infer from experience_level first
    if (experienceLevel) {
        const levelLower = experienceLevel.toLowerCase();
        if (levelLower.includes('entry') || levelLower.includes('junior')) {
            return 0; // Entry level typically means 0-2 years
        } else if (levelLower.includes('senior') || levelLower.includes('lead')) {
            return 5; // Senior typically means 5+ years
        } else if (levelLower.includes('mid') || levelLower.includes('intermediate')) {
            return 3; // Mid-level typically means 3-5 years
        }
    }

    // If we can't infer, use AI to extract from description
    const prompt = `Extract the number of years of experience required from this job description. Return ONLY a number, or null if not specified.

Job Description:
${jobDescription.substring(0, 2000)}

Return format: Just the number (e.g., "3" or "null")`;

    try {
        const result = await generateContent(userId, prompt);
        const responseText = result.text.trim();
        const years = parseInt(responseText);
        return isNaN(years) ? undefined : years;
    } catch (error) {
        console.error('Error extracting years of experience:', error);
        return undefined;
    }
};

/**
 * Analyze job posting using structured data when available, AI when needed
 */
export const analyzeJobPosting = async (
    jobDescription: string,
    userId: string,
    structuredData?: LinkedInStructuredData
): Promise<JobAnalysisResult> => {
    // If we have structured data, use it (much faster, no AI call needed)
    if (structuredData) {
        const extracted = extractFromStructuredData(structuredData);

        // Only use AI to extract yearsExperience if not available in structured data
        const yearsExperience = await extractYearsExperience(
            jobDescription,
            structuredData.experience_level,
            userId
        );

        return {
            extractedData: {
                skills: extracted.skills || [],
                salary: extracted.salary,
                yearsExperience,
                location: extracted.location,
                remoteOption: extracted.remoteOption
            }
        };
    }

    // Fallback: Use AI for full extraction (original behavior)
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

    return await generateStructuredResponse<JobAnalysisResult>(userId, prompt);
};

/**
 * Analyze company using structured data when available, AI when needed
 */
export const analyzeCompany = async (
    companyName: string,
    userId: string,
    companyDescription?: string
): Promise<CompanyAnalysisResult> => {
    // If we have company description from scraper, use AI to extract insights from it
    // This is more accurate than general research
    if (companyDescription && companyDescription.length > 50) {
        const prompt = `You are a job application assistant analyzing a company description.

Extract the following from this company description:
- missionStatement: The company's mission statement (1-2 sentences, extract or infer from description)
- coreValues: Array of 3-5 core company values mentioned or implied
- businessModel: Brief description of their business model (1 sentence)

Company: ${companyName}
Company Description:
${companyDescription.substring(0, 2000)}

Return ONLY a JSON object with these fields. Format:
{
  "missionStatement": "...",
  "coreValues": ["value1", "value2", "value3"],
  "businessModel": "..."
}`;

        try {
            return await generateStructuredResponse<CompanyAnalysisResult>(userId, prompt);
        } catch (error) {
            console.error('Error analyzing company from description, falling back to general research:', error);
            // Fall through to general research
        }
    }

    // Fallback: General company research (original behavior)
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

    return await generateStructuredResponse<CompanyAnalysisResult>(userId, prompt);
};

/**
 * Analyze both job and company using structured data when available
 * Significantly reduces AI calls by using scraper data
 */
export const analyzeJobAndCompany = async (
    jobDescription: string,
    companyName: string,
    userId: string,
    structuredData?: LinkedInStructuredData
): Promise<{ job: JobAnalysisResult; company: CompanyAnalysisResult }> => {
    // Use structured data to avoid most AI calls
    const [jobResult, companyResult] = await Promise.all([
        analyzeJobPosting(jobDescription, userId, structuredData),
        analyzeCompany(companyName, userId, structuredData?.company_description)
    ]);

    return {
        job: jobResult,
        company: companyResult
    };
};

/**
 * Combined result type for merged analysis
 */
export interface MergedAnalysisResult {
    job: JobAnalysisResult;
    company: CompanyAnalysisResult;
    relevance: {
        score: number | null;
        isRelevant: boolean;
        reason: string;
    };
}

/**
 * Convert structured resume to JsonResumeSchema format
 * Helper to bridge between cached resume structure and JsonResumeSchema
 */
const convertStructuredResumeToJsonResume = (structuredResume: any): JsonResumeSchema => {
    // Handle case where structuredResume might already be in JsonResumeSchema format
    if (structuredResume.basics) {
        return structuredResume as JsonResumeSchema;
    }

    // Convert from our cached structure format
    return {
        basics: {
            summary: structuredResume.summary || ''
        },
        skills: structuredResume.skills?.map((skill: any) => {
            if (typeof skill === 'string') {
                return { name: skill };
            }
            return skill;
        }) || [],
        work: structuredResume.experience?.map((exp: any) => ({
            name: exp.company || '',
            position: exp.title || '',
            summary: exp.description || '',
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
            highlights: []
        })) || [],
        education: structuredResume.education?.map((edu: any) => ({
            institution: edu.institution || edu.school || '',
            area: edu.area || edu.field || '',
            studyType: edu.studyType || edu.degree || '',
            startDate: edu.startDate || '',
            endDate: edu.endDate || ''
        })) || [],
        projects: structuredResume.projects || [],
        certificates: structuredResume.certifications?.map((cert: any) => ({
            name: typeof cert === 'string' ? cert : cert.name || '',
            date: cert.date || ''
        })) || [],
        languages: structuredResume.languages?.map((lang: any) => {
            if (typeof lang === 'string') {
                return { language: lang };
            }
            return {
                language: lang.language || lang.name || '',
                fluency: lang.proficiency || lang.fluency || ''
            };
        }) || []
    };
};

/**
 * Merged analysis function that combines job extraction, company insights, and relevance scoring
 * This reduces 2 AI calls to 1 call per job (50% reduction)
 */
export const analyzeJobCompanyAndRelevance = async (
    jobDescription: string,
    companyName: string,
    structuredResume: any,
    userId: string,
    structuredData?: LinkedInStructuredData,
    relevanceThreshold: number = 50
): Promise<MergedAnalysisResult> => {
    // Convert structured resume to JsonResumeSchema format
    const cvJson = convertStructuredResumeToJsonResume(structuredResume);
    const cvText = convertJsonResumeToText(cvJson);
    const cvJsonString = JSON.stringify(cvJson, null, 2);

    // If we have structured data, extract job data first (no AI needed)
    let jobExtractedData: JobAnalysisResult['extractedData'] | undefined;

    if (structuredData) {
        const extracted = extractFromStructuredData(structuredData);

        // Only use AI to extract yearsExperience if not available in structured data
        const yearsExperience = await extractYearsExperience(
            jobDescription,
            structuredData.experience_level,
            userId
        );

        jobExtractedData = {
            skills: extracted.skills || [],
            salary: extracted.salary,
            yearsExperience,
            location: extracted.location,
            remoteOption: extracted.remoteOption
        };
    }

    // Create comprehensive prompt that combines company analysis and relevance scoring
    // If structured data exists, we already have job data, so only ask for company + relevance
    let prompt = `You are a job application assistant performing comprehensive analysis. Your task is to:

${structuredData ? '1. Analyze the company and extract insights' : '1. Extract job information from the job description'}
${structuredData ? '2. Calculate relevance/match score between the candidate\'s resume and the job' : '2. Analyze the company and extract insights\n3. Calculate relevance/match score between the candidate\'s resume and the job'}

**Job Description:**
${jobDescription.substring(0, 4000)}

**Company Name:**
${companyName}

${structuredData?.company_description ? `**Company Description:**
${structuredData.company_description.substring(0, 2000)}` : ''}

**Candidate Resume (Text Format):**
${cvText.substring(0, 3000)}

**Candidate Resume (JSON Format):**
${cvJsonString.substring(0, 2000)}

**Instructions:**

${structuredData ? '' : `1. **Job Data Extraction:**
   - Extract: skills (array), salary (min, max, currency), yearsExperience (number), location (string), remoteOption (string: "Remote", "Hybrid", "On-site", or null)
`}${structuredData ? '1. **Company Analysis:**' : '2. **Company Analysis:**'}
${structuredData?.company_description ? '   - Extract from the company description provided above' : '   - Research the company based on the company name'}
   - missionStatement: Company's mission (1-2 sentences)
   - coreValues: Array of 3-5 core company values
   - businessModel: Brief description of business model (1 sentence)

${structuredData ? '2. **Relevance/Match Score:**' : '3. **Relevance/Match Score:**'}
   - Analyze how well the candidate's resume matches the job requirements
   - Calculate a compatibility score (0-100) based on:
     * Keyword matching (keywords from job description found in resume)
     * Skill alignment (required skills present in resume)
     * Experience match (years of experience and relevant work history)
     * Overall fit assessment
   - Determine if the match is relevant (score >= ${relevanceThreshold}%)
   - Provide a reason explaining the score:
     * If score >= 70%: "Strong match (X% compatibility). Matched Y key skills. Good alignment with job requirements."
     * If score >= 50%: "Moderate match (X% compatibility). Y important skills missing. Consider applying after addressing key gaps."
     * If score < 50%: "Weak match (X% compatibility). Missing Y critical skills. Significant gaps in requirements. Not recommended."

Return ONLY a JSON object with this exact structure:
{
  ${structuredData ? '' : `"job": {
    "extractedData": {
      "skills": ["skill1", "skill2"],
      "salary": {"min": 80000, "max": 120000, "currency": "USD"} or null,
      "yearsExperience": 3 or null,
      "location": "San Francisco, CA" or null,
      "remoteOption": "Hybrid" or null
    }
  },
  `}"company": {
    "missionStatement": "...",
    "coreValues": ["value1", "value2", "value3"],
    "businessModel": "..."
  },
  "relevance": {
    "score": 75,
    "isRelevant": true,
    "reason": "Strong match (75% compatibility). Matched 8 key skills. Good alignment with job requirements."
  }
}`;

    try {
        const result = await generateStructuredResponse<MergedAnalysisResult>(userId, prompt);

        // If we used structured data for job extraction, use that instead of AI result
        if (structuredData && jobExtractedData) {
            result.job = {
                extractedData: jobExtractedData
            };
        }

        // Ensure relevance threshold is applied
        if (result.relevance.score !== null) {
            result.relevance.isRelevant = result.relevance.score >= relevanceThreshold;
        } else {
            result.relevance.isRelevant = false;
        }

        return result;
    } catch (error: any) {
        console.error('Error in merged analysis, falling back to separate calls:', error);

        // Fallback to separate calls if merged call fails
        const [jobResult, companyResult] = await Promise.all([
            analyzeJobPosting(jobDescription, userId, structuredData),
            analyzeCompany(companyName, userId, structuredData?.company_description)
        ]);

        // For relevance, we'd need to call checkRelevance separately
        // But for now, return with null relevance and let the caller handle it
        return {
            job: jobResult,
            company: companyResult,
            relevance: {
                score: null,
                isRelevant: false,
                reason: `Analysis completed but relevance check failed: ${error.message || 'Unknown error'}`
            }
        };
    }
};
