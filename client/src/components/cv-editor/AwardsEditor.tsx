import React, { useState } from 'react';
import { EditorProps } from './types';
import { JsonResumeAwardItem } from '../../../../server/src/types/jsonresume';
import ArrayItemControls from './ArrayItemControls';

const AwardsEditor: React.FC<EditorProps<JsonResumeAwardItem[] | undefined>> = ({ data = [], onChange }) => {
    const [isExpanded, setIsExpanded] = useState(data.length > 0);

    const handleItemChange = (index: number, field: keyof JsonResumeAwardItem, value: string) => {
        const newData = [...data];
        if (!newData[index]) {
            newData[index] = { title: '', date: '', awarder: '', summary: '' };
        }
        newData[index] = { ...newData[index], [field]: value };
        onChange(newData);
    };

    const handleDelete = (index: number) => {
        const newData = data.filter((_, i) => i !== index);
        onChange(newData);
    };

    const handleAdd = () => {
        const newItem: JsonResumeAwardItem = { title: '', date: '', awarder: '', summary: '' };
        onChange([...data, newItem]);
    };

    return (
        <div className="p-4 border rounded shadow-sm bg-white">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Awards</h3>
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                >
                    {isExpanded ? 'Collapse' : 'Expand'}
                </button>
            </div>
            {isExpanded && (
                <>
                    {data.length === 0 ? (
                        <p className="text-gray-500 italic">No awards added yet.</p>
                    ) : (
                        <ul className="space-y-4">
                            {data.map((item, index) => (
                                <li key={index} className="p-3 border rounded bg-gray-50 space-y-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div>
                                            <label htmlFor={`award-title-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                            <input
                                                type="text"
                                                id={`award-title-${index}`}
                                                value={item.title || ''}
                                                onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                                                placeholder="Award Title"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`award-awarder-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Awarder</label>
                                            <input
                                                type="text"
                                                id={`award-awarder-${index}`}
                                                value={item.awarder || ''}
                                                onChange={(e) => handleItemChange(index, 'awarder', e.target.value)}
                                                placeholder="Awarding Organization"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`award-date-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                            <input
                                                type="text" // Using text for flexibility (e.g., "YYYY-MM-DD" or "YYYY")
                                                id={`award-date-${index}`}
                                                value={item.date || ''}
                                                onChange={(e) => handleItemChange(index, 'date', e.target.value)}
                                                placeholder="YYYY-MM-DD or YYYY"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor={`award-summary-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Summary (Optional)</label>
                                            <textarea
                                                id={`award-summary-${index}`}
                                                value={item.summary || ''}
                                                onChange={(e) => handleItemChange(index, 'summary', e.target.value)}
                                                placeholder="Short summary of the award"
                                                className="w-full px-2 py-1 border rounded text-sm"
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
                        className="mt-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                        Add Award
                    </button>
                </>
            )}
        </div>
    );
};

export default AwardsEditor;