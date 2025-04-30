import { GeminiAnalysisResult } from '../../services/analysisService';

interface Scores {
    overallScore: number;
    categoryScores: Record<string, number>;
    issueCount: number;
}

export const calculateScores = (analysisResults: GeminiAnalysisResult): Scores => {
    const scores: Scores = {
        overallScore: 0,
        categoryScores: {},
        issueCount: 0
    };

    if (!analysisResults || Object.keys(analysisResults).length === 0) {
        return scores;
    }

    let totalWeight = 0;
    let weightedSum = 0;
    const priorityWeights = {
        high: 3,
        medium: 2,
        low: 1
    } as const;

    // Calculate weighted scores based on priority and status
    Object.entries(analysisResults).forEach(([category, result]) => {
        // Base score from status
        let categoryScore = result.score ?? (
            result.status === 'pass' ? 100 :
                result.status === 'warning' ? 50 :
                    result.status === 'fail' ? 0 :
                        result.status === 'not-applicable' ? 100 : 0
        );

        // Apply priority-based weight
        const weight = priorityWeights[result.priority];
        totalWeight += weight;
        weightedSum += categoryScore * weight;

        // Store individual category score
        scores.categoryScores[category] = categoryScore;

        // Count issues
        scores.issueCount += result.issues.length;
    });

    // Calculate overall weighted score
    scores.overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

    return scores;
}
