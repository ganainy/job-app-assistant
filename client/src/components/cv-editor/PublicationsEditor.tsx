import React, { useState } from 'react';
import { EditorProps } from './types';
import { JsonResumePublicationItem } from '../../../../server/src/types/jsonresume';
import ArrayItemControls from './ArrayItemControls'; // Import the controls

const PublicationsEditor: React.FC<EditorProps<JsonResumePublicationItem[] | undefined>> = ({ data = [], onChange }) => {
    const [isExpanded, setIsExpanded] = useState(data.length > 0);

    const handleItemChange = (index: number, field: keyof JsonResumePublicationItem, value: string | string[]) => {
        const newData = [...data];
        if (!newData[index]) {
            newData[index] = { name: '', publisher: '', releaseDate: '', url: '', summary: '' }; // Initialize if missing
        }
        newData[index] = { ...newData[index], [field]: value };
        onChange(newData);
    };

    const handleDelete = (index: number) => {
        const newData = data.filter((_, i) => i !== index);
        onChange(newData);
    };

    const handleAdd = () => {
        const newItem: JsonResumePublicationItem = { name: '', publisher: '', releaseDate: '', url: '', summary: '' };
        onChange([...data, newItem]);
    };

    return (
        <div className="p-4 border rounded shadow-sm bg-white">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Publications</h3>
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
                        <p className="text-gray-500 italic">No publications added yet.</p>
                    ) : (
                        <ul className="space-y-4">
                            {data.map((item, index) => (
                                <li key={index} className="p-3 border rounded bg-gray-50 space-y-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div>
                                            <label htmlFor={`pub-name-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            <input
                                                type="text"
                                                id={`pub-name-${index}`}
                                                value={item.name || ''}
                                                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                                placeholder="Publication Name"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`pub-publisher-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Publisher</label>
                                            <input
                                                type="text"
                                                id={`pub-publisher-${index}`}
                                                value={item.publisher || ''}
                                                onChange={(e) => handleItemChange(index, 'publisher', e.target.value)}
                                                placeholder="Publisher Name"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`pub-releaseDate-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Release Date</label>
                                            <input
                                                type="text" // Using text for flexibility (e.g., "YYYY-MM-DD" or "YYYY")
                                                id={`pub-releaseDate-${index}`}
                                                value={item.releaseDate || ''}
                                                onChange={(e) => handleItemChange(index, 'releaseDate', e.target.value)}
                                                placeholder="YYYY-MM-DD or YYYY"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`pub-url-${index}`} className="block text-sm font-medium text-gray-700 mb-1">URL (Optional)</label>
                                            <input
                                                type="url"
                                                id={`pub-url-${index}`}
                                                value={item.url || ''}
                                                onChange={(e) => handleItemChange(index, 'url', e.target.value)}
                                                placeholder="https://example.com/publication"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor={`pub-summary-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Summary (Optional)</label>
                                            <textarea
                                                id={`pub-summary-${index}`}
                                                value={item.summary || ''}
                                                onChange={(e) => handleItemChange(index, 'summary', e.target.value)}
                                                placeholder="Short summary of the publication"
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
                        onClick={handleAdd} // Use the new handler
                        className="mt-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                        Add Publication
                    </button>
                </>
            )}
        </div>
    );
};

export default PublicationsEditor;