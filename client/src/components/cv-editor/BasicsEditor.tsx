import React, { useState } from 'react';
import { EditorProps } from './types';
import { JsonResumeBasics, JsonResumeProfile } from '../../../../server/src/types/jsonresume'; // Fix: Use JsonResumeProfile
import ArrayItemControls from './ArrayItemControls'; // Import ArrayItemControls

const BasicsEditor: React.FC<EditorProps<JsonResumeBasics | undefined>> = ({ data = {}, onChange }) => {
    const [isExpanded, setIsExpanded] = useState(!!data?.name); // Expand if name exists

    const handleChange = (field: keyof JsonResumeBasics, value: string) => {
        onChange({ ...data, [field]: value });
    };

    const handleLocationChange = (field: keyof NonNullable<JsonResumeBasics['location']>, value: string) => {
        onChange({
            ...data,
            location: {
                ...(data?.location || {}),
                [field]: value,
            },
        });
    };

    // Handlers for profiles array
    const handleProfileChange = (index: number, field: keyof JsonResumeProfile, value: string) => { // Fix: Use JsonResumeProfile
        const profiles = [...(data?.profiles || [])];
        if (!profiles[index]) {
            profiles[index] = { network: '', username: '', url: '' };
        }
        profiles[index] = { ...profiles[index], [field]: value };
        onChange({ ...data, profiles });
    };

    const handleAddProfile = () => {
        const profiles = [...(data?.profiles || []), { network: '', username: '', url: '' }];
        onChange({ ...data, profiles });
    };

    const handleDeleteProfile = (index: number) => {
        const profiles = (data?.profiles || []).filter((_, i) => i !== index);
        onChange({ ...data, profiles });
    };

    return (
        <div className="p-4 border rounded shadow-sm bg-white">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                >
                    {isExpanded ? 'Collapse' : 'Expand'}
                </button>
            </div>
            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                        <label htmlFor="basics-name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            id="basics-name"
                            value={data.name || ''}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder="Your Full Name"
                            className="w-full px-2 py-1 border rounded text-sm"
                        />
                    </div>

                    {/* Label/Title */}
                    <div>
                        <label htmlFor="basics-label" className="block text-sm font-medium text-gray-700 mb-1">Label / Job Title</label>
                        <input
                            type="text"
                            id="basics-label"
                            value={data.label || ''}
                            onChange={(e) => handleChange('label', e.target.value)}
                            placeholder="e.g., Software Engineer"
                            className="w-full px-2 py-1 border rounded text-sm"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="basics-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            id="basics-email"
                            value={data.email || ''}
                            onChange={(e) => handleChange('email', e.target.value)}
                            placeholder="your.email@example.com"
                            className="w-full px-2 py-1 border rounded text-sm"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label htmlFor="basics-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                            type="tel"
                            id="basics-phone"
                            value={data.phone || ''}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            placeholder="+1 123-456-7890"
                            className="w-full px-2 py-1 border rounded text-sm"
                        />
                    </div>

                    {/* Website URL */}
                    <div>
                        <label htmlFor="basics-url" className="block text-sm font-medium text-gray-700 mb-1">Website/Portfolio URL</label>
                        <input
                            type="url"
                            id="basics-url"
                            value={data.url || ''}
                            onChange={(e) => handleChange('url', e.target.value)}
                            placeholder="https://your-portfolio.com"
                            className="w-full px-2 py-1 border rounded text-sm"
                        />
                    </div>

                    {/* Location: Address */}
                    <div>
                        <label htmlFor="basics-location-address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <input
                            type="text"
                            id="basics-location-address"
                            value={data.location?.address || ''}
                            onChange={(e) => handleLocationChange('address', e.target.value)}
                            placeholder="123 Main St"
                            className="w-full px-2 py-1 border rounded text-sm"
                        />
                    </div>

                    {/* Location: Postal Code */}
                    <div>
                        <label htmlFor="basics-location-postalCode" className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                        <input
                            type="text"
                            id="basics-location-postalCode"
                            value={data.location?.postalCode || ''}
                            onChange={(e) => handleLocationChange('postalCode', e.target.value)}
                            placeholder="90210"
                            className="w-full px-2 py-1 border rounded text-sm"
                        />
                    </div>

                    {/* Location: City */}
                    <div>
                        <label htmlFor="basics-location-city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <input
                            type="text"
                            id="basics-location-city"
                            value={data.location?.city || ''}
                            onChange={(e) => handleLocationChange('city', e.target.value)}
                            placeholder="Beverly Hills"
                            className="w-full px-2 py-1 border rounded text-sm"
                        />
                    </div>

                    {/* Location: Country Code */}
                    <div>
                        <label htmlFor="basics-location-countryCode" className="block text-sm font-medium text-gray-700 mb-1">Country Code</label>
                        <input
                            type="text"
                            id="basics-location-countryCode"
                            value={data.location?.countryCode || ''}
                            onChange={(e) => handleLocationChange('countryCode', e.target.value)}
                            placeholder="US"
                            className="w-full px-2 py-1 border rounded text-sm"
                        />
                    </div>

                    {/* Location: Region/State */}
                    <div>
                        <label htmlFor="basics-location-region" className="block text-sm font-medium text-gray-700 mb-1">Region/State</label>
                        <input
                            type="text"
                            id="basics-location-region"
                            value={data.location?.region || ''}
                            onChange={(e) => handleLocationChange('region', e.target.value)}
                            placeholder="California"
                            className="w-full px-2 py-1 border rounded text-sm"
                        />
                    </div>

                    {/* Summary */}
                    <div className="md:col-span-2">
                        <label htmlFor="basics-summary" className="block text-sm font-medium text-gray-700 mb-1">Summary / Professional Profile</label>
                        <textarea
                            id="basics-summary"
                            value={data.summary || ''}
                            onChange={(e) => handleChange('summary', e.target.value)}
                            placeholder="A brief summary about yourself..."
                            className="w-full px-2 py-1 border rounded text-sm"
                            rows={4}
                        />
                    </div>

                    {/* Profiles - Rendered separately below */}
                    <div className="md:col-span-2">
                        <h4 className="text-md font-semibold mb-2 mt-3">Profiles (e.g., LinkedIn, GitHub)</h4>
                        {data.profiles && data.profiles.length > 0 ? (
                            <ul className="space-y-3">
                                {data.profiles.map((profile: JsonResumeProfile, index: number) => ( // Fix: Use JsonResumeProfile
                                    <li key={index} className="p-3 border rounded bg-gray-50 space-y-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <div>
                                                <label htmlFor={`profile-network-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Network</label>
                                                <input
                                                    type="text"
                                                    id={`profile-network-${index}`}
                                                    value={profile.network || ''}
                                                    onChange={(e) => handleProfileChange(index, 'network', e.target.value)} // Use handler
                                                    placeholder="e.g., LinkedIn, GitHub"
                                                    className="w-full px-2 py-1 border rounded text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor={`profile-username-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                                <input
                                                    type="text"
                                                    id={`profile-username-${index}`}
                                                    value={profile.username || ''}
                                                    onChange={(e) => handleProfileChange(index, 'username', e.target.value)} // Use handler
                                                    placeholder="Your username"
                                                    className="w-full px-2 py-1 border rounded text-sm"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label htmlFor={`profile-url-${index}`} className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                                                <input
                                                    type="url"
                                                    id={`profile-url-${index}`}
                                                    value={profile.url || ''}
                                                    onChange={(e) => handleProfileChange(index, 'url', e.target.value)} // Use handler
                                                    placeholder="https://linkedin.com/in/yourprofile"
                                                    className="w-full px-2 py-1 border rounded text-sm"
                                                />
                                            </div>
                                        </div>
                                        <ArrayItemControls index={index} onDelete={() => handleDeleteProfile(index)} /> {/* Use handler */}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 italic text-sm">No profiles added yet.</p>
                        )}
                        <button
                            type="button"
                            onClick={handleAddProfile} // Use handler
                            className="mt-3 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                        >
                            Add Profile
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BasicsEditor;
