import React, { useState } from 'react';
import { EditorProps } from './types';
import { JsonResumeSkillItem } from '../../../../server/src/types/jsonresume';
import ArrayItemControls from './ArrayItemControls';
import { SectionScore } from '../../services/analysisApi'; // Import SectionScore
import SectionAnalysisPanel from './SectionAnalysisPanel'; // Import the panel

// Update props to include analysis and onApplyImprovements
interface SkillsEditorProps extends EditorProps<JsonResumeSkillItem[] | undefined> {
    analysis?: SectionScore | null;
    onApplyImprovements?: () => Promise<void>;
}

const SkillsEditor: React.FC<SkillsEditorProps> = ({ data = [], onChange, analysis }) => {
    const [isExpanded, setIsExpanded] = useState(data.length > 0);
    const [showAnalysis, setShowAnalysis] = useState(false);

    const handleItemChange = (index: number, field: keyof JsonResumeSkillItem, value: string | string[]) => {
        const newData = [...data];
        if (!newData[index]) {
            newData[index] = { name: '', level: '', keywords: [] }; // Initialize if missing
        }
        // Handle keywords array specifically if needed, otherwise treat as string for simplicity now
        newData[index] = { ...newData[index], [field]: value };
        onChange(newData);
    };

    const handleKeywordsChange = (index: number, value: string) => {
        // Simple comma-separated string to array conversion
        const keywordsArray = value.split(',').map(k => k.trim()).filter(k => k);
        handleItemChange(index, 'keywords', keywordsArray);
    };

    const handleDelete = (index: number) => {
        const newData = data.filter((_, i) => i !== index);
        onChange(newData);
    };

    const handleAdd = () => {
        const newItem: JsonResumeSkillItem = { name: '', level: '', keywords: [] };
        onChange([...data, newItem]);
    };

    return (
        <div className="p-4 border dark:border-gray-700 rounded shadow-sm bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Skills</h3>
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
                        <p className="text-gray-500 dark:text-gray-400 italic">No skills added yet.</p>
                    ) : (
                        <ul className="space-y-4">
                            {data.map((item, index) => (
                                <li key={index} className="p-3 border dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 space-y-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {/* Name (Category) */}
                                        <div>
                                            <label htmlFor={`skill-name-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Skill Category/Name</label>
                                            <input
                                                type="text"
                                                id={`skill-name-${index}`}
                                                value={item.name || ''}
                                                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                                placeholder="e.g., Programming Languages, Web Development"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                        </div>
                                        {/* Level */}
                                        <div>
                                            <label htmlFor={`skill-level-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Level (Optional)</label>
                                            <input
                                                type="text"
                                                id={`skill-level-${index}`}
                                                value={item.level || ''}
                                                onChange={(e) => handleItemChange(index, 'level', e.target.value)}
                                                placeholder="e.g., Advanced, Intermediate"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                        </div>
                                        {/* Keywords (as textarea) */}
                                        <div className="md:col-span-2">
                                            <label htmlFor={`skill-keywords-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specific Skills/Keywords (comma-separated)</label>
                                            <textarea
                                                id={`skill-keywords-${index}`}
                                                value={(item.keywords || []).join(', ')}
                                                onChange={(e) => handleKeywordsChange(index, e.target.value)}
                                                placeholder="e.g., JavaScript, TypeScript, React, Node.js"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                                rows={2}
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
                        Add Skill Category
                    </button>
                </>
            )}
        </div>
    );
};

export default SkillsEditor;