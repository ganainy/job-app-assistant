import React, { useState } from 'react';
import { EditorProps } from './types';
import { JsonResumeVolunteerItem } from '../../../../server/src/types/jsonresume';
import ArrayItemControls from './ArrayItemControls'; // Import the controls

const VolunteerEditor: React.FC<EditorProps<JsonResumeVolunteerItem[] | undefined>> = ({ data = [], onChange }) => {
    const [isExpanded, setIsExpanded] = useState(data.length > 0);

    const handleItemChange = (index: number, field: keyof JsonResumeVolunteerItem, value: string | string[]) => {
        const newData = [...data];
        if (!newData[index]) {
            // Initialize with all potential fields
            newData[index] = { organization: '', position: '', startDate: '', endDate: '', summary: '', url: '', highlights: [] };
        }
        newData[index] = { ...newData[index], [field]: value };
        onChange(newData);
    };

    const handleDelete = (index: number) => {
        const newData = data.filter((_, i) => i !== index);
        onChange(newData);
    };

    const handleAdd = () => {
        const newItem: JsonResumeVolunteerItem = { organization: '', position: '', startDate: '', endDate: '', summary: '', url: '', highlights: [] };
        onChange([...data, newItem]);
    };

    // Renamed from handleHighlightsChange and adjusted for newline separator
    const handleArrayFieldChange = (index: number, field: 'highlights', value: string, separator: string = '\n') => {
        const arrayValue = value.split(separator).map(k => k.trim()).filter(k => k);
        handleItemChange(index, field, arrayValue);
    };

    return (
        <div className="p-4 border rounded shadow-sm bg-white">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Volunteer Experience</h3>
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
                        <p className="text-gray-500 italic">No volunteer experience added yet.</p>
                    ) : (
                        <ul className="space-y-4">
                            {data.map((item, index) => (
                                <li key={index} className="p-3 border rounded bg-gray-50 space-y-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {/* Organization */}
                                        <div>
                                            <label htmlFor={`vol-organization-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                                            <input
                                                type="text"
                                                id={`vol-organization-${index}`}
                                                value={item.organization || ''}
                                                onChange={(e) => handleItemChange(index, 'organization', e.target.value)}
                                                placeholder="Organization Name"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        {/* Position */}
                                        <div>
                                            <label htmlFor={`vol-position-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Position/Role</label>
                                            <input
                                                type="text"
                                                id={`vol-position-${index}`}
                                                value={item.position || ''}
                                                onChange={(e) => handleItemChange(index, 'position', e.target.value)}
                                                placeholder="Your Role"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        {/* Start Date */}
                                        <div>
                                            <label htmlFor={`vol-startDate-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                            <input
                                                type="text"
                                                id={`vol-startDate-${index}`}
                                                value={item.startDate || ''}
                                                onChange={(e) => handleItemChange(index, 'startDate', e.target.value)}
                                                placeholder="YYYY-MM-DD or YYYY-MM"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        {/* End Date */}
                                        <div>
                                            <label htmlFor={`vol-endDate-${index}`} className="block text-sm font-medium text-gray-700 mb-1">End Date (or Ongoing)</label>
                                            <input
                                                type="text"
                                                id={`vol-endDate-${index}`}
                                                value={item.endDate || ''}
                                                onChange={(e) => handleItemChange(index, 'endDate', e.target.value)}
                                                placeholder="YYYY-MM-DD or Present"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        {/* URL */}
                                        <div>
                                            <label htmlFor={`vol-url-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Organization URL (Optional)</label>
                                            <input
                                                type="url"
                                                id={`vol-url-${index}`}
                                                value={item.url || ''}
                                                onChange={(e) => handleItemChange(index, 'url', e.target.value)}
                                                placeholder="https://organization.org"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        </div>
                                        {/* Summary */}
                                        <div className="md:col-span-2">
                                            <label htmlFor={`vol-summary-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Summary (Optional)</label>
                                            <textarea
                                                id={`vol-summary-${index}`}
                                                value={item.summary || ''}
                                                onChange={(e) => handleItemChange(index, 'summary', e.target.value)}
                                                placeholder="Brief description of your responsibilities and achievements"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                                rows={3}
                                            />
                                        </div>
                                        {/* Highlights (as textarea) */}
                                        <div className="md:col-span-2">
                                            <label htmlFor={`vol-highlights-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Highlights (Optional, one per line)</label>
                                            <textarea
                                                id={`vol-highlights-${index}`}
                                                value={(item.highlights || []).join('\n')}
                                                onChange={(e) => handleArrayFieldChange(index, 'highlights', e.target.value, '\n')} // Use renamed handler
                                                placeholder="- Organized event X\n- Raised Y funds"
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
                        Add Volunteer Experience
                    </button>
                </>
            )}
        </div>
    );
};

export default VolunteerEditor;