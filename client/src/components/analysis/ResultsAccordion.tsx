// client/src/components/analysis/ResultsAccordion.tsx
import React, { useState, useMemo } from 'react';
import { DetailedResultItem } from '../../services/analysisApi';

interface ResultsAccordionProps {
    detailedResults: Record<string, DetailedResultItem>;
    improvements: Record<string, { isGenerating: boolean; content?: string; error?: string }>;
    onImprove: (checkType: string, currentContent: string) => void;
    searchQuery?: string;
    priorityFilter?: 'all' | 'high' | 'medium' | 'low';
}

const ResultsAccordion: React.FC<ResultsAccordionProps> = ({
    detailedResults,
    improvements,
    onImprove,
    searchQuery = '',
    priorityFilter = 'all',
}) => {
    // Group results by category
    const checkToSectionMap: Record<string, string> = {
        impactQuantification: 'Experience',
        activeVoiceUsage: 'Experience',
        keywordRelevance: 'Skills',
        toneClarity: 'Summary',
        buzzwordsAndCliches: 'Summary',
        summaryObjectiveQuality: 'Summary',
        skillsOrganization: 'Skills',
        educationPresentation: 'Education',
    };

    const groupedResults = useMemo(() => {
        const groups: Record<string, Array<[string, DetailedResultItem]>> = {};
        
        Object.entries(detailedResults).forEach(([key, detail]) => {
            const category = checkToSectionMap[key] || 'Other';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push([key, detail]);
        });

        return groups;
    }, [detailedResults]);

    // Filter and search
    const filteredResults = useMemo(() => {
        const filtered: Record<string, Array<[string, DetailedResultItem]>> = {};
        
        Object.entries(groupedResults).forEach(([category, items]) => {
            const filteredItems = items.filter(([key, detail]) => {
                // Priority filter
                if (priorityFilter !== 'all' && detail.priority !== priorityFilter) {
                    return false;
                }
                
                // Search filter
                if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    return (
                        detail.checkName.toLowerCase().includes(query) ||
                        detail.issues.some((issue) => issue.toLowerCase().includes(query)) ||
                        (detail.suggestions || []).some((suggestion) => suggestion.toLowerCase().includes(query))
                    );
                }
                
                return true;
            });
            
            if (filteredItems.length > 0) {
                filtered[category] = filteredItems;
            }
        });
        
        return filtered;
    }, [groupedResults, searchQuery, priorityFilter]);

    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(Object.keys(filteredResults))
    );

    const toggleCategory = (category: string) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700';
            case 'medium':
                return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
            case 'low':
                return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700';
            default:
                return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pass':
                return 'text-green-600 dark:text-green-400';
            case 'fail':
                return 'text-red-600 dark:text-red-400';
            case 'warning':
                return 'text-yellow-600 dark:text-yellow-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    if (Object.keys(filteredResults).length === 0) {
        return (
            <div className="text-center py-12 px-4">
                <svg
                    className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No results found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {searchQuery || priorityFilter !== 'all'
                        ? 'Try adjusting your search or filter criteria.'
                        : 'No detailed results available.'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {Object.entries(filteredResults)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([category, items]) => {
                    const isExpanded = expandedCategories.has(category);
                    const highPriorityCount = items.filter(([, detail]) => detail.priority === 'high').length;
                    const failCount = items.filter(([, detail]) => detail.status === 'fail').length;

                    return (
                        <div
                            key={category}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm overflow-hidden"
                        >
                            <button
                                onClick={() => toggleCategory(category)}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <svg
                                        className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${
                                            isExpanded ? 'rotate-90' : ''
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        {category}
                                    </h3>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        ({items.length} {items.length === 1 ? 'check' : 'checks'})
                                    </span>
                                    {highPriorityCount > 0 && (
                                        <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">
                                            {highPriorityCount} high priority
                                        </span>
                                    )}
                                    {failCount > 0 && (
                                        <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded">
                                            {failCount} failed
                                        </span>
                                    )}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                                    {items
                                        .sort(([, a], [, b]) => {
                                            const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
                                            return priorityOrder[a.priority] - priorityOrder[b.priority];
                                        })
                                        .map(([key, detail]) => (
                                            <div
                                                key={key}
                                                className={`p-4 border rounded-lg ${getPriorityColor(detail.priority)}`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="font-medium text-gray-900 dark:text-gray-200">
                                                        {detail.checkName}
                                                    </p>
                                                    <span
                                                        className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(
                                                            detail.priority
                                                        )}`}
                                                    >
                                                        {detail.priority.toUpperCase()} Priority
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                                    Status:{' '}
                                                    <span className={`font-medium ${getStatusColor(detail.status)}`}>
                                                        {detail.status}
                                                    </span>
                                                    {detail.score !== undefined && (
                                                        <span className="text-gray-600 dark:text-gray-400">
                                                            {' '}
                                                            (Score: {detail.score})
                                                        </span>
                                                    )}
                                                </p>

                                                {detail.issues && detail.issues.length > 0 && (
                                                    <div className="mb-3">
                                                        <p className="text-sm font-semibold mb-1 text-gray-900 dark:text-gray-300">
                                                            Issues:
                                                        </p>
                                                        <ul className="list-disc list-inside ml-2 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                                            {detail.issues.map((issue, index) => (
                                                                <li key={index}>{issue}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {detail.suggestions && detail.suggestions.length > 0 && (
                                                    <div className="mb-3">
                                                        <p className="text-sm font-semibold mb-1 text-gray-900 dark:text-gray-300">
                                                            Suggestions:
                                                        </p>
                                                        <ul className="list-disc list-inside ml-2 text-sm text-blue-700 dark:text-blue-400 space-y-1">
                                                            {detail.suggestions.map((suggestion, index) => (
                                                                <li key={index}>{suggestion}</li>
                                                            ))}
                                                        </ul>

                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <button
                                                                onClick={() =>
                                                                    onImprove(key, detail.originalContent || '')
                                                                }
                                                                disabled={improvements[key]?.isGenerating}
                                                                className="px-4 py-2 text-sm bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                                            >
                                                                {improvements[key]?.isGenerating ? (
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
                                                                            />
                                                                            <path
                                                                                className="opacity-75"
                                                                                fill="currentColor"
                                                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                                            />
                                                                        </svg>
                                                                        Generating...
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
                                                                                d="M13 10V3L4 14h7v7l9-11h-7z"
                                                                            />
                                                                        </svg>
                                                                        Generate Improvement
                                                                    </>
                                                                )}
                                                            </button>

                                                            {improvements[key]?.error && (
                                                                <p className="text-sm text-red-600 dark:text-red-400">
                                                                    {improvements[key].error}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {improvements[key]?.content && (
                                                            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <p className="text-sm font-medium text-green-800 dark:text-green-300">
                                                                        Improved Version:
                                                                    </p>
                                                                    <button
                                                                        onClick={() =>
                                                                            copyToClipboard(improvements[key].content || '')
                                                                        }
                                                                        className="text-xs px-2 py-1 bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-800 transition-colors flex items-center gap-1"
                                                                        title="Copy to clipboard"
                                                                    >
                                                                        <svg
                                                                            className="w-3 h-3"
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            viewBox="0 0 24 24"
                                                                        >
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={2}
                                                                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                                                            />
                                                                        </svg>
                                                                        Copy
                                                                    </button>
                                                                </div>
                                                                <p className="text-sm mt-1 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                                                                    {improvements[key].content}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    );
                })}
        </div>
    );
};

export default ResultsAccordion;

