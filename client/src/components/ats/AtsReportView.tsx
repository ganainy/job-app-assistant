import React, { useState } from 'react';
import { AtsScores } from '../../services/atsApi';

interface AtsReportViewProps {
    atsScores: AtsScores | null;
    onEditCv: () => void;
    onDelete?: () => void;
}

const AtsReportView: React.FC<AtsReportViewProps> = ({ atsScores, onEditCv, onDelete }) => {
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
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors flex items-center gap-2"
                            title="Delete Analysis"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="hidden sm:inline">Delete</span>
                        </button>
                    )}
                    <button
                        onClick={onEditCv}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                    >
                        Edit CV
                    </button>
                </div>
            </div>

            {/* Score Breakdown - Enhanced visualization */}
            {atsScores?.complianceDetails?.scoreBreakdown && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Score Breakdown
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Technical Skills', score: atsScores.complianceDetails.scoreBreakdown.technicalSkills, weight: '40%' },
                            { label: 'Experience', score: atsScores.complianceDetails.scoreBreakdown.experienceRelevance, weight: '30%' },
                            { label: 'Additional Skills', score: atsScores.complianceDetails.scoreBreakdown.additionalSkills, weight: '20%' },
                            { label: 'Formatting', score: atsScores.complianceDetails.scoreBreakdown.formatting, weight: '10%' },
                        ].map((item, idx) => (
                            <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{item.label}</span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">({item.weight})</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                        <div
                                            className={`h-2.5 rounded-full transition-all duration-500 ${item.score >= 80 ? 'bg-green-500' :
                                                item.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}
                                            style={{ width: `${item.score}%` }}
                                        ></div>
                                    </div>
                                    <span className={`text-sm font-bold w-12 text-right ${item.score >= 80 ? 'text-green-600 dark:text-green-400' :
                                        item.score >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                                        }`}>
                                        {item.score}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
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
            {/* Actionable Feedback - shown first since it has priority content */}
            <CollapsibleCard title="Actionable Feedback" isOpen={true}>
                {/* Priority-based actionable feedback (new enhanced format) */}
                {atsScores?.complianceDetails?.actionableFeedback && atsScores.complianceDetails.actionableFeedback.length > 0 ? (
                    <div className="space-y-4">
                        {/* High Priority */}
                        {atsScores.complianceDetails.actionableFeedback.filter(f => f.priority === 'high').length > 0 && (
                            <div className="space-y-2">
                                <h5 className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    High Priority
                                </h5>
                                {atsScores.complianceDetails.actionableFeedback.filter(f => f.priority === 'high').map((feedback, idx) => (
                                    <div key={`high-${idx}`} className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{feedback.action}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            <span className="font-medium text-green-600 dark:text-green-400">Impact:</span> {feedback.impact}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Medium Priority */}
                        {atsScores.complianceDetails.actionableFeedback.filter(f => f.priority === 'medium').length > 0 && (
                            <div className="space-y-2">
                                <h5 className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                    Medium Priority
                                </h5>
                                {atsScores.complianceDetails.actionableFeedback.filter(f => f.priority === 'medium').map((feedback, idx) => (
                                    <div key={`medium-${idx}`} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded-r-lg">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{feedback.action}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            <span className="font-medium text-green-600 dark:text-green-400">Impact:</span> {feedback.impact}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Low Priority */}
                        {atsScores.complianceDetails.actionableFeedback.filter(f => f.priority === 'low').length > 0 && (
                            <div className="space-y-2">
                                <h5 className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Low Priority
                                </h5>
                                {atsScores.complianceDetails.actionableFeedback.filter(f => f.priority === 'low').map((feedback, idx) => (
                                    <div key={`low-${idx}`} className="p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{feedback.action}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            <span className="font-medium text-green-600 dark:text-green-400">Impact:</span> {feedback.impact}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : atsScores?.complianceDetails?.suggestions && atsScores.complianceDetails.suggestions.length > 0 ? (
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
