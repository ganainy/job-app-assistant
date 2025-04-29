import React, { useState } from 'react';
import { EditorProps } from './types';
import { JsonResumeLanguageItem } from '../../../../server/src/types/jsonresume';
import ArrayItemControls from './ArrayItemControls'; // Import the controls

const LanguagesEditor: React.FC<EditorProps<JsonResumeLanguageItem[] | undefined>> = ({ data = [], onChange }) => {
    const [isExpanded, setIsExpanded] = useState(data.length > 0);

    const handleItemChange = (index: number, field: keyof JsonResumeLanguageItem, value: string) => {
        const newData = [...data];
        if (!newData[index]) {
            newData[index] = { language: '', fluency: '' }; // Initialize if missing
        }
        newData[index] = { ...newData[index], [field]: value };
        onChange(newData);
    };

    const handleDelete = (index: number) => {
        const newData = data.filter((_, i) => i !== index);
        onChange(newData);
    };

    const handleAdd = () => {
        const newItem: JsonResumeLanguageItem = { language: '', fluency: '' };
        onChange([...data, newItem]);
    };

    return (
        <div className="p-4 border rounded shadow-sm bg-white">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Languages</h3>
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
                        <p className="text-gray-500 italic">No languages added yet.</p>
                    ) : (
                        <ul className="space-y-4">
                            {data.map((item, index) => (
                                <li key={index} className="p-3 border rounded bg-gray-50 space-y-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div>
                                            <label htmlFor={`lang-language-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                                            <input
                                                type="text"
                                                id={`lang-language-${index}`}
                                                value={item.language || ''}
                                                onChange={(e) => handleItemChange(index, 'language', e.target.value)}
                                                placeholder="e.g., English, Spanish"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`lang-fluency-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Fluency</label>
                                            <input
                                                type="text"
                                                id={`lang-fluency-${index}`}
                                                value={item.fluency || ''}
                                                onChange={(e) => handleItemChange(index, 'fluency', e.target.value)}
                                                placeholder="e.g., Native, Fluent, Conversational"
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
                        Add Language
                    </button>
                </>
            )}
        </div>
    );
};

export default LanguagesEditor;