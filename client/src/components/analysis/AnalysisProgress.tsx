// client/src/components/analysis/AnalysisProgress.tsx
import React from 'react';

type AnalysisStage = 'idle' | 'uploading' | 'processing' | 'analyzing' | 'completed' | 'error';

interface AnalysisProgressProps {
    stage: AnalysisStage;
    className?: string;
}

const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ stage, className = '' }) => {
    const stages: Array<{ key: AnalysisStage; label: string; icon: React.ReactNode }> = [
        {
            key: 'uploading',
            label: 'Uploading',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                </svg>
            ),
        },
        {
            key: 'processing',
            label: 'Processing',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                </svg>
            ),
        },
        {
            key: 'analyzing',
            label: 'Analyzing',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                </svg>
            ),
        },
        {
            key: 'completed',
            label: 'Complete',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                    />
                </svg>
            ),
        },
    ];

    const getStageIndex = (currentStage: AnalysisStage): number => {
        const index = stages.findIndex((s) => s.key === currentStage);
        return index >= 0 ? index : 0;
    };

    const currentIndex = getStageIndex(stage);
    const isError = stage === 'error';

    return (
        <div className={`w-full ${className}`}>
            <div className="flex items-center justify-between">
                {stages.map((stageItem, index) => {
                    const isCompleted = index < currentIndex || (stage === 'completed' && index === currentIndex);
                    const isCurrent = index === currentIndex && !isError;
                    const isPending = index > currentIndex;

                    return (
                        <React.Fragment key={stageItem.key}>
                            <div className="flex flex-col items-center flex-1">
                                <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                                        isCompleted
                                            ? 'bg-green-500 text-white dark:bg-green-600'
                                            : isCurrent
                                            ? 'bg-blue-500 text-white dark:bg-blue-600 animate-pulse'
                                            : isError && index === currentIndex
                                            ? 'bg-red-500 text-white dark:bg-red-600'
                                            : 'bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                    }`}
                                >
                                    {isCompleted ? (
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    ) : isCurrent ? (
                                        <div className="animate-spin">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                        </div>
                                    ) : (
                                        stageItem.icon
                                    )}
                                </div>
                                <p
                                    className={`mt-2 text-xs text-center ${
                                        isCompleted
                                            ? 'text-green-600 dark:text-green-400 font-medium'
                                            : isCurrent
                                            ? 'text-blue-600 dark:text-blue-400 font-medium'
                                            : isError && index === currentIndex
                                            ? 'text-red-600 dark:text-red-400 font-medium'
                                            : 'text-gray-500 dark:text-gray-400'
                                    }`}
                                >
                                    {stageItem.label}
                                </p>
                            </div>
                            {index < stages.length - 1 && (
                                <div
                                    className={`flex-1 h-1 mx-2 rounded ${
                                        isCompleted
                                            ? 'bg-green-500 dark:bg-green-600'
                                            : isCurrent
                                            ? 'bg-blue-500 dark:bg-blue-600'
                                            : 'bg-gray-300 dark:bg-gray-700'
                                    }`}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default AnalysisProgress;

