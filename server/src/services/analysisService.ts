import { Types } from 'mongoose';
import CvAnalysis, { ICvAnalysis } from '../models/CvAnalysis'; // Import model and interface
import { generateAnalysisFromFile } from '../utils/geminiClient'; // Import the file analysis function
import { calculateScores } from '../utils/analysis/scoringUtil'; // Import scoring utility
import fs from 'fs'; // Import fs for cleanup
import path from 'path'; // Import path for determining MIME type

// Define the expected structure for the detailed results from Gemini
// This should align with the IDetailedResultItem interface in CvAnalysis.ts
interface GeminiDetailedResultItem {
    checkName: string; // e.g., "Impact Quantification", "Grammar", "Keyword Relevance"
    score?: number; // Optional score (0-100) reflecting quality/severity
    issues: string[]; // List of specific issues found (e.g., "Sentence in passive voice: ...", "Lacks metrics in project description X")
    suggestions?: string[]; // Specific suggestions for improvement (e.g., "Rephrase sentence to active voice: ...", "Add data point for Y achievement")
    status: 'pass' | 'fail' | 'warning' | 'not-applicable'; // Overall status for this check
}

type GeminiAnalysisResult = Record<string, GeminiDetailedResultItem>;


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

**Analysis Checks to Perform:**

1.  **Impact Quantification:**
    *   Identify achievements and responsibilities.
    *   Check if they are quantified with specific metrics, numbers, or data.
    *   "checkName": "Impact Quantification"
    *   "issues": List specific examples lacking quantification.
    *   "suggestions": Suggest *how* to add metrics to those examples.
    *   "score": Based on the proportion of quantified vs. unquantified achievements.
    *   "status": "fail" if many items lack metrics, "warning" if some do, "pass" if well-quantified.

2.  **Grammar and Spelling:**
    *   Check for grammatical errors, typos, and spelling mistakes throughout the document.
    *   "checkName": "Grammar and Spelling"
    *   "issues": List specific errors found (e.g., "Typo: 'manger' instead of 'manager'").
    *   "suggestions": Provide the corrected version.
    *   "score": Based on the density of errors.
    *   "status": "fail" if many errors, "warning" if few, "pass" if none/negligible.

3.  **Keyword Relevance (Semantic):**
    *   Analyze the text for relevant industry keywords and skills. Assess if they are used naturally and effectively, not just stuffed. (Assume a general professional context if no specific job target is provided).
    *   "checkName": "Keyword Relevance"
    *   "issues": Note if keywords seem sparse, generic, or unnaturally forced.
    *   "suggestions": Suggest incorporating more specific or relevant keywords based on common roles associated with the CV's content.
    *   "score": Based on perceived relevance and natural integration.
    *   "status": "warning" if improvement needed, "pass" otherwise.

4.  **Repetition (Semantic):**
    *   Identify overuse of certain words, phrases, or concepts that make the CV sound repetitive. Look beyond exact word matches to semantic similarity.
    *   "checkName": "Repetitive Language"
    *   "issues": List examples of repetitive phrasing or concepts.
    *   "suggestions": Suggest synonyms or alternative ways to phrase the points.
    *   "status": "warning" if repetition detected, "pass" otherwise.

5.  **Active vs. Passive Voice:**
    *   Detect sentences written in passive voice, especially in descriptions of responsibilities or achievements.
    *   "checkName": "Active Voice Usage"
    *   "issues": List specific sentences in passive voice.
    *   "suggestions": Suggest an active voice alternative for each.
    *   "score": Based on the proportion of passive voice sentences in key sections.
    *   "status": "fail" if excessive passive voice, "warning" if some, "pass" if predominantly active.

6.  **Buzzwords and Clichés:**
    *   Identify potentially overused buzzwords, jargon, or clichés that might detract from credibility.
    *   "checkName": "Buzzwords and Clichés"
    *   "issues": List identified buzzwords/clichés (e.g., "results-oriented", "team player" if used generically).
    *   "suggestions": Suggest using more specific or concrete language instead.
    *   "status": "warning" if detected, "pass" otherwise.

7.  **CV Length and Structure:**
    *   Assess overall length (e.g., word count, estimated page count).
    *   Identify standard sections (Contact Info, Experience, Education, Skills). Check if they are present and logically ordered.
    *   "checkName": "Length and Structure"
    *   "issues": Note if length seems excessive/too short, or if standard sections are missing/unclear. Note very long paragraphs or bullet points (word count).
    *   "suggestions": Recommend adjustments to length or section clarity.
    *   "status": "warning" if issues found, "pass" otherwise.

8.  **Summary/Objective Quality:**
    *   If a summary or objective section exists, evaluate its clarity, conciseness, and relevance to the overall CV content.
    *   "checkName": "Summary/Objective Quality"
    *   "issues": Note if it's vague, generic, too long, or missing.
    *   "suggestions": Suggest improvements for focus and impact.
    *   "status": "warning" if issues found, "pass" if strong or "not-applicable" if missing.

9.  **Tone and Clarity:**
    *   Evaluate the overall writing style for professionalism, clarity, and conciseness.
    *   "checkName": "Tone and Clarity"
    *   "issues": Note if the tone is unprofessional, or if language is ambiguous or overly complex.
    *   "suggestions": Recommend specific areas for improvement in clarity or tone.
    *   "score": Overall assessment of writing quality.
    *   "status": "warning" if issues found, "pass" otherwise.

10. **Contact Information:**
    *   Check for the presence of essential contact details (Name, Phone, Email, possibly LinkedIn). Check email format for professionalism.
    *   "checkName": "Contact Information"
    *   "issues": Note missing essential info or unprofessional email address format.
    *   "status": "fail" if essential info missing/unprofessional, "pass" otherwise.

**Important:** Adhere strictly to the JSON output format described above. Analyze the *entire* document provided.
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
