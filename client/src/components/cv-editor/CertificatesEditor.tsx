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
        <div>
            {showAnalysis && analysis && (
                <div className="mb-2">
                    <SectionAnalysisPanel issues={analysis.issues} suggestions={analysis.suggestions} />
                </div>
            )}

            {data.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic text-xs">No certificates added yet.</p>
            ) : (
                <ul className="space-y-2">
                    {data.map((item, index) => (
                        <li key={index} className="p-2 border dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 space-y-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                <div>
                                    <label htmlFor={`cert-name-${index}`} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Name</label>
                                    <input
                                        type="text"
                                        id={`cert-name-${index}`}
                                        value={item.name || ''}
                                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                        placeholder="Certificate Name"
                                        className="w-full px-1.5 py-0.5 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs"
                                    />
                                </div>
                                <div>
                                    <label htmlFor={`cert-issuer-${index}`} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Issuer</label>
                                    <input
                                        type="text"
                                        id={`cert-issuer-${index}`}
                                        value={item.issuer || ''}
                                        onChange={(e) => handleItemChange(index, 'issuer', e.target.value)}
                                        placeholder="Issuing Organization"
                                        className="w-full px-1.5 py-0.5 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs"
                                    />
                                </div>
                                <div>
                                    <label htmlFor={`cert-date-${index}`} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Date Issued</label>
                                    <input
                                        type="text"
                                        id={`cert-date-${index}`}
                                        value={item.date || ''}
                                        onChange={(e) => handleItemChange(index, 'date', e.target.value)}
                                        placeholder="YYYY-MM-DD or YYYY"
                                        className="w-full px-1.5 py-0.5 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs"
                                    />
                                </div>
                                <div>
                                    <label htmlFor={`cert-url-${index}`} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">URL (Optional)</label>
                                    <input
                                        type="url"
                                        id={`cert-url-${index}`}
                                        value={item.url || ''}
                                        onChange={(e) => handleItemChange(index, 'url', e.target.value)}
                                        placeholder="https://example.com/certificate"
                                        className="w-full px-1.5 py-0.5 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs"
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
                className="mt-2 px-2 py-1 bg-blue-500 dark:bg-blue-700 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-800 text-xs"
            >
                Add Certificate
            </button>
        </div>
    );
};

export default CertificatesEditor;