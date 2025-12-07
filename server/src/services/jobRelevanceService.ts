// server/src/services/jobRelevanceService.ts
import { analyzeWithGemini } from './atsGeminiService';
import { JsonResumeSchema } from '../types/jsonresume';
import { getGeminiApiKey } from '../utils/apiKeyHelpers';

/**
 * Result of relevance check
 * Now unified with dashboard job matching logic
 */
export interface RelevanceResult {
    isRelevant: boolean;
    reason: string;
    score?: number | null; // Optional score for reference
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
 * Check if a job is relevant to the user's resume
 * Uses the same analysis logic and thresholds as dashboard job matching for consistency
 * 
 * Thresholds (same as dashboard):
 * - >= 70%: Strong match → should apply (isRelevant = true)
 * - >= 50%: Moderate match → consider applying (isRelevant = true)
 * - < 50%: Weak match → not recommended (isRelevant = false)
 * 
 * @param structuredResume - Structured resume data (from cache)
 * @param jobDescription - Job description text
 * @param userId - User ID (for API key retrieval)
 * @param relevanceThreshold - Score threshold for relevance (default: 50, matches "moderate match" threshold)
 * @returns RelevanceResult with isRelevant boolean and reason
 */
export const checkRelevance = async (
    structuredResume: any,
    jobDescription: string,
    userId: string,
    relevanceThreshold: number = 50
): Promise<RelevanceResult> => {
    try {
        // Convert structured resume to JsonResumeSchema format
        const cvJson = convertStructuredResumeToJsonResume(structuredResume);

        // Use the same analysis service as dashboard
        const analysisResult = await analyzeWithGemini(
            userId,
            cvJson,
            jobDescription
        );

        if (analysisResult.error || analysisResult.score === null) {
            const errorMsg = analysisResult.error || 'Failed to analyze job match';
            return {
                isRelevant: false,
                reason: errorMsg,
                score: null
            };
        }

        const score = analysisResult.score;

        // Use same threshold logic as dashboard:
        // >= 50% (moderate match or better) is considered relevant
        // This matches dashboard logic where >= 50% is "consider applying"
        const isRelevant = score >= relevanceThreshold;

        // Generate reason using exact same logic as jobRecommendationService
        // >= 70%: Strong match → should apply
        // >= 50%: Moderate match → consider applying
        // < 50%: Weak match → not recommended
        let reason: string;
        if (score >= 70) {
            const matchedSkills = analysisResult.details.skillMatchDetails?.matchedSkills || [];
            const skillCount = matchedSkills.length;
            reason = `Strong match (${score}% compatibility). ${skillCount > 0 ? `Matched ${skillCount} key skills. ` : ''}Good alignment with job requirements.`;
        } else if (score >= 50) {
            const missingSkills = analysisResult.details.skillMatchDetails?.missingSkills || [];
            const skillCount = missingSkills.length;
            reason = `Moderate match (${score}% compatibility). ${skillCount > 0 ? `${skillCount} important skills missing. ` : ''}Consider applying after addressing key gaps.`;
        } else {
            const missingSkills = analysisResult.details.skillMatchDetails?.missingSkills || [];
            const skillCount = missingSkills.length;
            reason = `Weak match (${score}% compatibility). ${skillCount > 0 ? `Missing ${skillCount} critical skills. ` : ''}Significant gaps in requirements. Not recommended.`;
        }

        return {
            isRelevant,
            reason,
            score
        };
    } catch (error: any) {
        console.error('Error checking relevance:', error);
        return {
            isRelevant: false,
            reason: `Failed to analyze relevance: ${error.message || 'Unknown error'}`,
            score: null
        };
    }
};

/**
 * Provider-aware relevance checking
 * Uses the specified provider with automatic fallback to Gemini
 */
export const checkRelevanceWithProvider = async (
    structuredResume: any,
    jobDescription: string,
    userId: string,
    profile: any,
    provider: string | undefined,
    modelName: string,
    relevanceThreshold: number = 50
): Promise<RelevanceResult> => {
    const { createAdapter, executeWithFallback } = require('./providerService');

    // Create adapter with fallback
    const adapter = createAdapter(profile, provider, modelName, 0.3); // Lower temperature for consistency

    console.log(`  Using ${adapter.getProvider()}/${adapter.getModelName()} for relevance check`);

    // Define primary operation
    const primaryOperation = async () => {
        return checkRelevance(structuredResume, jobDescription, userId, relevanceThreshold);
    };

    // Define fallback operation
    const fallbackOperation = async () => {
        console.log('  Falling back to Gemini for relevance check');
        return checkRelevance(structuredResume, jobDescription, userId, relevanceThreshold);
    };

    // Execute with fallback
    return executeWithFallback(primaryOperation, fallbackOperation);
};
