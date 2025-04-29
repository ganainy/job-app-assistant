import React, { useState } from 'react';
import { EditorProps } from './types';
import { JsonResumeReferenceItem } from '../../../../server/src/types/jsonresume';
import ArrayItemControls from './ArrayItemControls'; // Import the controls

const ReferencesEditor: React.FC<EditorProps<JsonResumeReferenceItem[] | undefined>> = ({ data = [], onChange }) => {
    const [isExpanded, setIsExpanded] = useState(data.length > 0);

    const handleItemChange = (index: number, field: keyof JsonResumeReferenceItem, value: string) => {
        const newData = [...data];
        if (!newData[index]) {
            newData[index] = { name: '', reference: '' }; // Initialize if missing
        }
        newData[index] = { ...newData[index], [field]: value };
        onChange(newData);
    };

    const handleDelete = (index: number) => {
        const newData = data.filter((_, i) => i !== index);
        onChange(newData);
    };

    const handleAdd = () => {
        const newItem: JsonResumeReferenceItem = { name: '', reference: '' };
        onChange([...data, newItem]);
    };

    return (
        <div className="p-4 border rounded shadow-sm bg-white">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">References</h3>
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
                        <p className="text-gray-500 italic">No references added yet. (Often provided upon request)</p>
                    ) : (
                        <ul className="space-y-4">
                            {data.map((item, index) => (
                                <li key={index} className="p-3 border rounded bg-gray-50 space-y-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div>
                                            <label htmlFor={`ref-name-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            <input
                                                type="text"
                                                id={`ref-name-${index}`}
                                                value={item.name || ''}
                                                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                                placeholder="Reference's Full Name"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor={`ref-reference-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Reference Details</label>
                                            <textarea
                                                id={`ref-reference-${index}`}
                                                value={item.reference || ''}
                                                onChange={(e) => handleItemChange(index, 'reference', e.target.value)}
                                                placeholder="e.g., John Doe - Project Manager at XYZ Corp. (john.doe@xyz.com)"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                                rows={3}
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
                        Add Reference
                    </button>
                </>
            )}
        </div>
    );
};

export default ReferencesEditor;