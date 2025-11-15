import React, { useState } from 'react';
import { EditorProps } from './types';
import { JsonResumeEducationItem } from '../../../../server/src/types/jsonresume';
import ArrayItemControls from './ArrayItemControls';
import { SectionScore } from '../../services/analysisApi'; // Import SectionScore
import SectionAnalysisPanel from './SectionAnalysisPanel'; // Import the panel

// Update props to include analysis and onApplyImprovements
interface EducationEditorProps extends EditorProps<JsonResumeEducationItem[] | undefined> {
    analysis?: SectionScore | null;
    onApplyImprovements?: () => Promise<void>;
}

const EducationEditor: React.FC<EducationEditorProps> = ({ data = [], onChange, analysis }) => {
    const [isExpanded, setIsExpanded] = useState(data.length > 0);
    const [showAnalysis, setShowAnalysis] = useState(false);

    const handleItemChange = (index: number, field: keyof JsonResumeEducationItem, value: string | string[]) => {
        const newData = [...data];
        if (!newData[index]) {
            // Initialize with default structure if item doesn't exist (e.g., after adding)
            newData[index] = { institution: '', area: '', studyType: '', startDate: '', endDate: '', score: '', courses: [] };
        }
        // Ensure the field exists on the type before assigning
        if (field in newData[index]) {
            newData[index] = { ...newData[index], [field]: value };
        }
        onChange(newData);
    };

    const handleCoursesChange = (eduIndex: number, value: string) => {
        const courses = value.split(',').map(c => c.trim()).filter(c => c);
        handleItemChange(eduIndex, 'courses', courses);
    };

    const handleDelete = (index: number) => {
        onChange(data.filter((_, i) => i !== index));
    };

    const handleAdd = () => {
        const newItem: JsonResumeEducationItem = { institution: '', area: '', studyType: '', startDate: '', endDate: '', score: '', courses: [] };
        onChange([...data, newItem]);
    };

    return (
        <div className="p-4 border dark:border-gray-700 rounded shadow-sm bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Education</h3>
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
                        <p className="text-gray-500 dark:text-gray-400 italic">No education history added yet.</p>
                    ) : (
                        <ul className="space-y-4">
                            {data.map((item, index) => (
                                <li key={index} className="p-3 border dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 space-y-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {/* Institution */}
                                        <div>
                                            <label htmlFor={`edu-institution-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Institution</label>
                                            <input
                                                type="text"
                                                id={`edu-institution-${index}`}
                                                value={item.institution || ''}
                                                onChange={(e) => handleItemChange(index, 'institution', e.target.value)}
                                                placeholder="University Name"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                        </div>
                                        {/* Area */}
                                        <div>
                                            <label htmlFor={`edu-area-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Area of Study</label>
                                            <input
                                                type="text"
                                                id={`edu-area-${index}`}
                                                value={item.area || ''}
                                                onChange={(e) => handleItemChange(index, 'area', e.target.value)}
                                                placeholder="e.g., Computer Science"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                        </div>
                                        {/* Study Type */}
                                        <div>
                                            <label htmlFor={`edu-studyType-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Degree / Study Type</label>
                                            <input
                                                type="text"
                                                id={`edu-studyType-${index}`}
                                                value={item.studyType || ''}
                                                onChange={(e) => handleItemChange(index, 'studyType', e.target.value)}
                                                placeholder="e.g., Bachelor's Degree, PhD"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                        </div>
                                        {/* GPA -> Score */}
                                        <div>
                                            <label htmlFor={`edu-score-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Score/GPA (Optional)</label>
                                            <input
                                                type="text"
                                                id={`edu-score-${index}`}
                                                value={item.score || ''} // Use score instead of gpa
                                                onChange={(e) => handleItemChange(index, 'score', e.target.value)} // Use score
                                                placeholder="e.g., 3.8/4.0 or A"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                        </div>
                                        {/* Start Date */}
                                        <div>
                                            <label htmlFor={`edu-startDate-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                            <input
                                                type="text"
                                                id={`edu-startDate-${index}`}
                                                value={item.startDate || ''}
                                                onChange={(e) => handleItemChange(index, 'startDate', e.target.value)}
                                                placeholder="YYYY-MM-DD or YYYY-MM"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                        </div>
                                        {/* End Date */}
                                        <div>
                                            <label htmlFor={`edu-endDate-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date (or Expected)</label>
                                            <input
                                                type="text"
                                                id={`edu-endDate-${index}`}
                                                value={item.endDate || ''}
                                                onChange={(e) => handleItemChange(index, 'endDate', e.target.value)}
                                                placeholder="YYYY-MM-DD or Present"
                                                className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                        </div>
                                        {/* Courses (as textarea) */}
                                        <div className="md:col-span-2">
                                            <label htmlFor={`edu-courses-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Relevant Courses (Optional, comma-separated)</label>
                                            <textarea
                                                id={`edu-courses-${index}`}
                                                value={(item.courses || []).join(', ')}
                                                onChange={(e) => handleCoursesChange(index, e.target.value)} // Use renamed handler
                                                placeholder="e.g., Data Structures, Algorithms, Web Development"
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
                        Add Education
                    </button>
                </>
            )}
        </div>
    );
};

export default EducationEditor;