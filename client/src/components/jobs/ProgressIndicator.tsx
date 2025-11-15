// client/src/components/jobs/ProgressIndicator.tsx
import React from 'react';

interface ProgressIndicatorProps {
    steps: {
        label: string;
        completed: boolean;
    }[];
    className?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ steps, className = '' }) => {
    return (
        <div className={`w-full ${className}`}>
            <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                    <React.Fragment key={index}>
                        <div className="flex flex-col items-center flex-1">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                                    step.completed
                                        ? 'bg-green-500 text-white dark:bg-green-600'
                                        : 'bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}
                            >
                                {step.completed ? (
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    index + 1
                                )}
                            </div>
                            <p
                                className={`mt-2 text-xs text-center ${
                                    step.completed
                                        ? 'text-green-600 dark:text-green-400 font-medium'
                                        : 'text-gray-500 dark:text-gray-400'
                                }`}
                            >
                                {step.label}
                            </p>
                        </div>
                        {index < steps.length - 1 && (
                            <div
                                className={`flex-1 h-1 mx-2 ${
                                    step.completed
                                        ? 'bg-green-500 dark:bg-green-600'
                                        : 'bg-gray-300 dark:bg-gray-700'
                                }`}
                            />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default ProgressIndicator;

