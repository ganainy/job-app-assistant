import React, { useState } from 'react';
import { EditorProps } from './types';
import { JsonResumeCertificateItem } from '../../../../server/src/types/jsonresume';
import ArrayItemControls from './ArrayItemControls';
import { SectionScore } from '../../services/analysisApi'; // Import SectionScore
import SectionAnalysisPanel from './SectionAnalysisPanel'; // Import the panel

// Update props to include analysis and onApplyImprovements
interface CertificatesEditorProps extends EditorProps<JsonResumeCertificateItem[] | undefined> {
    analysis?: SectionScore | null;
    onApplyImprovements?: () => Promise<void>;
}

const CertificatesEditor: React.FC<CertificatesEditorProps> = ({ data = [], onChange, analysis }) => {
    const [isExpanded, setIsExpanded] = useState(data.length > 0);
    const [showAnalysis, setShowAnalysis] = useState(false);

    const handleItemChange = (index: number, field: keyof JsonResumeCertificateItem, value: string) => {
        const newData = [...data];
        // Ensure the item exists before trying to update it
        if (!newData[index]) {
            newData[index] = { name: '', date: '', issuer: '', url: '' }; // Initialize if somehow missing
        }
        newData[index] = { ...newData[index], [field]: value };
        onChange(newData);
    };

    const handleDelete = (index: number) => {
        const newData = data.filter((_, i) => i !== index);
        onChange(newData);
    };

    const handleAdd = () => {
        const newItem: JsonResumeCertificateItem = { name: '', date: '', issuer: '', url: '' };
        onChange([...data, newItem]);
    };

    return (
        <div className="p-4 border dark:border-gray-700 rounded shadow-sm bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Certificates</h3>
                    {/* Show analysis button only if there are issues or suggestions */}
                    {analysis && (analysis.issues.length > 0 || analysis.suggestions.length > 0) && (
                        <button
                            type="button"
                            onClick={() => setShowAnalysis(!showAnalysis)}
                            className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 focus:outline-none"
                            title={showAnalysis ? "Hide Analysis" : "Show Analysis"}
                        >
                            {`Analysis (${analysis.issues.length} issues)`} {showAnalysis ? '▲' : '▼'}
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                    {isExpanded ? 'Collapse' : 'Expand'}
                </button>
            </div>

            {/* Conditionally render the analysis panel */}
            {showAnalysis && analysis && (
                <SectionAnalysisPanel issues={analysis.issues} suggestions={analysis.suggestions} />
            )}

            {isExpanded && (
                <>
                    {data.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 italic">No certificates added yet.</p>
                    ) : (
                        <ul className="space-y-4">
                            {data.map((item, index) => (
                                <li key={index} className="p-3 border dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 space-y-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div>
                                            <label htmlFor={`cert-name-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                                            <input
                                                type="text"
                                                id={`cert-name-${index}`}
                                                value={item.name || ''}
                                                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                                placeholder="Certificate Name"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`cert-issuer-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issuer</label>
                                            <input
                                                type="text"
                                                id={`cert-issuer-${index}`}
                                                value={item.issuer || ''}
                                                onChange={(e) => handleItemChange(index, 'issuer', e.target.value)}
                                                placeholder="Issuing Organization"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`cert-date-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Issued</label>
                                            <input
                                                type="text" // Using text for flexibility (e.g., "YYYY-MM-DD" or "YYYY")
                                                id={`cert-date-${index}`}
                                                value={item.date || ''}
                                                onChange={(e) => handleItemChange(index, 'date', e.target.value)}
                                                placeholder="YYYY-MM-DD or YYYY"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`cert-url-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL (Optional)</label>
                                            <input
                                                type="url"
                                                id={`cert-url-${index}`}
                                                value={item.url || ''}
                                                onChange={(e) => handleItemChange(index, 'url', e.target.value)}
                                                placeholder="https://example.com/certificate"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <ArrayItemControls index={index} onDelete={handleDelete} />
                                </li>
                            ))}
                        </ul>
                    )}
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="mt-4 px-3 py-1 bg-blue-500 dark:bg-blue-700 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-800 text-sm"
                    >
                        Add Certificate
                    </button>
                </>
            )}
        </div>
    );
};

export default CertificatesEditor;