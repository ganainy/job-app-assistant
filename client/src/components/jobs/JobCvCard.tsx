// Component for displaying individual job-specific CV cards with editing and ATS analysis
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { JobApplication, updateJob } from '../../services/jobApi';
import { JsonResumeSchema } from '../../../../server/src/types/jsonresume';
import { getJobCv, updateCv, createJobCv } from '../../services/cvApi';
import CvFormEditor from '../cv-editor/CvFormEditor';
import GeneralCvAtsPanel from '../ats/GeneralCvAtsPanel';
import { scanAts, getAtsScores, AtsScores } from '../../services/atsApi';

interface JobCvCardProps {
    jobApplication: JobApplication;
    onUpdate?: (updatedJob: JobApplication) => void;
}

const JobCvCard: React.FC<JobCvCardProps> = ({ jobApplication, onUpdate }) => {
    const [cvData, setCvData] = useState<JsonResumeSchema>(jobApplication.draftCvJson || { basics: {} });
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [atsScores, setAtsScores] = useState<AtsScores | null>(null);
    const [isScanningAts, setIsScanningAts] = useState<boolean>(false);
    const [atsAnalysisId, setAtsAnalysisId] = useState<string | null>(null);
    const [atsPollingIntervalId, setAtsPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
    const [currentCvId, setCurrentCvId] = useState<string | null>(null);

    // Fetch Job CV
    useEffect(() => {
        const fetchCv = async () => {
            try {
                const res = await getJobCv(jobApplication._id);
                if (res.cv) {
                    setCvData(res.cv.cvJson);
                    setCurrentCvId(res.cv._id);
                    originalCvDataRef.current = JSON.parse(JSON.stringify(res.cv.cvJson));
                }
            } catch (err) {
                // Ignore errors, default state uses legacy draftCvJson
            }
        };
        fetchCv();
    }, [jobApplication._id]);

    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const originalCvDataRef = useRef<JsonResumeSchema>(jobApplication.draftCvJson || { basics: {} });

    const AUTO_SAVE_DELAY_MS = 2000;
    const ATS_POLLING_INTERVAL_MS = 3000;
    const ATS_POLLING_TIMEOUT_MS = 120000;

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (atsPollingIntervalId) {
                clearInterval(atsPollingIntervalId);
            }
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [atsPollingIntervalId]);

    // Poll ATS scores
    const pollAtsScores = useCallback(async (analysisIdToPoll: string, startTime: number): Promise<boolean> => {
        const elapsed = Date.now() - startTime;
        if (elapsed > ATS_POLLING_TIMEOUT_MS) {
            setIsScanningAts(false);
            return true;
        }

        try {
            const response = await getAtsScores(analysisIdToPoll);
            if (response.atsScores && (response.atsScores.score !== null && response.atsScores.score !== undefined)) {
                setAtsScores(response.atsScores);
                setIsScanningAts(false);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error polling ATS scores:', error);
            return false;
        }
    }, []);

    // Trigger ATS analysis
    const handleScanAts = async () => {
        if (atsPollingIntervalId) {
            clearInterval(atsPollingIntervalId);
            setAtsPollingIntervalId(null);
        }

        setIsScanningAts(true);
        setAtsScores(null);

        try {
            const response = await scanAts(jobApplication._id, atsAnalysisId || undefined);
            setAtsAnalysisId(response.analysisId);

            const startTime = Date.now();
            const intervalId = setInterval(async () => {
                const result = await pollAtsScores(response.analysisId, startTime);
                if (result) {
                    clearInterval(intervalId);
                    setAtsPollingIntervalId(null);
                }
            }, ATS_POLLING_INTERVAL_MS);

            setAtsPollingIntervalId(intervalId);

            const checkResult = await pollAtsScores(response.analysisId, startTime);
            if (checkResult) {
                clearInterval(intervalId);
                setAtsPollingIntervalId(null);
            }
        } catch (error: any) {
            console.error('Error starting ATS scan:', error);
            setIsScanningAts(false);
        }
    };

    // Handle CV changes with auto-save
    const handleCvChange = (updatedCv: JsonResumeSchema) => {
        setCvData(updatedCv);
        setSaveStatus('idle');

        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        // Set new timeout for auto-save
        autoSaveTimeoutRef.current = setTimeout(() => {
            handleSaveCv(updatedCv, true);
        }, AUTO_SAVE_DELAY_MS);
    };

    // Save CV changes
    const handleSaveCv = useCallback(async (cvDataToSave?: JsonResumeSchema, isAutoSave: boolean = false) => {
        const dataToSave = cvDataToSave || cvData;

        if (!isAutoSave) {
            setIsSaving(true);
        }
        setSaveStatus('saving');

        try {
            // Save to Unified CV Model
            if (currentCvId) {
                await updateCv(currentCvId, { cvJson: dataToSave });
            } else {
                const newCv = await createJobCv(jobApplication._id, { cvJson: dataToSave });
                setCurrentCvId(newCv.cv._id);
            }

            originalCvDataRef.current = JSON.parse(JSON.stringify(dataToSave));
            setSaveStatus('saved');

            if (onUpdate) {
                onUpdate(jobApplication);
            }

            setTimeout(() => {
                setSaveStatus('idle');
            }, 3000);
        } catch (error: any) {
            console.error("Error saving CV:", error);
            setSaveStatus('error');

            setTimeout(() => {
                setSaveStatus('idle');
            }, 5000);
        } finally {
            if (!isAutoSave) {
                setIsSaving(false);
            }
        }
    }, [cvData, jobApplication._id, onUpdate, currentCvId]);

    // Format date helper
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;

            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return 'N/A';
        }
    };

    return (
        <div className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 shadow-lg overflow-hidden transition-all duration-300">
            {/* Card Header - Always Visible */}
            <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {jobApplication.jobTitle}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${jobApplication.status === 'Applied' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                jobApplication.status === 'Interview' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}>
                                {jobApplication.status}
                            </span>
                        </div>
                        <p className="text-base text-gray-700 dark:text-gray-300 mb-2">
                            {jobApplication.companyName}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span>Updated: {formatDate(jobApplication.updatedAt)}</span>
                            {jobApplication.dateApplied && (
                                <span>Applied: {formatDate(jobApplication.dateApplied)}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Save Status Indicator */}
                        {saveStatus !== 'idle' && (
                            <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${saveStatus === 'saving' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                saveStatus === 'saved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                }`}>
                                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Error'}
                            </div>
                        )}

                        {/* Expand/Collapse Button */}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium text-sm flex items-center gap-2"
                        >
                            {isExpanded ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                    Collapse
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    Expand & Edit
                                </>
                            )}
                        </button>

                        {/* Link to Full Review Page */}
                        <Link
                            to={`/review/${jobApplication._id}`}
                            className="px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-800 transition-colors font-medium text-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Full Details
                        </Link>
                    </div>
                </div>
            </div>

            {/* Expandable Content */}
            {isExpanded && (
                <div className="p-6 space-y-6">
                    {/* ATS Analysis Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">ATS Analysis</h4>
                            {!isScanningAts && (
                                <button
                                    onClick={handleScanAts}
                                    disabled={isScanningAts}
                                    className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    {atsScores ? 'Rescan' : 'Scan ATS'}
                                </button>
                            )}
                        </div>
                        <GeneralCvAtsPanel atsScores={atsScores} isLoading={isScanningAts} />
                    </div>

                    {/* CV Editor Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit CV</h4>
                            <button
                                onClick={() => handleSaveCv(undefined, false)}
                                disabled={isSaving}
                                className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                        </svg>
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/50">
                            <CvFormEditor data={cvData} onChange={handleCvChange} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobCvCard;
