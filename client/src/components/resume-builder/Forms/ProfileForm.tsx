import React from 'react';
import { JsonResumeSchema, JsonResumeBasics } from '../../../../../server/src/types/jsonresume';
import { BaseForm } from '../Form';
import { Input, Textarea } from '../Form/InputGroup';

interface ProfileFormProps {
    data: JsonResumeSchema;
    onChange: (data: JsonResumeSchema) => void;
    onImprove?: (customInstructions?: string) => void;
    isImproving?: boolean;
}

/**
 * ProfileForm handles the basic/header information for the resume
 */
export const ProfileForm: React.FC<ProfileFormProps> = ({
    data,
    onChange,
    onImprove,
    isImproving = false,
}) => {
    const basics = data.basics || {};
    const location = basics.location || {};

    const handleBasicsChange = (field: keyof JsonResumeBasics, value: string) => {
        onChange({
            ...data,
            basics: {
                ...basics,
                [field]: value,
            },
        });
    };

    const handleLocationChange = (field: string, value: string) => {
        onChange({
            ...data,
            basics: {
                ...basics,
                location: {
                    ...location,
                    [field]: value,
                },
            },
        });
    };

    return (
        <BaseForm>
            <div className="grid grid-cols-6 gap-4">
                {/* Name - Full Width */}
                <Input
                    label="Full Name"
                    labelClassName="col-span-6"
                    name="name"
                    placeholder="John Doe"
                    value={basics.name || ''}
                    onChange={(v) => handleBasicsChange('name', v)}
                />

                {/* Job Title/Label - Full Width */}
                <Input
                    label="Job Title"
                    labelClassName="col-span-6"
                    name="label"
                    placeholder="Software Engineer"
                    value={basics.label || ''}
                    onChange={(v) => handleBasicsChange('label', v)}
                />

                {/* Summary/Objective - Full Width */}
                <div className="col-span-6">
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Professional Summary
                        </label>
                        {onImprove && (
                            <button
                                type="button"
                                onClick={() => onImprove()}
                                disabled={isImproving}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isImproving ? (
                                    <>
                                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Improving...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        AI Improve
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                    <textarea
                        name="summary"
                        placeholder="A brief professional summary highlighting your key skills and experience..."
                        value={basics.summary || ''}
                        onChange={(e) => handleBasicsChange('summary', e.target.value)}
                        rows={4}
                        className="mt-1 px-3 py-2 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    />
                </div>

                {/* Email and Phone */}
                <Input
                    label="Email"
                    labelClassName="col-span-4"
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    value={basics.email || ''}
                    onChange={(v) => handleBasicsChange('email', v)}
                />
                <Input
                    label="Phone"
                    labelClassName="col-span-2"
                    name="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={basics.phone || ''}
                    onChange={(v) => handleBasicsChange('phone', v)}
                />

                {/* Website */}
                <Input
                    label="Website / Portfolio"
                    labelClassName="col-span-6"
                    name="url"
                    type="url"
                    placeholder="https://yourportfolio.com or linkedin.com/in/you"
                    value={basics.url || ''}
                    onChange={(v) => handleBasicsChange('url', v)}
                />

                {/* Location */}
                <Input
                    label="City"
                    labelClassName="col-span-2"
                    name="city"
                    placeholder="New York"
                    value={location.city || ''}
                    onChange={(v) => handleLocationChange('city', v)}
                />
                <Input
                    label="Region/State"
                    labelClassName="col-span-2"
                    name="region"
                    placeholder="NY"
                    value={location.region || ''}
                    onChange={(v) => handleLocationChange('region', v)}
                />
                <Input
                    label="Country"
                    labelClassName="col-span-2"
                    name="countryCode"
                    placeholder="US"
                    value={location.countryCode || ''}
                    onChange={(v) => handleLocationChange('countryCode', v)}
                />
            </div>
        </BaseForm>
    );
};

export default ProfileForm;
