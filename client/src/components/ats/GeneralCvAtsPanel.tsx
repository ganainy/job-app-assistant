// General CV ATS Analysis Panel - for CV analysis without job description
import React, { useState, useMemo } from 'react';
import { AtsScores } from '../../services/atsApi';
import { SectionAnalysisResult } from '../../services/analysisApi';

interface GeneralCvAtsPanelProps {
    atsScores: AtsScores | null;
    analyses?: Record<string, SectionAnalysisResult[]>;
    isLoading?: boolean;
}

type TabType = 'overview' | 'keywords' | 'formatting' | 'completeness' | 'quantifiable' | 'skills' | 'length' | 'readability' | 'blocking' | 'headers' | 'recommendations';

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

const GeneralCvAtsPanel: React.FC<GeneralCvAtsPanelProps> = ({ atsScores, analyses, isLoading }) => {
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    const sectionHealth = useMemo(() => {
        if (!analyses) return [];
        const sections = ['work', 'education', 'skills', 'summary'];
        return sections.map(section => {
            const sectionAnalyses = analyses[section] || [];
            const totalItems = sectionAnalyses.length;
            const itemsNeedingImprovement = sectionAnalyses.filter(a => a.needsImprovement).length;
            const isHealthy = totalItems > 0 && itemsNeedingImprovement === 0;

            return {
                name: section.charAt(0).toUpperCase() + section.slice(1),
                isHealthy,
                issuesCount: itemsNeedingImprovement,
                totalCount: totalItems
            };
        });
    }, [analyses]);

    const topSuggestions = useMemo(() => {
        if (!analyses) return [];
        const allSuggestions: { section: string; feedback: string }[] = [];

        Object.entries(analyses).forEach(([section, results]) => {
            results.forEach(result => {
                if (result.needsImprovement && result.feedback) {
                    allSuggestions.push({
                        section: section.charAt(0).toUpperCase() + section.slice(1),
                        feedback: result.feedback
                    });
                }
            });
        });

        return allSuggestions.slice(0, 3);
    }, [analyses]);

    const getRecommendationPriority = (rec: string): 'critical' | 'high' | 'medium' => {
        const lowerRec = rec.toLowerCase();
        if (lowerRec.includes('crucial') || lowerRec.includes('critical') || lowerRec.includes('significantly') || lowerRec.includes('must') || lowerRec.includes('required')) {
            return 'critical';
        }
        if (lowerRec.includes('important') || lowerRec.includes('should') || lowerRec.includes('consider') || lowerRec.includes('recommend')) {
            return 'high';
        }
        return 'medium';
    };

    if (isLoading) {
        return (
            <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-6 w-6 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded animate-pulse"></div>
                    <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-40 animate-pulse"></div>
                </div>
                <div className="space-y-4">
                    <div className="h-40 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg animate-pulse"></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-32 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg animate-pulse"></div>
                        <div className="h-32 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg animate-pulse"></div>
                    </div>
                    <div className="h-24 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg animate-pulse"></div>
                </div>
                <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Analyzing your CV...</p>
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

    // Define severity type for better organization
    type SeverityType = 'critical' | 'important' | 'enhancement' | null;

    interface TabConfig {
        id: TabType;
        label: string;
        count?: number;
        severity: SeverityType;
    }

    // Severity indicators
    const severityConfig = {
        critical: { emoji: '🔴', color: 'text-red-600 dark:text-red-400', border: 'border-l-2 border-red-500' },
        important: { emoji: '🟡', color: 'text-amber-600 dark:text-amber-400', border: 'border-l-2 border-amber-500' },
        enhancement: { emoji: '🟢', color: 'text-green-600 dark:text-green-400', border: 'border-l-2 border-green-500' }
    };

    // Build tabs array with priority order: Critical → Important → Enhancement → Recommendations
    const allTabs: TabConfig[] = [
        // Critical 🔴 - Direct ATS pass/fail impact
        { id: 'overview' as TabType, label: 'Overview', severity: 'critical' },
        ...(atsBlockingElements.length > 0 ? [{ id: 'blocking' as TabType, label: 'Blocking Elements', count: atsBlockingElements.length, severity: 'critical' as SeverityType }] : []),

        // Important 🟡 - Strong impact on ATS ranking
        ...(keywordsMatched.length > 0 || keywordsMissing.length > 0 ? [{ id: 'keywords' as TabType, label: 'Keywords', count: keywordsMatched.length + keywordsMissing.length, severity: 'important' as SeverityType }] : []),
        ...((sectionCompleteness || sectionHealth.length > 0) ? [{ id: 'completeness' as TabType, label: 'Completeness', severity: 'important' as SeverityType }] : []),
        ...(formattingIssues.length > 0 ? [{ id: 'formatting' as TabType, label: 'Formatting', count: formattingIssues.length, severity: 'important' as SeverityType }] : []),
        ...(standardHeaders ? [{ id: 'headers' as TabType, label: 'Headers', severity: 'important' as SeverityType }] : []),

        // Enhancement 🟢 - Improves quality but less critical
        ...(quantifiableMetrics ? [{ id: 'quantifiable' as TabType, label: 'Metrics', severity: 'enhancement' as SeverityType }] : []),
        ...(skillsAnalysis ? [{ id: 'skills' as TabType, label: 'Skills', severity: 'enhancement' as SeverityType }] : []),
        ...(readabilityScore !== undefined ? [{ id: 'readability' as TabType, label: 'Readability', severity: 'enhancement' as SeverityType }] : []),
        ...(lengthAnalysis ? [{ id: 'length' as TabType, label: 'Length', severity: 'enhancement' as SeverityType }] : []),

        // Always last - Actionable recommendations
        { id: 'recommendations' as TabType, label: 'Recommendations', count: recommendations.length, severity: null }
    ];

    const tabs = allTabs;

    const score = atsScores?.score || 0;
    const scoreColor = score >= 80 ? 'text-green-600 dark:text-green-400' : score >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
    const scoreBg = score >= 80 ? 'bg-green-100 dark:bg-green-900/30' : score >= 60 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30';

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                <nav className="flex space-x-1 min-w-max" aria-label="Tabs">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const severityStyle = tab.severity ? severityConfig[tab.severity] : null;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative
                                    ${isActive
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }
                                    ${severityStyle ? severityStyle.border : ''}
                                `}
                            >
                                <span className="flex items-center gap-1.5">
                                    {severityStyle && (
                                        <span className="text-xs" title={`${tab.severity?.charAt(0).toUpperCase()}${tab.severity?.slice(1)} Priority`}>
                                            {severityStyle.emoji}
                                        </span>
                                    )}
                                    {tab.label}
                                    {(tab.count ?? 0) > 0 && (
                                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${isActive
                                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* ATS Score Card - Prominent Display */}
                        {atsScores && atsScores.score !== null && atsScores.score !== undefined && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center justify-center text-center shadow-lg">
                                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6">ATS Compatibility Score</h3>
                                <div className={`relative w-40 h-40 flex items-center justify-center rounded-full border-8 ${score >= 80 ? 'border-green-100 dark:border-green-900/30' : score >= 60 ? 'border-amber-100 dark:border-amber-900/30' : 'border-red-100 dark:border-red-900/30'} mb-6`}>
                                    <div className={`text-5xl font-bold ${scoreColor}`}>
                                        {Math.round(score)}%
                                    </div>
                                </div>
                                <p className="text-base text-gray-700 dark:text-gray-300 font-medium">
                                    {score >= 80 ? 'Excellent! Your CV is ATS friendly.' : score >= 60 ? 'Good, but could be improved.' : 'Needs attention to pass ATS filters.'}
                                </p>
                            </div>
                        )}

                        {/* Section Health Status */}
                        {Object.keys(sectionScores).length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Section Health Status</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(sectionScores).map(([section, score]) => {
                                        const getScoreColor = (score: number) => {
                                            if (score >= 80) return 'text-green-600 dark:text-green-400';
                                            if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
                                            return 'text-red-600 dark:text-red-400';
                                        };

                                        // Try to find matching health info
                                        const sectionNameLower = section.toLowerCase();
                                        const healthInfo = sectionHealth.find(h => {
                                            const hName = h.name.toLowerCase();
                                            return hName === sectionNameLower ||
                                                (hName === 'work' && sectionNameLower.includes('work'));
                                        });

                                        return (
                                            <div
                                                key={section}
                                                className="p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize text-base">
                                                            {section.replace(/([A-Z])/g, ' $1').trim()}
                                                        </span>
                                                        {healthInfo && (
                                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${healthInfo.isHealthy
                                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                                                }`}>
                                                                {healthInfo.isHealthy ? 'Healthy' : `${healthInfo.issuesCount} Issues`}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
                                                        {Math.round(score)}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                                    <div
                                                        className={`h-2.5 rounded-full transition-all duration-700 ease-out ${score >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600 dark:from-green-400 dark:to-green-500' :
                                                            score >= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 dark:from-yellow-400 dark:to-yellow-500' :
                                                                'bg-gradient-to-r from-red-500 to-red-600 dark:from-red-400 dark:to-red-500'
                                                            }`}
                                                        style={{ width: `${score}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}


                    </div>
                )}

                {/* Keywords Tab */}
                {activeTab === 'keywords' && (
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
                )}

                {/* Formatting Tab */}
                {activeTab === 'formatting' && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Formatting Issues</h3>
                        <ul className="space-y-2">
                            {formattingIssues.map((issue, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                    <span className="text-orange-500 dark:text-orange-400 mt-0.5">•</span>
                                    <span>{issue}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Completeness Tab */}
                {activeTab === 'completeness' && (
                    <div className="space-y-4">
                        {sectionCompleteness && (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Completeness Score</span>
                                    <span className={`text-lg font-bold ${sectionCompleteness.score >= 80 ? 'text-green-600 dark:text-green-400' :
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
                            </>
                        )}
                    </div>
                )}

                {/* Quantifiable Metrics Tab */}
                {activeTab === 'quantifiable' && quantifiableMetrics && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Quality Score</span>
                            <span className={`text-lg font-bold ${quantifiableMetrics.score >= 80 ? 'text-green-600 dark:text-green-400' :
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
                )}

                {/* Skills Tab */}
                {activeTab === 'skills' && skillsAnalysis && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Skills Score</span>
                            <span className={`text-lg font-bold ${skillsAnalysis.score >= 80 ? 'text-green-600 dark:text-green-400' :
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
                )}

                {/* Length Tab */}
                {activeTab === 'length' && lengthAnalysis && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Length Score</span>
                            <span className={`text-lg font-bold ${lengthAnalysis.score >= 80 ? 'text-green-600 dark:text-green-400' :
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
                            <span className={`px-2 py-1 rounded text-xs font-medium ${lengthAnalysis.isOptimal
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                }`}>
                                {lengthAnalysis.isOptimal ? 'Yes' : 'No'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Readability Tab */}
                {activeTab === 'readability' && readabilityScore !== undefined && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Readability Score</span>
                            <span className={`text-lg font-bold ${readabilityScore >= 80 ? 'text-green-600 dark:text-green-400' :
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
                )}

                {/* Blocking Elements Tab */}
                {activeTab === 'blocking' && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">ATS-Blocking Elements</h3>
                        <ul className="space-y-2">
                            {atsBlockingElements.map((element, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                    <span className="text-red-500 dark:text-red-400 mt-0.5">•</span>
                                    <span>{element}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Headers Tab */}
                {activeTab === 'headers' && standardHeaders && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Headers Score</span>
                            <span className={`text-lg font-bold ${standardHeaders.score >= 80 ? 'text-green-600 dark:text-green-400' :
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
                                {recommendations.map((rec, index) => {
                                    const priority = getRecommendationPriority(rec);
                                    const priorityConfig = {
                                        critical: {
                                            bg: 'bg-red-50 dark:bg-red-900/20',
                                            border: 'border-red-200 dark:border-red-800',
                                            badge: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
                                            number: 'bg-red-600 dark:bg-red-500',
                                            label: 'Critical'
                                        },
                                        high: {
                                            bg: 'bg-orange-50 dark:bg-orange-900/20',
                                            border: 'border-orange-200 dark:border-orange-800',
                                            badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
                                            number: 'bg-orange-600 dark:bg-orange-500',
                                            label: 'High'
                                        },
                                        medium: {
                                            bg: 'bg-blue-50 dark:bg-blue-900/20',
                                            border: 'border-blue-200 dark:border-blue-800',
                                            badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
                                            number: 'bg-blue-600 dark:bg-blue-500',
                                            label: 'Medium'
                                        }
                                    };
                                    const config = priorityConfig[priority];

                                    return (
                                        <div
                                            key={index}
                                            className={`p-4 ${config.bg} border ${config.border} rounded-lg`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 mt-0.5">
                                                    <div className={`w-6 h-6 ${config.number} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                                                        {index + 1}
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${config.badge}`}>
                                                            {config.label}
                                                        </span>
                                                        {priority === 'critical' && (
                                                            <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                                                                Crucial Improvement
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">{rec}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
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
            {
                atsScores.lastAnalyzedAt && (
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
                )
            }
        </div >
    );
};

export default GeneralCvAtsPanel;

