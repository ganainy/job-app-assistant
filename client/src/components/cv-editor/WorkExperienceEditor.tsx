import React, { useState } from 'react';
import { EditorProps } from './types';
import ArrayItemControls from './ArrayItemControls';
import { JsonResumeWorkItem } from '../../../../server/src/types/jsonresume';
import { SectionScore } from '../../services/analysisApi';
import SectionAnalysisPanel from './SectionAnalysisPanel';

type WorkItem = JsonResumeWorkItem;

interface WorkExperienceEditorProps extends EditorProps<WorkItem[] | undefined> {
    analysis?: SectionScore | null;
    onApplyImprovements?: (improvements: string) => void;
}

const WorkExperienceEditor: React.FC<WorkExperienceEditorProps> = ({
    data = [],
    onChange,
    analysis,
    onApplyImprovements
}) => {
    const [isExpanded, setIsExpanded] = useState(data.length > 0);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [pendingImprovements, setPendingImprovements] = useState<string | null>(null);

    const handleItemChange = (index: number, field: keyof WorkItem, value: string | string[]) => {
        const newItems = [...data];
        newItems[index] = { ...newItems[index], [field]: value };
        onChange(newItems);
    };

    const handleArrayFieldChange = (index: number, field: keyof WorkItem, value: string, delimiter: string) => {
        const arrayValue = value.split(delimiter).map(s => s.trim()).filter(s => s);
        handleItemChange(index, field, arrayValue);
    };

    const addItem = () => {
        const newItem: WorkItem = {
            name: '',
            position: '',
            startDate: '',
            summary: '',
            highlights: ['']
        };
        onChange([...data, newItem]);
    };

    const deleteItem = (index: number) => {
        const newItems = data.filter((_: WorkItem, i: number) => i !== index);
        onChange(newItems);
    };

    const handleAcceptChanges = () => {
        if (pendingImprovements && onApplyImprovements) {
            onApplyImprovements(pendingImprovements);
            setPendingImprovements(null);
        }
    };

    const handleCancelChanges = () => {
        setPendingImprovements(null);
    };

    return (
        <div className="p-4 border dark:border-gray-700 rounded shadow-sm bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Work Experience</h3>
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

            {showAnalysis && analysis && (
                <SectionAnalysisPanel
                    issues={analysis.issues}
                    suggestions={analysis.suggestions}
                    onAcceptChanges={onApplyImprovements ? handleAcceptChanges : undefined}
                    onCancelChanges={pendingImprovements ? handleCancelChanges : undefined}
                />
            )}

            {isExpanded && (
                <>
                    {data.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 italic">No work experience added yet.</p>
                    ) : (
                        <ul className="space-y-4">
                            {data.map((item, index) => (
                                <li key={index} className="p-3 border dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 space-y-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div>
                                            <label htmlFor={`work-name-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
                                            <input
                                                type="text"
                                                id={`work-name-${index}`}
                                                value={item.name || ''}
                                                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                                placeholder="Company Name"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`work-position-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position/Job Title</label>
                                            <input
                                                type="text"
                                                id={`work-position-${index}`}
                                                value={item.position || ''}
                                                onChange={(e) => handleItemChange(index, 'position', e.target.value)}
                                                placeholder="Your Job Title"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`work-startDate-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                            <input
                                                type="text"
                                                id={`work-startDate-${index}`}
                                                value={item.startDate || ''}
                                                onChange={(e) => handleItemChange(index, 'startDate', e.target.value)}
                                                placeholder="YYYY-MM-DD or YYYY-MM"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`work-endDate-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date (or Present)</label>
                                            <input
                                                type="text"
                                                id={`work-endDate-${index}`}
                                                value={item.endDate || ''}
                                                onChange={(e) => handleItemChange(index, 'endDate', e.target.value)}
                                                placeholder="YYYY-MM-DD or Present"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`work-location-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location (Optional)</label>
                                            <input
                                                type="text"
                                                id={`work-location-${index}`}
                                                value={item.location || ''}
                                                onChange={(e) => handleItemChange(index, 'location', e.target.value)}
                                                placeholder="e.g., City, State/Country"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`work-url-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company URL (Optional)</label>
                                            <input
                                                type="url"
                                                id={`work-url-${index}`}
                                                value={item.url || ''}
                                                onChange={(e) => handleItemChange(index, 'url', e.target.value)}
                                                placeholder="https://company.com"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor={`work-summary-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Summary (Optional)</label>
                                            <textarea
                                                id={`work-summary-${index}`}
                                                value={item.summary || ''}
                                                onChange={(e) => handleItemChange(index, 'summary', e.target.value)}
                                                placeholder="Brief description of your role and the company"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                                rows={3}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor={`work-highlights-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Responsibilities/Achievements (one per line)</label>
                                            <textarea
                                                id={`work-highlights-${index}`}
                                                value={(item.highlights || []).join('\n')}
                                                onChange={(e) => handleArrayFieldChange(index, 'highlights', e.target.value, '\n')}
                                                placeholder="- Developed feature X using technology Y\n- Led a team of Z developers\n- Increased performance by N%"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                                rows={4}
                                            />
                                        </div>
                                    </div>
                                    <ArrayItemControls index={index} onDelete={deleteItem} />
                                </li>
                            ))}
                        </ul>
                    )}
                    <button
                        type="button"
                        onClick={addItem}
                        className="mt-4 px-3 py-1 bg-blue-500 dark:bg-blue-700 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-800 text-sm"
                    >
                        Add Work Experience
                    </button>
                </>
            )}
        </div>
    );
};

export default WorkExperienceEditor;
