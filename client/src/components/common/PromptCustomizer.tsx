import React, { useState, useEffect } from 'react';
import { getCustomPrompts, updateCustomPrompts, CustomPrompts } from '../../services/settingsApi';

interface PromptCustomizerProps {
    type: 'cv' | 'coverLetter';
    defaultPrompt: string;
    onPromptChange?: (prompt: string | null) => void;
}

const PromptCustomizer: React.FC<PromptCustomizerProps> = ({
    type,
    defaultPrompt,
    onPromptChange,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [customPrompt, setCustomPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
    const [useCustom, setUseCustom] = useState(false);

    useEffect(() => {
        const loadPrompt = async () => {
            setIsLoading(true);
            try {
                const prompts = await getCustomPrompts();
                const savedPrompt = type === 'cv' ? prompts.cvPrompt : prompts.coverLetterPrompt;
                if (savedPrompt) {
                    setCustomPrompt(savedPrompt);
                    setUseCustom(true);
                    onPromptChange?.(savedPrompt);
                } else {
                    setCustomPrompt(defaultPrompt);
                    setUseCustom(false);
                    onPromptChange?.(null);
                }
            } catch (error) {
                console.error('Error loading custom prompt:', error);
                setCustomPrompt(defaultPrompt);
            } finally {
                setIsLoading(false);
            }
        };

        loadPrompt();
    }, [type, defaultPrompt, onPromptChange]);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            const updateData: Partial<CustomPrompts> = {};
            if (type === 'cv') {
                updateData.cvPrompt = useCustom ? customPrompt : null;
            } else {
                updateData.coverLetterPrompt = useCustom ? customPrompt : null;
            }
            await updateCustomPrompts(updateData);
            onPromptChange?.(useCustom ? customPrompt : null);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Error saving prompt:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setCustomPrompt(defaultPrompt);
        setUseCustom(false);
    };

    const label = type === 'cv' ? 'CV Generation' : 'Cover Letter Generation';

    return (
        <div className="mb-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
                <svg
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Customize {label} Prompt</span>
                {useCustom && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full">
                        Custom
                    </span>
                )}
            </button>

            {isExpanded && (
                <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <svg className="animate-spin h-5 w-5 text-gray-500" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 mb-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={useCustom}
                                        onChange={(e) => setUseCustom(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Use custom prompt</span>
                                </label>
                            </div>

                            <textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                disabled={!useCustom}
                                placeholder="Enter your custom prompt here..."
                                className="w-full h-48 px-3 py-2 text-sm font-mono text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed resize-y"
                            />

                            <div className="flex items-center justify-between mt-3">
                                <button
                                    onClick={handleReset}
                                    disabled={!useCustom}
                                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Reset to default
                                </button>

                                <div className="flex items-center gap-3">
                                    {saveStatus === 'saved' && (
                                        <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            Saved
                                        </span>
                                    )}
                                    {saveStatus === 'error' && (
                                        <span className="text-sm text-red-600 dark:text-red-400">Failed to save</span>
                                    )}
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                    >
                                        {isSaving ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <span>Save Prompt</span>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                Tip: The prompt will be used when generating the {label.toLowerCase()}.
                                Variables like job description and CV data are automatically included.
                            </p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default PromptCustomizer;
