// Define the structure expected from Gemini (consistent with analysisService)
interface GeminiDetailedResultItem {
    checkName: string;
    score?: number; // 0-100
    issues: string[];
    suggestions?: string[];
    status: 'pass' | 'fail' | 'warning' | 'not-applicable';
}

type GeminiAnalysisResult = Record<string, GeminiDetailedResultItem>;

// Define categories and weights for scoring
// Adjust weights based on importance
const SCORING_CONFIG = {
    categories: {
        content: {
            name: 'Content & Impact',
            checks: ['impactQuantification', 'keywordRelevance', 'summaryObjectiveQuality'],
            weight: 0.4
        },
        language: {
            name: 'Language & Clarity',
            checks: ['grammarSpelling', 'activeVoiceUsage', 'repetitiveLanguage', 'buzzwordsCliches', 'toneClarity'],
            weight: 0.4
        },
        structure: {
            name: 'Structure & Formatting',
            checks: ['cvLengthStructure', 'contactInformation'],
            weight: 0.2
        }
    },
    // Default score mapping for status if AI doesn't provide a score
    statusToScore: {
        pass: 100,
        warning: 60, // Penalize warnings
        fail: 20,    // Penalize failures heavily
        'not-applicable': 100 // Treat N/A as passing for scoring purposes
    },
    // Weights for individual checks within the overall score calculation
    // These should sum roughly to the number of checks being scored, or be normalized later
    checkWeights: {
        impactQuantification: 1.5,
        grammarSpelling: 1.5,
        keywordRelevance: 1.0,
        repetitiveLanguage: 0.8,
        activeVoiceUsage: 1.0,
        buzzwordsCliches: 0.7,
        cvLengthStructure: 1.0,
        summaryObjectiveQuality: 1.0,
        toneClarity: 1.2,
        contactInformation: 1.0,
        // Add weights for any new checks added to the prompt
    }
};


export const calculateScores = (detailedResults: GeminiAnalysisResult) => {
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let totalIssueCount = 0;
    const categoryScores: Record<string, number> = {};
    const categoryTotals: Record<string, { score: number; weight: number }> = {};

    // Initialize category totals
    for (const catKey in SCORING_CONFIG.categories) {
        categoryTotals[catKey] = { score: 0, weight: 0 };
    }

    // Iterate through the results provided by the AI
    for (const checkKey in detailedResults) {
        const resultItem = detailedResults[checkKey];
        if (!resultItem) continue; // Skip if result item is missing for some reason

        // --- Calculate Issue Count ---
        totalIssueCount += resultItem.issues?.length || 0;

        // --- Calculate Overall Score Contribution ---
        const checkWeight = SCORING_CONFIG.checkWeights[checkKey as keyof typeof SCORING_CONFIG.checkWeights] ?? 1.0; // Default weight 1 if not specified
        let score = resultItem.score;

        // If AI didn't provide a score, use status mapping
        if (typeof score !== 'number' || score < 0 || score > 100) {
            score = SCORING_CONFIG.statusToScore[resultItem.status] ?? 70; // Default to 70 if status is unknown
        }

        totalWeightedScore += score * checkWeight;
        totalWeight += checkWeight;

        // --- Calculate Category Score Contribution ---
        for (const catKey in SCORING_CONFIG.categories) {
            const category = SCORING_CONFIG.categories[catKey as keyof typeof SCORING_CONFIG.categories];
            if (category.checks.includes(checkKey)) {
                // Use the same score (AI-provided or status-based)
                categoryTotals[catKey].score += score * checkWeight; // Weight contribution within category
                categoryTotals[catKey].weight += checkWeight;
                break; // Assign check to only one category
            }
        }
    }

    // --- Finalize Scores ---
    const overallScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;

    for (const catKey in categoryTotals) {
        const catTotal = categoryTotals[catKey];
        categoryScores[catKey] = catTotal.weight > 0 ? Math.round(catTotal.score / catTotal.weight) : 0;
    }

    // Ensure score is within 0-100 bounds
    const finalOverallScore = Math.max(0, Math.min(100, overallScore));
    for (const catKey in categoryScores) {
        categoryScores[catKey] = Math.max(0, Math.min(100, categoryScores[catKey]));
    }


    console.log(`Scoring complete: Overall=${finalOverallScore}, Issues=${totalIssueCount}, Categories=`, categoryScores);

    return {
        overallScore: finalOverallScore,
        categoryScores: categoryScores,
        issueCount: totalIssueCount
    };
};
