import React, { useState } from 'react';
import { EditorProps } from './types';
import ArrayItemControls from './ArrayItemControls';
import { JsonResumeWorkItem } from '../../../../server/src/types/jsonresume';

type WorkItem = JsonResumeWorkItem;

const WorkExperienceEditor: React.FC<EditorProps<WorkItem[] | undefined>> = ({ data = [], onChange }) => {
    const [isExpanded, setIsExpanded] = useState(data.length > 0);

    const handleItemChange = (index: number, field: keyof WorkItem, value: string | string[]) => {
        const newItems = [...data];
        newItems[index] = { ...newItems[index], [field]: value };
        onChange(newItems);
    };

    const addItem = () => {
        const newItem: WorkItem = { // Provide default structure for a new item
            name: '',
            position: '',
            startDate: '',
            summary: '',
            highlights: ['']
        };
        onChange([...data, newItem]);
    };

    const deleteItem = (index: number) => {
        const newItems = data.filter((_: WorkItem, i: number) => i !== index); // Added types for _ and i
        onChange(newItems);
    };

    // New function to handle array fields
    const handleArrayFieldChange = (index: number, field: keyof WorkItem, value: string, delimiter: string) => {
        const arrayValue = value.split(delimiter).map(s => s.trim()).filter(s => s); // Split, trim, and remove empty strings
        handleItemChange(index, field, arrayValue);
    };

    return (
        <div className="p-4 border rounded shadow-sm bg-white">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Work Experience</h3>
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
                        <p className="text-gray-500 italic">No work experience added yet.</p>
                    ) : (
                        <ul className="space-y-4">
                            {data.map((item, index) => (
                                <li key={index} className="p-3 border rounded bg-gray-50 space-y-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {/* Company/Name */}
                                        <div>
                                            <label htmlFor={`work-name-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                            <input
                                                type="text"
                                                id={`work-name-${index}`}
                                                value={item.name || ''} // Use 'name' for company name as per schema
                                                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                                placeholder="Company Name"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        {/* Position */}
                                        <div>
                                            <label htmlFor={`work-position-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Position/Job Title</label>
                                            <input
                                                type="text"
                                                id={`work-position-${index}`}
                                                value={item.position || ''}
                                                onChange={(e) => handleItemChange(index, 'position', e.target.value)}
                                                placeholder="Your Job Title"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        {/* Start Date */}
                                        <div>
                                            <label htmlFor={`work-startDate-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                            <input
                                                type="text"
                                                id={`work-startDate-${index}`}
                                                value={item.startDate || ''}
                                                onChange={(e) => handleItemChange(index, 'startDate', e.target.value)}
                                                placeholder="YYYY-MM-DD or YYYY-MM"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        {/* End Date */}
                                        <div>
                                            <label htmlFor={`work-endDate-${index}`} className="block text-sm font-medium text-gray-700 mb-1">End Date (or Present)</label>
                                            <input
                                                type="text"
                                                id={`work-endDate-${index}`}
                                                value={item.endDate || ''}
                                                onChange={(e) => handleItemChange(index, 'endDate', e.target.value)}
                                                placeholder="YYYY-MM-DD or Present"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        {/* Location */}
                                        <div>
                                            <label htmlFor={`work-location-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Location (Optional)</label>
                                            <input
                                                type="text"
                                                id={`work-location-${index}`}
                                                value={item.location || ''}
                                                onChange={(e) => handleItemChange(index, 'location', e.target.value)}
                                                placeholder="e.g., City, State/Country"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        {/* URL */}
                                        <div>
                                            <label htmlFor={`work-url-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Company URL (Optional)</label>
                                            <input
                                                type="url"
                                                id={`work-url-${index}`}
                                                value={item.url || ''}
                                                onChange={(e) => handleItemChange(index, 'url', e.target.value)}
                                                placeholder="https://company.com"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        {/* Summary */}
                                        <div className="md:col-span-2">
                                            <label htmlFor={`work-summary-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Summary (Optional)</label>
                                            <textarea
                                                id={`work-summary-${index}`}
                                                value={item.summary || ''}
                                                onChange={(e) => handleItemChange(index, 'summary', e.target.value)}
                                                placeholder="Brief description of your role and the company"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                                rows={3}
                                            />
                                        </div>
                                        {/* Highlights (as textarea) */}
                                        <div className="md:col-span-2">
                                            <label htmlFor={`work-highlights-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Key Responsibilities/Achievements (one per line)</label>
                                            <textarea
                                                id={`work-highlights-${index}`}
                                                value={(item.highlights || []).join('\n')}
                                                onChange={(e) => handleArrayFieldChange(index, 'highlights', e.target.value, '\n')}
                                                placeholder="- Developed feature X using technology Y\n- Led a team of Z developers\n- Increased performance by N%"
                                                className="w-full px-2 py-1 border rounded text-sm"
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
                        className="mt-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                        Add Work Experience
                    </button>
                </>
            )}
        </div>
    );
};

export default WorkExperienceEditor;
