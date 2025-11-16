import React from 'react';

interface SectionAnalysisPanelProps {
    analysis: {
        needsImprovement: boolean;
        feedback: string;
    } | null;
    onImprove: () => void;
    isLoading?: boolean;
}

const SectionAnalysisPanel: React.FC<SectionAnalysisPanelProps> = ({
    analysis,
    onImprove,
    isLoading = false
}) => {
    // If no analysis or no improvement needed, render nothing
    if (!analysis || !analysis.needsImprovement) {
        return null;
    }

    return (
        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
            {/* Warning/Idea Icon */}
            <div className="flex-shrink-0 mt-0.5">
                <svg
                    className="w-5 h-5 text-yellow-600 dark:text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            </div>

            {/* Feedback Text */}
            <div className="flex-1">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    {analysis.feedback}
                </p>
            </div>

            {/* AI Fix Button */}
            <div className="flex-shrink-0">
                <button
                    onClick={onImprove}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-blue-600 dark:bg-blue-700 text-white text-sm rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                    {isLoading ? (
                        <>
                            <svg
                                className="animate-spin h-4 w-4"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                            Improving...
                        </>
                    ) : (
                        <>
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                />
                            </svg>
                            AI Fix
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default SectionAnalysisPanel;