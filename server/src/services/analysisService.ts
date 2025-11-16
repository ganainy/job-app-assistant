import { Types } from 'mongoose';
import CvAnalysis, { ICvAnalysis, IAtsScores } from '../models/CvAnalysis'; // Import model and interface
import { generateAnalysisFromFile, generateJsonAnalysis, generateStructuredResponse } from '../utils/geminiClient'; // Import the file and JSON analysis functions
import { calculateScores } from '../utils/analysis/scoringUtil'; // Import scoring utility
import fs from 'fs'; // Import fs for cleanup
import path from 'path'; // Import path for determining MIME type
import { JsonResumeSchema } from '../types/jsonresume'; // Import JSON resume schema
import { analyzeWithGemini } from './atsGeminiService';

// Define the expected structure for the detailed results from Gemini
// This should align with the IDetailedResultItem interface in CvAnalysis.ts
interface GeminiDetailedResultItem {
    checkName: string; // e.g., "Impact Quantification", "Grammar", "Keyword Relevance"
    score?: number | null; // Optional score (0-100) reflecting quality/severity
    issues: string[]; // List of specific issues found (e.g., "Sentence in passive voice: ...", "Lacks metrics in project description X")
    suggestions?: string[]; // Specific suggestions for improvement (e.g., "Rephrase sentence to active voice: ...", "Add data point for Y achievement")
    status: 'pass' | 'fail' | 'warning' | 'not-applicable'; // Overall status for this check
    priority: 'high' | 'medium' | 'low'; // Priority level for fixing this issue
}

export type GeminiAnalysisResult = Record<string, GeminiDetailedResultItem>;

// Function to determine MIME type from file path
function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.pdf': return 'application/pdf';
        case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        // Add other supported types if necessary
        default: throw new Error(`Unsupported file type: ${ext}`);
    }
}

// Function to determine if a section is analyzable
const isSectionAnalyzable = (section: any): boolean => {
    if (Array.isArray(section)) {
        return section.length > 0;
    }
    if (typeof section === 'object' && section !== null) {
        return Object.keys(section).length > 0;
    }
    return false;
};

// Master prompt for Gemini analysis (Corrected quotes)
const MASTER_ANALYSIS_PROMPT = `
Analyze the provided CV document (PDF or DOCX). Your goal is to perform a comprehensive review covering content, structure, and language.

**Output Format:**
Return ONLY a single JSON object enclosed in triple backticks (\`\`\`json ... \`\`\`).
The JSON object should have keys corresponding to different analysis checks (e.g., "impactQuantification", "grammar", "keywordRelevance", "sectionCompleteness", "toneClarity").
Each key's value MUST be an object with the following fields:
- "checkName": (string) A human-readable name for the check (e.g., "Impact Quantification", "Grammar and Spelling").
- "score": (number, optional) A score from 0 to 100 indicating performance on this check (higher is better). Omit if not applicable.
- "issues": (array of strings) Specific problems identified. Be concise but clear. If no issues, return an empty array [].
- "suggestions": (array of strings, optional) Actionable advice for improvement related to the issues. If no suggestions, omit or return an empty array [].
- "status": (string) Overall assessment for this check: "pass", "fail", "warning", or "not-applicable".
- "priority": (string) Priority level for fixing this issue: "high", "medium", or "low". Use these guidelines:
  * high: Issues that significantly impact readability, professionalism, or ATS compatibility
  * medium: Issues that affect quality but don't severely impact understanding
  * low: Minor improvements that would enhance the CV but aren't critical

**Analysis Checks to Perform:**

1.  **Impact Quantification:**
    *   Priority: high for missing metrics in key achievements, medium for general improvements
    *   Identify achievements and responsibilities that lack specific metrics
    *   "status": "fail" if many items lack metrics, "warning" if some do, "pass" if well-quantified

2.  **Grammar and Spelling:**
    *   Priority: high for obvious errors, medium for style issues
    *   Check for grammatical errors, typos, and spelling mistakes
    *   "status": "fail" if many errors, "warning" if few, "pass" if none/negligible

3.  **Keyword Relevance:**
    *   Priority: high if missing crucial industry keywords, medium for optimization
    *   Check if industry-specific keywords are present and used naturally
    *   "status": "warning" if improvement needed, "pass" otherwise

4.  **Active Voice Usage:**
    *   Priority: medium unless severely impacting clarity
    *   Focus on achievement descriptions and responsibility statements
    *   "status": "fail" if excessive passive voice, "warning" if some, "pass" if mostly active

5.  **Buzzwords and Clichés:**
    *   Priority: medium for excessive use, low for occasional instances
    *   Look for overused phrases that could be more specific
    *   "status": "warning" if detected, "pass" otherwise

6.  **Length and Structure:**
    *   Priority: high for missing crucial sections or severe length issues
    *   Check overall organization and section completeness
    *   "status": "warning" if issues found, "pass" otherwise

7.  **Contact Information:**
    *   Priority: high for missing essential contact details
    *   Verify presence of name, phone, email, location
    *   "status": "fail" if missing essentials, "pass" otherwise

8.  **Summary/Objective Quality:**
    *   Priority: medium for improvements, low if present but basic
    *   Evaluate relevance and impact
    *   "status": "warning" if generic, "pass" if strong, "not-applicable" if missing

9.  **Skills Organization:**
    *   Priority: medium for structure issues, low for minor grouping improvements
    *   Check logical grouping and presentation
    *   "status": "warning" if poorly organized, "pass" otherwise

10. **Education Presentation:**
    *   Priority: high for missing crucial details, medium for formatting
    *   Verify completeness and proper ordering
    *   "status": "warning" if issues found, "pass" otherwise

Analyze the entire document thoroughly and maintain consistency in priority assignments across all checks.
`;

// New prompt for generating section improvements
const IMPROVEMENT_PROMPT = `
You are a professional CV/resume writer. Your task is to improve a specific section of a CV based on the analysis results and suggestions.
You will receive:
1. The current content of the section
2. The analysis results and suggestions for improvement
3. The section name that needs improvement

Guidelines:
- Maintain a professional tone
- Keep the improved content relevant to the section
- Address all issues mentioned in the analysis
- Implement all relevant suggestions
- Keep the same key information but present it more effectively
- Use active voice and quantifiable achievements where possible
- Ensure improved content is ATS-friendly

Return ONLY the improved content without any additional explanation or markdown formatting.
The output should be ready to use as a direct replacement for the current content.
`;

// Updated analysis orchestration function
export const performAnalysis = async (filePath: string, userId: string | Types.ObjectId, analysisId: Types.ObjectId): Promise<void> => {
    console.log(`Starting AI analysis for ID: ${analysisId}, User: ${userId}, File: ${filePath}`);
    let analysisStatus: ICvAnalysis['status'] = 'failed'; // Default to failed
    let analysisResults: GeminiAnalysisResult | null = null;
    let calculatedScores = { overallScore: 0, categoryScores: {}, issueCount: 0 };
    let errorInfo: string | undefined = undefined;

    try {
        const mimeType = getMimeType(filePath);

        // 1. Call Gemini with the file and master prompt
        analysisResults = await generateAnalysisFromFile<GeminiAnalysisResult>(
            MASTER_ANALYSIS_PROMPT,
            filePath,
            mimeType
        );

        // Basic validation of AI response structure (check if it's an object)
        if (typeof analysisResults !== 'object' || analysisResults === null) {
            throw new Error("AI analysis did not return a valid object structure.");
        }

        // 2. Calculate scores based on AI results
        // The scoring logic will need to interpret the structured results from Gemini
        calculatedScores = calculateScores(analysisResults); // Pass AI results directly

        analysisStatus = 'completed'; // Mark as completed if AI call and scoring succeed
        console.log(`AI analysis and scoring completed for ID: ${analysisId}`);

    } catch (error: any) {
        console.error(`Analysis failed for ID: ${analysisId}:`, error);
        analysisStatus = 'failed';
        errorInfo = error instanceof Error ? error.message : 'Unknown analysis error';
        // Ensure analysisResults is null or empty if analysis failed partway
        analysisResults = null;
        calculatedScores = { overallScore: 0, categoryScores: {}, issueCount: 0 }; // Reset scores on failure

    } finally {
        // 3. Update CvAnalysis document in the database
        try {
            const updateData: Partial<ICvAnalysis> = {
                status: analysisStatus,
                detailedResults: analysisResults ?? {}, // Use empty object if null
                overallScore: calculatedScores.overallScore,
                categoryScores: calculatedScores.categoryScores,
                issueCount: calculatedScores.issueCount,
                errorInfo: errorInfo,
                analysisDate: new Date() // Update analysis date
            };
            await CvAnalysis.findByIdAndUpdate(analysisId, updateData);
            console.log(`Database record updated for analysis ID: ${analysisId} with status: ${analysisStatus}`);
        } catch (dbError: any) {
            console.error(`FATAL: Failed to update database for analysis ID: ${analysisId} after analysis attempt:`, dbError);
            // This is a secondary error, the primary error (if any) is already logged.
        }

        // 4. Clean up the temporary file
        fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
                console.error(`Error deleting temporary file ${filePath} for analysis ID ${analysisId}:`, unlinkErr);
            } else {
                console.log(`Temporary file ${filePath} deleted for analysis ID ${analysisId}.`);
            }
        });
    }
};

// Updated function to analyze CV JSON directly
export const performJsonAnalysis = async (
    cvJson: JsonResumeSchema,
    userId: string | Types.ObjectId,
    analysisId: Types.ObjectId,
    jobContext?: any
): Promise<void> => {
    console.log(`Starting JSON-based AI analysis for ID: ${analysisId}, User: ${userId}`);
    let analysisStatus: ICvAnalysis['status'] = 'failed';
    let analysisResults: GeminiAnalysisResult | null = null;
    let calculatedScores = { overallScore: 0, categoryScores: {}, issueCount: 0 };
    let errorInfo: string | undefined = undefined;

    try {
        // Convert CV JSON to string for analysis
        const cvString = JSON.stringify(cvJson, null, 2);

        // Add job context to the prompt if available
        let prompt = MASTER_ANALYSIS_PROMPT;
        if (jobContext?.jobDescription) {
            prompt = `${prompt}\n\nJob Description Context:\n${jobContext.jobDescription}\n\nAnalyze the CV in relation to this job description.`;
        }

        // Determine which sections are present and analyzable in the CV
        const sectionsToAnalyze = Object.entries(cvJson)
            .filter(([key, value]) =>
                value !== undefined &&
                key !== '_id' &&
                key !== '__v' &&
                isSectionAnalyzable(value)
            )
            .map(([key]) => key);

        console.log('Analyzing sections:', sectionsToAnalyze);

        // Generate initial analysis
        analysisResults = await generateJsonAnalysis<GeminiAnalysisResult>(
            prompt,
            cvString
        );

        if (typeof analysisResults !== 'object' || analysisResults === null) {
            throw new Error("AI analysis did not return a valid object structure.");
        }

        // Mark sections as not-applicable if they're empty or missing
        const allPossibleSections = ['basics', 'work', 'education', 'skills', 'projects', 'languages', 'certificates'];
        allPossibleSections.forEach(section => {
            if (!sectionsToAnalyze.includes(section) && !analysisResults![section]) {
                analysisResults![section] = {
                    checkName: `${section} Analysis`,
                    score: null,
                    issues: [],
                    suggestions: [],
                    status: 'not-applicable',
                    priority: 'low'
                };
            }
        });

        calculatedScores = calculateScores(analysisResults);
        analysisStatus = 'completed';
        console.log(`AI analysis and scoring completed for ID: ${analysisId}`);

    } catch (error: any) {
        console.error(`Analysis failed for ID: ${analysisId}:`, error);
        analysisStatus = 'failed';
        errorInfo = error instanceof Error ? error.message : 'Unknown analysis error';
        analysisResults = null;
        calculatedScores = { overallScore: 0, categoryScores: {}, issueCount: 0 };
    } finally {
        try {
            const updateData: Partial<ICvAnalysis> = {
                status: analysisStatus,
                detailedResults: analysisResults ?? {},
                overallScore: calculatedScores.overallScore,
                categoryScores: calculatedScores.categoryScores,
                issueCount: calculatedScores.issueCount,
                errorInfo: errorInfo,
                analysisDate: new Date()
            };
            await CvAnalysis.findByIdAndUpdate(analysisId, updateData);
            console.log(`Database record updated for analysis ID: ${analysisId} with status: ${analysisStatus}`);
        } catch (dbError: any) {
            console.error(`FATAL: Failed to update database for analysis ID: ${analysisId} after analysis attempt:`, dbError);
        }
    }
};

// Updated function to generate improvements for a specific section
export const generateSectionImprovement = async (
    analysis: ICvAnalysis,
    section: string,
    currentContent: string
): Promise<string> => {
    // Validate inputs
    if (!currentContent?.trim()) {
        throw new Error('Current content is empty or invalid');
    }

    if (!section?.trim()) {
        throw new Error('Section name is required');
    }

    if (analysis.status !== 'completed') {
        throw new Error(`Cannot generate improvements: Analysis status is ${analysis.status}`);
    }

    // Handle Map type properly by converting to object if needed
    const detailedResults = analysis.detailedResults instanceof Map
        ? Object.fromEntries(analysis.detailedResults)
        : analysis.detailedResults;

    if (!detailedResults || Object.keys(detailedResults).length === 0) {
        throw new Error('Cannot generate improvements: No analysis results available');
    }

    // Filter relevant analysis results for this section
    const sectionChecks: Record<string, string[]> = {
        summary: ['summaryObjectiveQuality', 'toneClarity', 'activeVoiceUsage', 'buzzwordsAndCliches'],
        experience: ['impactQuantification', 'activeVoiceUsage', 'keywordRelevance', 'toneClarity'],
        skills: ['keywordRelevance', 'skillsOrganization', 'buzzwordsAndCliches'],
        education: ['educationPresentation', 'toneClarity', 'activeVoiceUsage'],
        projects: ['impactQuantification', 'activeVoiceUsage', 'keywordRelevance', 'toneClarity'],
        achievements: ['impactQuantification', 'activeVoiceUsage', 'toneClarity'],
        certifications: ['keywordRelevance', 'toneClarity'],
        languages: ['skillsOrganization', 'toneClarity'],
        volunteer: ['impactQuantification', 'activeVoiceUsage', 'toneClarity'],
        interests: ['toneClarity', 'buzzwordsAndCliches']
    };

    if (!sectionChecks[section]) {
        throw new Error(`Unsupported section type: ${section}. Valid sections are: ${Object.keys(sectionChecks).join(', ')}`);
    }

    // Filter out mongoose metadata and get valid check results
    const relevantResults = Object.entries(detailedResults)
        .filter(([key]) => !key.startsWith('$__') && !key.startsWith('_') && sectionChecks[section].includes(key))
        .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {} as typeof detailedResults);

    if (Object.keys(relevantResults).length === 0) {
        const availableChecks = Object.entries(detailedResults)
            .filter(([key]) => !key.startsWith('$__') && !key.startsWith('_'))
            .map(([key]) => key);
        throw new Error(`No analysis results found for section '${section}'. Available checks: ${availableChecks.join(', ')}`);
    }

    // Create a detailed prompt with the current content and analysis results
    const fullPrompt = `${IMPROVEMENT_PROMPT}

Section: ${section}

Current Content:
${currentContent}

Analysis Results and Suggestions:
${JSON.stringify(relevantResults, null, 2)}

Generate improved content for this section addressing the identified issues and implementing the suggestions.

Return the improved content in this format:
\`\`\`json
{
    "content": "Your improved content here"
}
\`\`\``;

    try {
        const response = await generateStructuredResponse<{ content: string }>(fullPrompt);
        const improvedContent = response?.content?.trim();

        if (!improvedContent) {
            throw new Error('AI generated empty or invalid content');
        }

        return improvedContent;
    } catch (error: any) {
        console.error(`Error generating improvement for section ${section}:`, error);
        const errorMessage = error.message || 'Unknown error';
        throw new Error(`Failed to generate improvement: ${errorMessage}. This may be due to AI service issues or invalid input content.`);
    }
};

/**
 * Performs ATS analysis using Gemini AI
 * @param cvJson - The CV in JSON Resume format
 * @param analysisId - The analysis document ID to update
 * @param jobDescription - Optional job description for skill matching
 * @param jobApplicationId - Optional job application ID for reference
 */
export const performAtsAnalysis = async (
    cvJson: JsonResumeSchema,
    analysisId: Types.ObjectId,
    jobDescription?: string,
    jobApplicationId?: string
): Promise<void> => {
    console.log(`Starting Gemini ATS analysis for ID: ${analysisId}`);
    
    const atsScores: IAtsScores = {
        lastAnalyzedAt: new Date(),
        jobApplicationId: jobApplicationId
    };

    try {
        // Call Gemini ATS service
        const geminiResult = await analyzeWithGemini(cvJson, jobDescription);

        // Map Gemini results to database fields
        if (geminiResult.error) {
            atsScores.error = geminiResult.error;
            console.warn(`Gemini ATS analysis error: ${geminiResult.error}`);
        } else {
            atsScores.score = geminiResult.score;
            atsScores.skillMatchDetails = geminiResult.details.skillMatchDetails;
            atsScores.complianceDetails = geminiResult.details.complianceDetails;
        }

        // Update the analysis document with ATS scores
        const updateResult = await CvAnalysis.findByIdAndUpdate(analysisId, {
            $set: { atsScores: atsScores }
        }, { new: true });
        
        // Verify the update
        const verifyAnalysis = await CvAnalysis.findById(analysisId);
        console.log(`Gemini ATS analysis completed and saved for analysis ID: ${analysisId}`);
        console.log(`[DEBUG] ATS scores saved - Score: ${atsScores.score}`);
        console.log(`[DEBUG] Verification - Has ATS scores in DB: ${!!verifyAnalysis?.atsScores}`);
        if (verifyAnalysis?.atsScores) {
            console.log(`[DEBUG] Verification - Score: ${verifyAnalysis.atsScores.score}`);
        }
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        atsScores.error = errorMessage;
        console.error(`Gemini ATS analysis failed for ID: ${analysisId}:`, error);
        
        // Still save the error state to the database
        try {
            await CvAnalysis.findByIdAndUpdate(analysisId, {
                $set: { atsScores: atsScores }
            });
        } catch (dbError: any) {
            console.error(`FATAL: Failed to update ATS scores for analysis ID: ${analysisId}:`, dbError);
            throw new Error(`Failed to save ATS analysis results: ${dbError.message}`);
        }
    }
};
