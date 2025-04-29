import React, { useState } from 'react';
import { EditorProps } from './types';
import { JsonResumeInterestItem } from '../../../../server/src/types/jsonresume';
import ArrayItemControls from './ArrayItemControls';

const InterestsEditor: React.FC<EditorProps<JsonResumeInterestItem[] | undefined>> = ({ data = [], onChange }) => {
    const [isExpanded, setIsExpanded] = useState(data.length > 0);

    const handleItemChange = (index: number, field: keyof JsonResumeInterestItem, value: string | string[]) => {
        const newData = [...data];
        if (!newData[index]) {
            newData[index] = { name: '', keywords: [] };
        }

        // Create a temporary item to ensure type safety during assignment
        let updatedItem = { ...newData[index] };

        if (field === 'keywords') {
            // Ensure value is treated as string[] for keywords
            const keywordsValue = typeof value === 'string'
                ? value.split(',').map(k => k.trim()).filter(k => k)
                : Array.isArray(value) ? value : []; // Handle if value is already array or unexpected type
            updatedItem = { ...updatedItem, [field]: keywordsValue };
        } else if (typeof value === 'string') {
            // Ensure value is string for non-keywords fields
            updatedItem = { ...updatedItem, [field]: value };
        }
        // Only assign if the field is valid for the item type
        if (field in updatedItem) {
            newData[index] = updatedItem;
        }

        onChange(newData);
    };

    const handleDelete = (index: number) => {
        const newData = data.filter((_, i) => i !== index);
        onChange(newData);
    };

    const handleAdd = () => {
        const newItem: JsonResumeInterestItem = { name: '', keywords: [] };
        onChange([...data, newItem]);
    };

    return (
        <div className="p-4 border rounded shadow-sm bg-white">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Interests</h3>
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
                        <p className="text-gray-500 italic">No interests added yet.</p>
                    ) : (
                        <ul className="space-y-4">
                            {data.map((item, index) => (
                                <li key={index} className="p-3 border rounded bg-gray-50 space-y-2">
                                    <div className="grid grid-cols-1 gap-2">
                                        <div>
                                            <label htmlFor={`interest-name-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Interest Name</label>
                                            <input
                                                type="text"
                                                id={`interest-name-${index}`}
                                                value={item.name || ''}
                                                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                                placeholder="e.g., Open Source, Hiking"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`interest-keywords-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Keywords (Optional, comma-separated)</label>
                                            <input
                                                type="text"
                                                id={`interest-keywords-${index}`}
                                                value={(item.keywords || []).join(', ')}
                                                onChange={(e) => handleItemChange(index, 'keywords', e.target.value)} // Use handleItemChange directly
                                                placeholder="e.g., Linux, Trail Running"
                                                className="w-full px-2 py-1 border rounded text-sm"
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
                        Add Interest
                    </button>
                </>
            )}
        </div>
    );
};

export default InterestsEditor;