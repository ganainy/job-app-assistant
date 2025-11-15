import React, { useState } from 'react';

interface SectionAnalysisPanelProps {
    issues: string[];
    suggestions: string[];
    onAcceptChanges?: () => void;
    onCancelChanges?: () => void;
}

const SectionAnalysisPanel: React.FC<SectionAnalysisPanelProps> = ({
    issues,
    suggestions,
    onAcceptChanges,
    onCancelChanges
}) => {
    const [isShowingActions, setIsShowingActions] = useState(false);

    // If there are no issues and no suggestions, show a success message
    if (issues.length === 0 && suggestions.length === 0) {
        return (
            <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-green-700">
                    <span className="font-medium">Great job!</span> This section looks good and follows best practices.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-3 p-4 bg-orange-50 border border-orange-200 rounded">
            {issues.length > 0 && (
                <div className="mb-4">
                    <h4 className="font-medium text-orange-800 mb-2">Issues Found:</h4>
                    <ul className="list-disc list-inside space-y-1">
                        {issues.map((issue, index) => (
                            <li key={index} className="text-orange-700 text-sm">{issue}</li>
                        ))}
                    </ul>
                </div>
            )}

            {suggestions.length > 0 && (
                <div className="mb-4">
                    <h4 className="font-medium text-blue-800 mb-2">Suggested Improvements:</h4>
                    <ul className="list-disc list-inside space-y-1">
                        {suggestions.map((suggestion, index) => (
                            <li key={index} className="text-blue-700 text-sm">{suggestion}</li>
                        ))}
                    </ul>
                </div>
            )}

            {(onAcceptChanges || onCancelChanges) && (
                <div className="mt-4 flex gap-3">
                    {onAcceptChanges && (
                        <button
                            onClick={onAcceptChanges}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                            Apply Changes
                        </button>
                    )}
                    {onCancelChanges && (
                        <button
                            onClick={onCancelChanges}
                            className="px-4 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default SectionAnalysisPanel;