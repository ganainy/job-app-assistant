import React, { useState } from 'react';
import { JobRecommendation } from '../../services/jobRecommendationApi';

interface JobRecommendationBadgeProps {
    recommendation: JobRecommendation | null;
    isLoading?: boolean;
    className?: string;
}

const JobRecommendationBadge: React.FC<JobRecommendationBadgeProps> = ({
    recommendation,
    isLoading = false,
    className = ''
}) => {
    const [showTooltip, setShowTooltip] = useState(false);

    if (isLoading) {
        return (
            <div className={`inline-flex items-center gap-2 ${className}`}>
                <div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded-md h-8 w-16"></div>
            </div>
        );
    }

    if (!recommendation) {
        return (
            <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 ${className}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Not analyzed</span>
            </div>
        );
    }

    if (recommendation.error) {
        return (
            <div
                className={`relative inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 cursor-help ${className}`}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>Error</span>
                {showTooltip && (
                    <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-lg shadow-lg whitespace-pre-line max-w-xs pointer-events-none">
                        <div className="font-semibold mb-1">Analysis Error</div>
                        {recommendation.error}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Handle cases where score is null
    if (recommendation.score === null) {
        return (
            <div
                className={`relative inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 cursor-help ${className}`}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{recommendation.reason || 'Not analyzed'}</span>
                {showTooltip && recommendation.reason && (
                    <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-lg shadow-lg whitespace-pre-line max-w-xs pointer-events-none">
                        {recommendation.reason}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Determine badge configuration based on score
    let badgeConfig: {
        bgColor: string;
        textColor: string;
        borderColor: string;
        icon: React.ReactNode;
        label: string;
        progressColor: string;
    };

    if (recommendation.score >= 70) {
        badgeConfig = {
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            textColor: 'text-green-700 dark:text-green-300',
            borderColor: 'border-green-200 dark:border-green-800',
            progressColor: 'bg-green-500',
            label: 'Strong Match',
            icon: (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
            )
        };
    } else if (recommendation.score >= 50) {
        badgeConfig = {
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
            textColor: 'text-yellow-700 dark:text-yellow-300',
            borderColor: 'border-yellow-200 dark:border-yellow-800',
            progressColor: 'bg-yellow-500',
            label: 'Moderate Match',
            icon: (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
            )
        };
    } else {
        badgeConfig = {
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            textColor: 'text-red-700 dark:text-red-300',
            borderColor: 'border-red-200 dark:border-red-800',
            progressColor: 'bg-red-500',
            label: 'Weak Match',
            icon: (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
            )
        };
    }

    return (
        <div
            className={`relative inline-flex items-center ${className}`}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${badgeConfig.bgColor} ${badgeConfig.textColor} ${badgeConfig.borderColor} cursor-help transition-all hover:shadow-sm`}>
                {badgeConfig.icon}
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold">{recommendation.score}%</span>
                        <span className="text-xs opacity-75">•</span>
                        <span className="text-xs font-medium">{badgeConfig.label}</span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${badgeConfig.progressColor} transition-all duration-300`}
                            style={{ width: `${recommendation.score}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {showTooltip && (
                <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 pointer-events-none">
                    <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl overflow-hidden">
                        {/* Header */}
                        <div className={`px-4 py-2 ${badgeConfig.progressColor} bg-opacity-90`}>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold">Match Analysis</span>
                                <span className="text-lg font-bold">{recommendation.score}%</span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-4 py-3 space-y-2">
                            <div>
                                <div className="text-xs font-semibold text-slate-300 mb-1">Recommendation</div>
                                <div className="text-sm leading-relaxed">{recommendation.reason}</div>
                            </div>

                            {recommendation.cached && recommendation.cachedAt && (
                                <div className="pt-2 border-t border-slate-700">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Analyzed: {new Date(recommendation.cachedAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                        <div className="border-8 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobRecommendationBadge;
