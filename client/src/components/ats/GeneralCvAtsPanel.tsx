// General CV ATS Analysis Panel - for CV analysis without job description
import React, { useState } from 'react';
import { AtsScores } from '../../services/atsApi';

interface GeneralCvAtsPanelProps {
    atsScores: AtsScores | null;
    isLoading?: boolean;
}

type TabType = 'sections' | 'recommendations';

interface CollapsibleSectionProps {
    title: string;
    icon?: React.ReactNode;
    defaultOpen?: boolean;
    children: React.ReactNode;
    count?: number;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
    title, 
    icon, 
    defaultOpen = false, 
    children,
    count 
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-medium text-gray-900 dark:text-gray-100">{title}</span>
                    {count !== undefined && count > 0 && (
                        <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                            {count}
                        </span>
                    )}
                </div>
                <svg
                    className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    {children}
                </div>
            )}
        </div>
    );
};

const GeneralCvAtsPanel: React.FC<GeneralCvAtsPanelProps> = ({ atsScores, isLoading }) => {
    const [activeTab, setActiveTab] = useState<TabType>('sections');

    if (isLoading) {
        return (
            <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                </div>
                <div className="space-y-4">
                    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
            </div>
        );
    }

    if (!atsScores) {
        return (
            <div className="p-8 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900/50 dark:to-blue-900/10 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-center">
                <div className="max-w-md mx-auto">
                    <div className="mb-4 flex justify-center">
                        <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                            <svg className="w-12 h-12 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Ready to Analyze Your CV?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Get instant insights into your CV's ATS compatibility. Our AI-powered analysis will check:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-left">
                        <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs text-gray-700 dark:text-gray-300">Skill identification</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs text-gray-700 dark:text-gray-300">Keyword optimization</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs text-gray-700 dark:text-gray-300">ATS compliance</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs text-gray-700 dark:text-gray-300">Improvement tips</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const complianceDetails = atsScores.complianceDetails;
    const skillMatchDetails = atsScores.skillMatchDetails;

    const sectionScores = complianceDetails?.sectionScores || {};
    const recommendations = complianceDetails?.suggestions || [];
    const formattingIssues = complianceDetails?.formattingIssues || [];
    const gapAnalysis = skillMatchDetails?.gapAnalysis || {};

    const tabs = [
        { id: 'sections' as TabType, label: 'Sections', count: Object.keys(sectionScores).length },
        { id: 'recommendations' as TabType, label: 'Recommendations', count: recommendations.length }
    ];

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-1" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
                                ${activeTab === tab.id
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }
                            `}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                    activeTab === tab.id
                                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
                {/* Sections Tab */}
                {activeTab === 'sections' && (
                    <div className="space-y-4">
                        {Object.keys(sectionScores).length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(sectionScores).map(([section, score]) => {
                                    const getScoreColor = (score: number) => {
                                        if (score >= 80) return 'text-green-600 dark:text-green-400';
                                        if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
                                        return 'text-red-600 dark:text-red-400';
                                    };
                                    
                                    const getScoreBg = (score: number) => {
                                        if (score >= 80) return 'bg-green-100 dark:bg-green-900/20';
                                        if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20';
                                        return 'bg-red-100 dark:bg-red-900/20';
                                    };

                                    return (
                                        <div
                                            key={section}
                                            className={`p-4 rounded-lg border border-gray-200 dark:border-gray-700 ${getScoreBg(score)}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                                                    {section.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                                <span className={`text-lg font-bold ${getScoreColor(score)}`}>
                                                    {Math.round(score)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all ${
                                                        score >= 80 ? 'bg-green-600 dark:bg-green-400' :
                                                        score >= 60 ? 'bg-yellow-600 dark:bg-yellow-400' :
                                                        'bg-red-600 dark:bg-red-400'
                                                    }`}
                                                    style={{ width: `${score}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
                                No section scores available.
                            </p>
                        )}

                        {/* Content Quality Metrics */}
                        {(gapAnalysis.contentQuality !== undefined || gapAnalysis.structure !== undefined || gapAnalysis.keywordOptimization !== undefined) && (
                            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Content Quality Metrics</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {gapAnalysis.contentQuality !== undefined && (
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Content Quality</span>
                                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    {Math.round(gapAnalysis.contentQuality)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                <div
                                                    className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full"
                                                    style={{ width: `${gapAnalysis.contentQuality}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {gapAnalysis.structure !== undefined && (
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Structure</span>
                                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    {Math.round(gapAnalysis.structure)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                <div
                                                    className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full"
                                                    style={{ width: `${gapAnalysis.structure}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {gapAnalysis.keywordOptimization !== undefined && (
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Keyword Optimization</span>
                                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    {Math.round(gapAnalysis.keywordOptimization)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                <div
                                                    className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full"
                                                    style={{ width: `${gapAnalysis.keywordOptimization}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Recommendations Tab */}
                {activeTab === 'recommendations' && (
                    <div className="space-y-3">
                        {formattingIssues.length > 0 && (
                            <CollapsibleSection
                                title="Formatting Issues"
                                icon={
                                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                }
                                count={formattingIssues.length}
                                defaultOpen={true}
                            >
                                <ul className="space-y-2">
                                    {formattingIssues.map((issue, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                            <span className="text-red-500 dark:text-red-400 mt-0.5">•</span>
                                            <span>{issue}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CollapsibleSection>
                        )}
                        
                        {recommendations.length > 0 ? (
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Actionable Recommendations</h3>
                                {recommendations.map((rec, index) => (
                                    <div
                                        key={index}
                                        className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className="w-6 h-6 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                    {index + 1}
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{rec}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
                                No recommendations available.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Last Analyzed */}
            {atsScores.lastAnalyzedAt && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Last analyzed: <span className="text-gray-900 dark:text-gray-100">{new Date(atsScores.lastAnalyzedAt).toLocaleString()}</span>
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeneralCvAtsPanel;

