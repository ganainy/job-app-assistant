/**
 * Zod validation schemas for ATS LLM response validation
 * Ensures consistent, structured output from the AI analysis
 */
import { z } from 'zod';

// Priority levels for missing keywords/skills
export const PriorityLevel = z.enum(['high', 'medium', 'low']);
export type PriorityLevelType = z.infer<typeof PriorityLevel>;

// Missing keyword with priority and context
export const MissingKeywordSchema = z.object({
    keyword: z.string(),
    priority: PriorityLevel,
    context: z.string().describe('Why this keyword is important for the role')
});
export type MissingKeyword = z.infer<typeof MissingKeywordSchema>;

// Missing skill with priority and context
export const MissingSkillSchema = z.object({
    skill: z.string(),
    priority: PriorityLevel,
    context: z.string().describe('Why this skill is important for the role')
});
export type MissingSkill = z.infer<typeof MissingSkillSchema>;

// Actionable feedback with impact description
export const ActionableFeedbackSchema = z.object({
    priority: PriorityLevel,
    action: z.string().describe('Specific action to take'),
    impact: z.string().describe('Expected impact on ATS score or hiring chances')
});
export type ActionableFeedback = z.infer<typeof ActionableFeedbackSchema>;

// Score breakdown by category
export const ScoreBreakdownSchema = z.object({
    technicalSkills: z.number().min(0).max(100).describe('Score for matching technical skills (40% weight)'),
    experienceRelevance: z.number().min(0).max(100).describe('Score for experience alignment (30% weight)'),
    additionalSkills: z.number().min(0).max(100).describe('Score for nice-to-have skills (20% weight)'),
    formatting: z.number().min(0).max(100).describe('Score for ATS-friendly formatting (10% weight)')
});
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;

// Section completeness analysis
export const SectionCompletenessSchema = z.object({
    present: z.array(z.string()),
    missing: z.array(z.string()),
    score: z.number().min(0).max(100)
});

// Quantifiable metrics analysis
export const QuantifiableMetricsSchema = z.object({
    hasMetrics: z.boolean(),
    examples: z.array(z.string()),
    score: z.number().min(0).max(100)
});

// Skills analysis (hard vs soft skills)
export const SkillsAnalysisSchema = z.object({
    hardSkills: z.array(z.string()),
    softSkills: z.array(z.string()),
    score: z.number().min(0).max(100)
});

// Length analysis
export const LengthAnalysisSchema = z.object({
    pageCount: z.number().min(0),
    wordCount: z.number().min(0),
    isOptimal: z.boolean(),
    score: z.number().min(0).max(100)
});

// Standard headers analysis
export const StandardHeadersSchema = z.object({
    isStandard: z.boolean(),
    nonStandardHeaders: z.array(z.string()),
    score: z.number().min(0).max(100)
});

// Complete ATS response schema
export const AtsResponseSchema = z.object({
    // Core scores
    atsScore: z.number().min(0).max(100),
    scoreBreakdown: ScoreBreakdownSchema.optional(),

    // Keywords analysis - enhanced with priority
    matchedKeywords: z.array(z.string()),
    missingKeywords: z.union([
        z.array(z.string()),  // Legacy format (plain strings)
        z.array(MissingKeywordSchema)  // New format with priority
    ]),

    // Industry keywords (for general CV analysis without job description)
    industryKeywords: z.array(z.string()).optional(),
    missingIndustryKeywords: z.array(z.string()).optional(),

    // Skills analysis - enhanced with priority
    matchedSkills: z.array(z.string()),
    missingSkills: z.union([
        z.array(z.string()),  // Legacy format (plain strings)
        z.array(MissingSkillSchema)  // New format with priority
    ]),

    // Issues and recommendations
    formattingIssues: z.array(z.string()),
    recommendations: z.array(z.string()),
    actionableFeedback: z.array(ActionableFeedbackSchema).optional(),

    // Section scores (per-section ATS compatibility)
    sectionScores: z.record(z.string(), z.number().min(0).max(100)).optional(),

    // Detailed metrics
    skillMatchPercentage: z.number().min(0).max(100).optional(),
    gapAnalysis: z.record(z.string(), z.any()).optional(),
    sectionCompleteness: SectionCompletenessSchema.optional(),
    quantifiableMetrics: QuantifiableMetricsSchema.optional(),
    skillsAnalysis: SkillsAnalysisSchema.optional(),
    lengthAnalysis: LengthAnalysisSchema.optional(),
    readabilityScore: z.number().min(0).max(100).optional(),
    atsBlockingElements: z.array(z.string()).optional(),
    standardHeaders: StandardHeadersSchema.optional()
});

export type AtsResponse = z.infer<typeof AtsResponseSchema>;

/**
 * Validates an ATS response from the LLM
 * Returns the validated data or null with error details
 */
export function validateAtsResponse(data: unknown): {
    success: true;
    data: AtsResponse
} | {
    success: false;
    error: z.ZodError
} {
    const result = AtsResponseSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}

/**
 * Checks if missing keywords are in the new prioritized format
 */
export function isPrioritizedMissingKeywords(
    keywords: string[] | MissingKeyword[]
): keywords is MissingKeyword[] {
    if (!keywords || keywords.length === 0) return false;
    return typeof keywords[0] === 'object' && 'priority' in keywords[0];
}

/**
 * Checks if missing skills are in the new prioritized format
 */
export function isPrioritizedMissingSkills(
    skills: string[] | MissingSkill[]
): skills is MissingSkill[] {
    if (!skills || skills.length === 0) return false;
    return typeof skills[0] === 'object' && 'priority' in skills[0];
}

/**
 * Converts legacy string array to prioritized format (for backward compatibility)
 */
export function convertToMissingKeyword(
    keyword: string,
    defaultPriority: PriorityLevelType = 'medium'
): MissingKeyword {
    return {
        keyword,
        priority: defaultPriority,
        context: 'Identified as a relevant keyword from job description'
    };
}

/**
 * Converts legacy string array to prioritized format (for backward compatibility)
 */
export function convertToMissingSkill(
    skill: string,
    defaultPriority: PriorityLevelType = 'medium'
): MissingSkill {
    return {
        skill,
        priority: defaultPriority,
        context: 'Identified as a relevant skill from job requirements'
    };
}
