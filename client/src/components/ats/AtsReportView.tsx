import React, { useState } from 'react';
import { AtsScores } from '../../services/atsApi';

interface AtsReportViewProps {
    atsScores: AtsScores | null;
    onEditCv: () => void;
    onDownloadReport: () => void;
}

const AtsReportView: React.FC<AtsReportViewProps> = ({ atsScores, onEditCv, onDownloadReport }) => {
    const score = atsScores?.score || 0;

    // Use real data from atsScores
    const matchedKeywords = atsScores?.complianceDetails?.keywordsMatched || [];
    const missingKeywords = atsScores?.complianceDetails?.keywordsMissing || [];

    // Helper for score color
    const getScoreColor = (score: number) => {
        if (score >= 80) return '#22c55e'; // green-500
        if (score >= 60) return '#f59e0b'; // amber-500
        return '#ef4444'; // red-500
    };

    const scoreColor = getScoreColor(score);

    return (
        <div className="space-y-6">
            {/* Score Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-8">
                    {/* Circular Progress */}
                    <div className="relative w-32 h-32 flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="transparent"
                                className="text-gray-100 dark:text-gray-700"
                            />
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke={scoreColor}
                                strokeWidth="12"
                                fill="transparent"
                                strokeDasharray={351.86}
                                strokeDashoffset={351.86 - (351.86 * score) / 100}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-bold text-gray-900 dark:text-white">{Math.round(score)}%</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Score</span>
                        </div>
                    </div>

                    {/* Text Content */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">ATS Compatibility Score</h3>
                        <p className={`font-medium mb-2 ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                            {score >= 80 ? 'Good Fit' : score >= 60 ? 'Average Fit' : 'Needs Improvement'}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md">
                            Your CV is {score >= 80 ? 'well-optimized' : 'moderately optimized'} for Applicant Tracking Systems.
                            {score < 80 && ' Consider addressing the missing keywords and formatting issues.'}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onEditCv}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                    >
                        Edit CV
                    </button>
                    <button
                        onClick={onDownloadReport}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                    >
                        Download Report
                    </button>
                </div>
            </div>

            {/* Keyword Analysis */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 dark:text-white">Keyword Analysis</h3>
                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        This section displays the detailed keyword analysis, highlighting matched keywords in green and missing keywords in orange.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {matchedKeywords.length > 0 ? (
                            matchedKeywords.map((keyword, idx) => (
                                <span key={`match-${idx}`} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                                    {keyword}
                                </span>
                            ))
                        ) : (
                            <span className="text-sm text-gray-500 italic">No matched keywords found.</span>
                        )}
                        {missingKeywords.map((keyword, idx) => (
                            <span key={`miss-${idx}`} className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm font-medium">
                                {keyword}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Collapsible Sections */}
            <CollapsibleCard title="Formatting Check">
                {atsScores?.complianceDetails?.formattingIssues && atsScores.complianceDetails.formattingIssues.length > 0 ? (
                    <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        {atsScores.complianceDetails.formattingIssues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        No formatting issues detected.
                    </p>
                )}
            </CollapsibleCard>

            <CollapsibleCard title="Contact Info">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Contact information analysis is not yet available in the ATS report. Please check the CV editor for details.
                </p>
            </CollapsibleCard>

            <CollapsibleCard title="Actionable Feedback" isOpen={true}>
                {atsScores?.complianceDetails?.suggestions && atsScores.complianceDetails.suggestions.length > 0 ? (
                    <ul className="space-y-3">
                        {atsScores.complianceDetails.suggestions.map((suggestion, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                                <span className="flex-shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full bg-blue-500"></span>
                                <span>{suggestion}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-500 italic">No specific suggestions available at this time.</p>
                )}
            </CollapsibleCard>
        </div>
    );
};

const CollapsibleCard: React.FC<{ title: string; isOpen?: boolean; children?: React.ReactNode }> = ({ title, isOpen = false, children }) => {
    const [open, setOpen] = useState(isOpen);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full p-6 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
            >
                <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
                <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && (
                <div className="p-6 border-t border-gray-100 dark:border-gray-700">
                    {children || <p className="text-gray-500 italic">Content for {title}...</p>}
                </div>
            )}
        </div>
    );
};

export default AtsReportView;
