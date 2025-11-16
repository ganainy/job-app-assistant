// General CV ATS Analysis Panel - for CV analysis without job description
import React, { useState } from 'react';
import { AtsScores } from '../../services/atsApi';

interface GeneralCvAtsPanelProps {
    atsScores: AtsScores | null;
    isLoading?: boolean;
}

type TabType = 'overview' | 'metrics' | 'recommendations';

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
    const [activeTab, setActiveTab] = useState<TabType>('overview');

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
    
    // New comprehensive metrics
    const sectionCompleteness = complianceDetails?.sectionCompleteness;
    const quantifiableMetrics = complianceDetails?.quantifiableMetrics;
    const skillsAnalysis = complianceDetails?.skillsAnalysis;
    const lengthAnalysis = complianceDetails?.lengthAnalysis;
    const readabilityScore = complianceDetails?.readabilityScore;
    const atsBlockingElements = complianceDetails?.atsBlockingElements || [];
    const standardHeaders = complianceDetails?.standardHeaders;
    const keywordsMatched = complianceDetails?.keywordsMatched || [];
    const keywordsMissing = complianceDetails?.keywordsMissing || [];

    const tabs = [
        { id: 'overview' as TabType, label: 'Overview' },
        { id: 'metrics' as TabType, label: 'All Metrics', count: 10 },
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

            {/* Overall ATS Score */}
            {atsScores.score !== null && atsScores.score !== undefined && (
                <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Overall ATS Compatibility Score</h3>
                        <span className={`text-3xl font-bold ${
                            atsScores.score >= 80 ? 'text-green-600 dark:text-green-400' :
                            atsScores.score >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                        }`}>
                            {Math.round(atsScores.score)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                            className={`h-3 rounded-full transition-all ${
                                atsScores.score >= 80 ? 'bg-green-600 dark:bg-green-400' :
                                atsScores.score >= 60 ? 'bg-yellow-600 dark:bg-yellow-400' :
                                'bg-red-600 dark:bg-red-400'
                            }`}
                            style={{ width: `${atsScores.score}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Tab Content */}
            <div className="space-y-4">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
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
                    </div>
                )}

                {/* Comprehensive Metrics Tab */}
                {activeTab === 'metrics' && (
                    <div className="space-y-6">
                        {/* 1. Keyword Presence */}
                        {(keywordsMatched.length > 0 || keywordsMissing.length > 0) && (
                            <CollapsibleSection
                                title="Keyword Presence"
                                icon={<svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
                                defaultOpen={true}
                            >
                                <div className="space-y-3">
                                    {keywordsMatched.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Keywords Found ({keywordsMatched.length}):</p>
                                            <div className="flex flex-wrap gap-2">
                                                {keywordsMatched.map((keyword, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs">{keyword}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {keywordsMissing.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Missing Keywords ({keywordsMissing.length}):</p>
                                            <div className="flex flex-wrap gap-2">
                                                {keywordsMissing.map((keyword, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded text-xs">{keyword}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CollapsibleSection>
                        )}

                        {/* 2. Formatting Quality */}
                        {formattingIssues.length > 0 && (
                            <CollapsibleSection
                                title="Formatting Quality"
                                icon={<svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>}
                                count={formattingIssues.length}
                            >
                                <ul className="space-y-2">
                                    {formattingIssues.map((issue, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                            <span className="text-orange-500 dark:text-orange-400 mt-0.5">•</span>
                                            <span>{issue}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CollapsibleSection>
                        )}

                        {/* 3. Section Completeness */}
                        {sectionCompleteness && (
                            <CollapsibleSection
                                title="Section Completeness"
                                icon={<svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                defaultOpen={true}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Completeness Score</span>
                                        <span className={`text-lg font-bold ${
                                            sectionCompleteness.score >= 80 ? 'text-green-600 dark:text-green-400' :
                                            sectionCompleteness.score >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                                            'text-red-600 dark:text-red-400'
                                        }`}>
                                            {Math.round(sectionCompleteness.score)}%
                                        </span>
                                    </div>
                                    {sectionCompleteness.present.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Present Sections:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {sectionCompleteness.present.map((section, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs">{section}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {sectionCompleteness.missing.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Missing Sections:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {sectionCompleteness.missing.map((section, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded text-xs">{section}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CollapsibleSection>
                        )}

                        {/* 4. Quantifiable Metrics */}
                        {quantifiableMetrics && (
                            <CollapsibleSection
                                title="Quantifiable Metrics Usage"
                                icon={<svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                                defaultOpen={true}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Quality Score</span>
                                        <span className={`text-lg font-bold ${
                                            quantifiableMetrics.score >= 80 ? 'text-green-600 dark:text-green-400' :
                                            quantifiableMetrics.score >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                                            'text-red-600 dark:text-red-400'
                                        }`}>
                                            {Math.round(quantifiableMetrics.score)}%
                                        </span>
                                    </div>
                                    
                                    {quantifiableMetrics.hasMetrics ? (
                                        <div className="space-y-3">
                                            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="text-sm font-medium text-green-800 dark:text-green-300">Good: Metrics Found</span>
                                                </div>
                                                <p className="text-xs text-green-700 dark:text-green-400 ml-6 mb-3">
                                                    Your CV includes quantifiable achievements. Consider adding more to strengthen your impact.
                                                </p>
                                                
                                                {quantifiableMetrics.examples.length > 0 && (
                                                    <div className="ml-6">
                                                        <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">Examples Found ({quantifiableMetrics.examples.length}):</p>
                                                        <ul className="space-y-1">
                                                            {quantifiableMetrics.examples.map((example, idx) => (
                                                                <li key={idx} className="text-sm text-green-700 dark:text-green-400 flex items-start gap-2">
                                                                    <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                                                                    <span>{example}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {quantifiableMetrics.score < 80 && (
                                                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                        </svg>
                                                        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Needs Improvement</span>
                                                    </div>
                                                    <p className="text-xs text-yellow-700 dark:text-yellow-400 ml-6">
                                                        Add more quantifiable metrics (percentages, numbers, timeframes) throughout your CV to increase your score.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                <span className="text-sm font-medium text-red-800 dark:text-red-300">No Quantifiable Metrics Found</span>
                                            </div>
                                            <p className="text-xs text-red-700 dark:text-red-400 ml-6">
                                                Add numbers, percentages, and measurable achievements to make your CV more impactful (e.g., "Increased sales by 25%", "Managed team of 10 people").
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CollapsibleSection>
                        )}

                        {/* 5. Hard and Soft Skills */}
                        {skillsAnalysis && (
                            <CollapsibleSection
                                title="Hard and Soft Skills Inclusion"
                                icon={<svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
                                defaultOpen={true}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Skills Score</span>
                                        <span className={`text-lg font-bold ${
                                            skillsAnalysis.score >= 80 ? 'text-green-600 dark:text-green-400' :
                                            skillsAnalysis.score >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                                            'text-red-600 dark:text-red-400'
                                        }`}>
                                            {Math.round(skillsAnalysis.score)}%
                                        </span>
                                    </div>
                                    {skillsAnalysis.hardSkills.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hard Skills ({skillsAnalysis.hardSkills.length}):</p>
                                            <div className="flex flex-wrap gap-2">
                                                {skillsAnalysis.hardSkills.map((skill, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">{skill}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {skillsAnalysis.softSkills.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Soft Skills ({skillsAnalysis.softSkills.length}):</p>
                                            <div className="flex flex-wrap gap-2">
                                                {skillsAnalysis.softSkills.map((skill, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs">{skill}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CollapsibleSection>
                        )}

                        {/* 6. Length and Word Count */}
                        {lengthAnalysis && (
                            <CollapsibleSection
                                title="Length and Word Count"
                                icon={<svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                                defaultOpen={true}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Length Score</span>
                                        <span className={`text-lg font-bold ${
                                            lengthAnalysis.score >= 80 ? 'text-green-600 dark:text-green-400' :
                                            lengthAnalysis.score >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                                            'text-red-600 dark:text-red-400'
                                        }`}>
                                            {Math.round(lengthAnalysis.score)}%
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Page Count</p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{lengthAnalysis.pageCount}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Word Count</p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{lengthAnalysis.wordCount.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Optimal Length (1-2 pages):</span>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            lengthAnalysis.isOptimal 
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                        }`}>
                                            {lengthAnalysis.isOptimal ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                </div>
                            </CollapsibleSection>
                        )}

                        {/* 7. Readability and Consistency */}
                        {readabilityScore !== undefined && (
                            <CollapsibleSection
                                title="Readability and Consistency"
                                icon={<svg className="w-5 h-5 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                                defaultOpen={true}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Readability Score</span>
                                        <span className={`text-lg font-bold ${
                                            readabilityScore >= 80 ? 'text-green-600 dark:text-green-400' :
                                            readabilityScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                                            'text-red-600 dark:text-red-400'
                                        }`}>
                                            {Math.round(readabilityScore)}%
                                        </span>
                                    </div>
                                    {readabilityScore >= 80 ? (
                                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-sm font-medium text-green-800 dark:text-green-300">Excellent: Easy to Read</span>
                                            </div>
                                            <p className="text-xs text-green-700 dark:text-green-400 ml-6">
                                                Your CV uses clear language, consistent formatting, and proper structure that makes it easy for both ATS systems and recruiters to read and understand.
                                            </p>
                                        </div>
                                    ) : readabilityScore >= 60 ? (
                                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Needs Improvement</span>
                                            </div>
                                            <p className="text-xs text-yellow-700 dark:text-yellow-400 ml-6">
                                                Improve readability by using consistent formatting, clear section headers, and avoiding overly complex sentences. This helps ATS systems parse your CV correctly.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                <span className="text-sm font-medium text-red-800 dark:text-red-300">Poor Readability</span>
                                            </div>
                                            <p className="text-xs text-red-700 dark:text-red-400 ml-6">
                                                Your CV has readability issues that may prevent ATS systems from parsing it correctly. Focus on consistent formatting, clear structure, and simple language.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CollapsibleSection>
                        )}

                        {/* 8. ATS-Blocking Elements */}
                        {atsBlockingElements.length > 0 && (
                            <CollapsibleSection
                                title="ATS-Blocking Elements"
                                icon={<svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
                                count={atsBlockingElements.length}
                                defaultOpen={true}
                            >
                                <ul className="space-y-2">
                                    {atsBlockingElements.map((element, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                            <span className="text-red-500 dark:text-red-400 mt-0.5">•</span>
                                            <span>{element}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CollapsibleSection>
                        )}

                        {/* 9. Standard Headers */}
                        {standardHeaders && (
                            <CollapsibleSection
                                title="Standard Job Titles and Section Headers"
                                icon={<svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                                defaultOpen={true}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Headers Score</span>
                                        <span className={`text-lg font-bold ${
                                            standardHeaders.score >= 80 ? 'text-green-600 dark:text-green-400' :
                                            standardHeaders.score >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                                            'text-red-600 dark:text-red-400'
                                        }`}>
                                            {Math.round(standardHeaders.score)}%
                                        </span>
                                    </div>
                                    
                                    {standardHeaders.isStandard ? (
                                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-sm font-medium text-green-800 dark:text-green-300">Good: Uses Standard Headers</span>
                                            </div>
                                            <p className="text-xs text-green-700 dark:text-green-400 ml-6">
                                                Your CV uses standard section headers (e.g., "Work Experience", "Education", "Skills") that ATS systems recognize, making it easier to parse and categorize your information.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                <span className="text-sm font-medium text-red-800 dark:text-red-300">Non-Standard Headers Detected</span>
                                            </div>
                                            <p className="text-xs text-red-700 dark:text-red-400 ml-6">
                                                Your CV uses non-standard section headers that ATS systems may not recognize. Use standard headers like "Work Experience", "Education", and "Skills" instead.
                                            </p>
                                        </div>
                                    )}
                                    
                                    {standardHeaders.nonStandardHeaders.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Non-Standard Headers Found:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {standardHeaders.nonStandardHeaders.map((header, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded text-xs">{header}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CollapsibleSection>
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

