// client/src/pages/AnalysisPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { uploadCvForAnalysis, getAnalysis, analyzeCv, AnalysisResult } from '../services/analysisApi';
import { scanAtsForAnalysis, getAtsScores, AtsScores } from '../services/atsApi';
import { getCurrentCv, deleteCurrentCv } from '../services/cvApi';
import { JsonResumeSchema } from '../../../server/src/types/jsonresume';
import FileUploadZone from '../components/analysis/FileUploadZone';
import AnalysisProgress from '../components/analysis/AnalysisProgress';
import ScoreCard from '../components/analysis/ScoreCard';
import ResultsAccordion from '../components/analysis/ResultsAccordion';
import { AtsFeedbackPanel } from '../components/ats';
import Spinner from '../components/common/Spinner';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import Toast from '../components/common/Toast';

type AnalysisStatus = 'idle' | 'uploading' | 'polling' | 'completed' | 'error';

interface ImprovementState {
    isGenerating: boolean;
    content?: string;
    error?: string;
}

const AnalysisPage: React.FC = () => {
    const { id: analysisIdParam } = useParams<{ id?: string }>();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [analysisId, setAnalysisId] = useState<string | null>(analysisIdParam || null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [status, setStatus] = useState<AnalysisStatus>(analysisIdParam ? 'polling' : 'idle');
    const [error, setError] = useState<string | null>(null);
    const pollingIntervalId = useRef<NodeJS.Timeout | null>(null);
    const [improvements, setImprovements] = useState<Record<string, ImprovementState>>({});
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
    const [atsScores, setAtsScores] = useState<AtsScores | null>(null);
    const [isLoadingAts, setIsLoadingAts] = useState<boolean>(false);
    const [isScanningAts, setIsScanningAts] = useState<boolean>(false);
    const [atsPollingIntervalId, setAtsPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
    const [atsProgressMessage, setAtsProgressMessage] = useState<string>('');
    const [currentCvData, setCurrentCvData] = useState<JsonResumeSchema | null>(null);
    const [isLoadingCv, setIsLoadingCv] = useState<boolean>(true);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    const POLLING_INTERVAL_MS = 5000;
    const ATS_POLLING_INTERVAL_MS = 3000; // Poll more frequently for ATS
    const ATS_POLLING_TIMEOUT_MS = 120000; // 2 minutes timeout

    // Fetch current CV on mount
    useEffect(() => {
        const fetchCv = async () => {
            setIsLoadingCv(true);
            try {
                const response = await getCurrentCv();
                const cvData = response.cvData || null;
                setCurrentCvData(cvData);
            } catch (error: any) {
                console.error("Error fetching current CV:", error);
                // Don't show error toast on mount - CV might not exist yet
            } finally {
                setIsLoadingCv(false);
            }
        };
        fetchCv();
    }, []);

    const handleFileSelect = (file: File) => {
        setSelectedFile(file);
        setAnalysisId(null);
        setAnalysisResult(null);
        setStatus('idle');
        setError(null);
        if (pollingIntervalId.current) {
            clearInterval(pollingIntervalId.current);
            pollingIntervalId.current = null;
        }
    };

    const handleFileRemove = () => {
        setSelectedFile(null);
        setAnalysisId(null);
        setAnalysisResult(null);
        setStatus('idle');
        setError(null);
        const fileInput = document.getElementById('cvFileInput') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        if (pollingIntervalId.current) {
            clearInterval(pollingIntervalId.current);
            pollingIntervalId.current = null;
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files[0]) {
            const file = files[0];
            const validExtensions = ['.pdf', '.docx'];
            const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

            if (!validExtensions.includes(fileExtension)) {
                setToast({ message: 'Please drop a valid PDF or DOCX file.', type: 'error' });
                return;
            }

            handleFileSelect(file);
        }
    };

    const handleAnalyze = async () => {
        // If we have stored CV data, use it directly
        if (currentCvData) {
            setStatus('uploading');
            setError(null);
            setAnalysisResult(null);

            try {
                const result = await analyzeCv(currentCvData);
                setAnalysisId(result.id);
                setStatus('polling');
                setToast({ message: 'Analysis started. Processing in progress...', type: 'info' });
            } catch (err: any) {
                console.error('Analysis failed:', err);
                setToast({ message: err.message || 'Failed to start analysis.', type: 'error' });
                setStatus('error');
                setAnalysisId(null);
            }
            return;
        }

        // Otherwise, use file upload
        if (!selectedFile) {
            setToast({ message: 'Please select a CV file first.', type: 'error' });
            return;
        }

        setStatus('uploading');
        setError(null);
        setAnalysisResult(null);

        try {
            const response = await uploadCvForAnalysis(selectedFile);
            setAnalysisId(response.analysisId);
            setStatus('polling');
            setToast({ message: 'CV uploaded successfully. Analysis in progress...', type: 'info' });
        } catch (err: any) {
            console.error('Upload failed:', err);
            setToast({ message: err.message || 'Failed to start analysis.', type: 'error' });
            setStatus('error');
            setAnalysisId(null);
        }
    };

    const handleDeleteCv = async () => {
        if (!currentCvData) {
            return;
        }

        // Confirm deletion
        if (!window.confirm('Are you sure you want to delete your CV? This action cannot be undone.')) {
            return;
        }

        setIsDeleting(true);
        try {
            await deleteCurrentCv();
            setCurrentCvData(null);
            setSelectedFile(null);
            const fileInput = document.getElementById('cvFileInput') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            setToast({ message: 'CV deleted successfully.', type: 'success' });
        } catch (error: any) {
            console.error("Error deleting CV:", error);
            setToast({ message: error.message || 'Failed to delete CV.', type: 'error' });
        } finally {
            setIsDeleting(false);
        }
    };

    const pollAnalysisStatus = useCallback(async () => {
        if (!analysisId) return;

        try {
            const result = await getAnalysis(analysisId);
            setAnalysisResult(result);

            // If ATS scores are included in the result, use them
            console.log(`[DEBUG Frontend] pollAnalysisStatus - Has atsScores in result:`, !!result.atsScores);
            if (result.atsScores) {
                console.log(`[DEBUG Frontend] Setting ATS scores from analysis result:`, result.atsScores);
                setAtsScores(result.atsScores);
            } else {
                console.log(`[DEBUG Frontend] No ATS scores in analysis result, will fetch separately if completed`);
            }

            if (result.status === 'completed') {
                setStatus('completed');
                setToast({ message: 'Analysis completed successfully!', type: 'success' });
                if (pollingIntervalId.current) {
                    clearInterval(pollingIntervalId.current);
                    pollingIntervalId.current = null;
                }
            } else if (result.status === 'failed') {
                setToast({ message: `Analysis failed: ${result.errorInfo || 'Unknown error'}`, type: 'error' });
                setStatus('error');
                if (pollingIntervalId.current) {
                    clearInterval(pollingIntervalId.current);
                    pollingIntervalId.current = null;
                }
            }
        } catch (err: any) {
            console.error('Polling error:', err);
            setToast({ message: 'Error fetching analysis results.', type: 'error' });
        }
    }, [analysisId]);

    useEffect(() => {
        if (status === 'polling' && analysisId) {
            if (pollingIntervalId.current) {
                clearInterval(pollingIntervalId.current);
            }
            pollAnalysisStatus();
            pollingIntervalId.current = setInterval(pollAnalysisStatus, POLLING_INTERVAL_MS);
        }

        return () => {
            if (pollingIntervalId.current) {
                clearInterval(pollingIntervalId.current);
                pollingIntervalId.current = null;
            }
        };
    }, [status, analysisId, pollAnalysisStatus]);

    useEffect(() => {
        if (analysisIdParam) {
            setAnalysisId(analysisIdParam);
            setStatus('polling');
            pollAnalysisStatus();
        }
    }, [analysisIdParam, pollAnalysisStatus]);

    // Fetch ATS scores when analysis is completed
    useEffect(() => {
        const fetchAtsScores = async () => {
            if (analysisId && analysisResult?.status === 'completed') {
                console.log(`[DEBUG Frontend] fetchAtsScores - Analysis completed, checking for ATS scores`);
                // First, check if ATS scores are already in the analysis result
                if (analysisResult.atsScores) {
                    console.log(`[DEBUG Frontend] ATS scores found in analysis result, using them:`, analysisResult.atsScores);
                    setAtsScores(analysisResult.atsScores);
                    return;
                }

                // If not in the result, fetch separately
                console.log(`[DEBUG Frontend] ATS scores not in analysis result, fetching separately...`);
                setIsLoadingAts(true);
                try {
                    const response = await getAtsScores(analysisId);
                    console.log(`[DEBUG Frontend] Fetched ATS scores separately:`, response.atsScores);
                    setAtsScores(response.atsScores);
                } catch (error: any) {
                    console.error('Error fetching ATS scores:', error);
                    // Don't show error toast, just log it - ATS scores are optional
                } finally {
                    setIsLoadingAts(false);
                }
            }
        };

        fetchAtsScores();
    }, [analysisId, analysisResult?.status, analysisResult?.atsScores]);

    // Cleanup ATS polling on unmount
    useEffect(() => {
        return () => {
            if (atsPollingIntervalId) {
                clearInterval(atsPollingIntervalId);
            }
        };
    }, [atsPollingIntervalId]);

    const pollAtsScores = useCallback(async (analysisIdToPoll: string, startTime: number, intervalIdRef: NodeJS.Timeout | null) => {
        try {
            const response = await getAtsScores(analysisIdToPoll);
            
            // Debug logging
            console.log('[ATS Poll] Response:', response);
            console.log('[ATS Poll] ATS Scores:', response.atsScores);
            
            // Check if we have valid scores - check for score OR any details
            const hasScores = response.atsScores && (
                (response.atsScores.score !== null && response.atsScores.score !== undefined) ||
                (response.atsScores.skillMatchDetails && (
                    response.atsScores.skillMatchDetails.skillMatchPercentage !== undefined ||
                    (response.atsScores.skillMatchDetails.matchedSkills && response.atsScores.skillMatchDetails.matchedSkills.length > 0) ||
                    (response.atsScores.skillMatchDetails.missingSkills && response.atsScores.skillMatchDetails.missingSkills.length > 0)
                )) ||
                (response.atsScores.complianceDetails && (
                    (response.atsScores.complianceDetails.keywordsMatched && response.atsScores.complianceDetails.keywordsMatched.length > 0) ||
                    (response.atsScores.complianceDetails.keywordsMissing && response.atsScores.complianceDetails.keywordsMissing.length > 0) ||
                    (response.atsScores.complianceDetails.formattingIssues && response.atsScores.complianceDetails.formattingIssues.length > 0) ||
                    (response.atsScores.complianceDetails.suggestions && response.atsScores.complianceDetails.suggestions.length > 0)
                )) ||
                response.atsScores.error
            );

            console.log('[ATS Poll] Has scores:', hasScores);

            if (hasScores) {
                // Results are ready!
                console.log('[ATS Poll] Setting ATS scores:', response.atsScores);
                setAtsScores(response.atsScores);
                setIsScanningAts(false);
                setAtsProgressMessage('');
                if (intervalIdRef) {
                    clearInterval(intervalIdRef);
                    setAtsPollingIntervalId(null);
                }
                setToast({ message: 'ATS analysis completed successfully!', type: 'success' });
                return true;
            }

            // Check for timeout
            const elapsed = Date.now() - startTime;
            if (elapsed > ATS_POLLING_TIMEOUT_MS) {
                setIsScanningAts(false);
                setAtsProgressMessage('');
                if (intervalIdRef) {
                    clearInterval(intervalIdRef);
                    setAtsPollingIntervalId(null);
                }
                setToast({ message: 'ATS analysis is taking longer than expected. Please try again later.', type: 'info' });
                return true;
            }

            // Update progress message
            const elapsedSeconds = Math.floor(elapsed / 1000);
            setAtsProgressMessage(`Analyzing your CV... (${elapsedSeconds}s)`);
            return false;
        } catch (error: any) {
            console.error('Error polling ATS scores:', error);
            // Continue polling on error (might be temporary)
            return false;
        }
    }, []);

    const handleScanAts = async () => {
        if (!analysisId) {
            setToast({ message: 'No analysis available. Please complete an analysis first.', type: 'error' });
            return;
        }

        // Clear any existing polling
        if (atsPollingIntervalId) {
            clearInterval(atsPollingIntervalId);
            setAtsPollingIntervalId(null);
        }

        setIsScanningAts(true);
        setAtsProgressMessage('Starting ATS analysis...');
        setAtsScores(null); // Clear previous scores

        try {
            await scanAtsForAnalysis(analysisId);
            setToast({ message: 'ATS scan started. Analyzing your CV...', type: 'info' });
            
            const startTime = Date.now();
            
            // Set up interval polling
            const intervalId = setInterval(async () => {
                const result = await pollAtsScores(analysisId, startTime, intervalId);
                if (result) {
                    clearInterval(intervalId);
                    setAtsPollingIntervalId(null);
                }
            }, ATS_POLLING_INTERVAL_MS);
            
            setAtsPollingIntervalId(intervalId);
            
            // Start polling immediately
            const checkResult = await pollAtsScores(analysisId, startTime, intervalId);
            if (checkResult) {
                clearInterval(intervalId);
                setAtsPollingIntervalId(null);
            }
        } catch (error: any) {
            console.error('Error starting ATS scan:', error);
            setToast({ message: error.message || 'Failed to start ATS scan.', type: 'error' });
            setIsScanningAts(false);
            setAtsProgressMessage('');
        }
    };

    const handleImprovement = async (checkType: string, currentContent: string) => {
        if (!analysisId) return;

        const checkToSectionMap: Record<string, string> = {
            impactQuantification: 'experience',
            activeVoiceUsage: 'experience',
            keywordRelevance: 'skills',
            toneClarity: 'summary',
            buzzwordsAndCliches: 'summary',
            summaryObjectiveQuality: 'summary',
            skillsOrganization: 'skills',
            educationPresentation: 'education',
        };

        const section = checkToSectionMap[checkType] || checkType;

        setImprovements((prev) => ({
            ...prev,
            [checkType]: { isGenerating: true },
        }));

        try {
            const response = await fetch(`/api/analysis/${analysisId}/improve/${section}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: currentContent }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate improvement');
            }

            const { improvement } = await response.json();
            setImprovements((prev) => ({
                ...prev,
                [checkType]: { isGenerating: false, content: improvement },
            }));
            setToast({ message: 'Improvement generated successfully!', type: 'success' });
        } catch (err: any) {
            console.error(`Error generating improvement for ${checkType}:`, err);
            setImprovements((prev) => ({
                ...prev,
                [checkType]: { isGenerating: false, error: err.message },
            }));
            setToast({ message: `Failed to generate improvement: ${err.message}`, type: 'error' });
        }
    };

    const getProgressStage = (): 'idle' | 'uploading' | 'processing' | 'analyzing' | 'completed' | 'error' => {
        if (status === 'error') return 'error';
        if (status === 'uploading') return 'uploading';
        if (status === 'polling' && !analysisResult) return 'processing';
        if (status === 'polling' && analysisResult?.status === 'pending') return 'analyzing';
        if (status === 'completed') return 'completed';
        return 'idle';
    };

    const getScoreColor = (score: number): 'blue' | 'green' | 'yellow' | 'red' | 'purple' => {
        if (score >= 80) return 'green';
        if (score >= 60) return 'yellow';
        return 'red';
    };

    return (
        <div className="container mx-auto p-4 pb-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">CV Analysis</h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Upload your CV to get detailed feedback and improvement suggestions.
                </p>
            </div>

            {!analysisIdParam && (
                <>
                    {/* CV Info Section - Show when CV exists */}
                    {currentCvData && !isLoadingCv && (
                        <div className="mb-6 p-6 border dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                                        <svg
                                            className="w-6 h-6 text-green-600 dark:text-green-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your CV</h2>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {currentCvData.basics?.name || 'CV uploaded'}
                                            {currentCvData.basics?.label && (
                                                <span className="text-gray-500 dark:text-gray-400"> • {currentCvData.basics.label}</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDeleteCv}
                                    disabled={isDeleting}
                                    className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
                                    title="Delete CV"
                                >
                                    {isDeleting ? (
                                        <>
                                            <Spinner size="sm" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                            Delete CV
                                        </>
                                    )}
                                </button>
                            </div>
                            <button
                                onClick={handleAnalyze}
                                disabled={status === 'uploading' || status === 'polling'}
                                className="w-full md:w-auto px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
                            >
                                {status === 'uploading' && (
                                    <>
                                        <Spinner size="sm" />
                                        Starting Analysis...
                                    </>
                                )}
                                {status === 'polling' && (
                                    <>
                                        <Spinner size="sm" />
                                        Analyzing...
                                    </>
                                )}
                                {(status === 'idle' || status === 'completed' || status === 'error') && (
                                    <>
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                            />
                                        </svg>
                                        Analyze CV
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Upload Section - Only show when no CV exists */}
                    {!currentCvData && !isLoadingCv && (
                        <div className="mb-6 p-6 border dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                                    <svg
                                        className="w-6 h-6 text-blue-600 dark:text-blue-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Upload CV</h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Select or drag and drop your CV file (PDF or DOCX)
                                    </p>
                                </div>
                            </div>

                            <FileUploadZone
                                selectedFile={selectedFile}
                                onFileSelect={handleFileSelect}
                                onFileRemove={handleFileRemove}
                                isDragging={isDragging}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                disabled={status === 'uploading' || status === 'polling'}
                            />

                            <button
                                onClick={handleAnalyze}
                                disabled={!selectedFile || status === 'uploading' || status === 'polling'}
                                className="w-full md:w-auto px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
                            >
                                {status === 'uploading' && (
                                    <>
                                        <Spinner size="sm" />
                                        Uploading...
                                    </>
                                )}
                                {status === 'polling' && (
                                    <>
                                        <Spinner size="sm" />
                                        Analyzing...
                                    </>
                                )}
                                {(status === 'idle' || status === 'completed' || status === 'error') && (
                                    <>
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                            />
                                        </svg>
                                        Analyze CV
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Loading state while fetching CV */}
                    {isLoadingCv && (
                        <div className="mb-6 p-6 border dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
                            <LoadingSkeleton lines={3} />
                        </div>
                    )}
                </>
            )}

            {(status === 'uploading' || status === 'polling') && (
                <div className="mb-6 p-6 border dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
                    <AnalysisProgress stage={getProgressStage()} />
                    {status === 'polling' && (
                        <div className="mt-4 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <Spinner size="sm" />
                            <span>
                                {analysisResult?.status === 'pending'
                                    ? 'Analysis in progress...'
                                    : 'Waiting for results...'}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {status === 'polling' && !analysisResult && (
                <div className="mb-6 p-6 border dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
                    <LoadingSkeleton lines={5} />
                </div>
            )}

            {analysisResult && analysisResult.status === 'completed' && (
                <div className="space-y-6">
                    {/* ATS Scores Section */}
                    <div className="p-6 border dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">ATS Analysis</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Get ATS compliance scores and skill matching analysis
                                </p>
                            </div>
                            <button
                                onClick={handleScanAts}
                                disabled={isScanningAts || isLoadingAts}
                                className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
                            >
                                {isScanningAts ? (
                                    <>
                                        <Spinner size="sm" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        Scan ATS
                                    </>
                                )}
                            </button>
                        </div>
                        
                        {/* ATS Progress Indicator */}
                        {isScanningAts && (
                            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Spinner size="sm" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                                            {atsProgressMessage || 'Processing ATS analysis...'}
                                        </p>
                                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                            This may take 30-60 seconds. Please wait...
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <AtsFeedbackPanel 
                            atsScores={atsScores} 
                            isLoading={isLoadingAts || isScanningAts} 
                        />
                    </div>

                    {/* Score Overview Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <ScoreCard
                            title="Overall Score"
                            score={analysisResult.overallScore ?? 0}
                            subtitle="CV Quality Assessment"
                            icon={
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                    />
                                </svg>
                            }
                            color={getScoreColor(analysisResult.overallScore ?? 0)}
                        />
                        <ScoreCard
                            title="Issues Found"
                            score={analysisResult.issueCount ?? 0}
                            maxScore={50}
                            subtitle="Areas to improve"
                            icon={
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            }
                            color={analysisResult.issueCount === 0 ? 'green' : analysisResult.issueCount! < 5 ? 'yellow' : 'red'}
                        />
                        {analysisResult.categoryScores &&
                            Object.entries(analysisResult.categoryScores)
                                .slice(0, 2)
                                .map(([category, score]) => (
                                    <ScoreCard
                                        key={category}
                                        title={category.charAt(0).toUpperCase() + category.slice(1)}
                                        score={score}
                                        subtitle="Category score"
                                        color={getScoreColor(score)}
                                        icon={
                                            <svg
                                                className="w-6 h-6"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        }
                                    />
                                ))}
                    </div>

                    {/* Category Scores Grid */}
                    {analysisResult.categoryScores &&
                        Object.keys(analysisResult.categoryScores).length > 2 && (
                            <div className="p-6 border dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
                                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                                    Category Scores
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.entries(analysisResult.categoryScores)
                                        .slice(2)
                                        .map(([category, score]) => (
                                            <ScoreCard
                                                key={category}
                                                title={category.charAt(0).toUpperCase() + category.slice(1)}
                                                score={score}
                                                subtitle="Category score"
                                                color={getScoreColor(score)}
                                                className="mb-0"
                                            />
                                        ))}
                                </div>
                            </div>
                        )}

                    {/* Detailed Results with Filters */}
                    {analysisResult.detailedResults &&
                        Object.keys(analysisResult.detailedResults).length > 0 && (
                            <div className="p-6 border dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                                        Detailed Analysis Results
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label
                                                htmlFor="searchQuery"
                                                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                                            >
                                                Search
                                            </label>
                                            <input
                                                type="text"
                                                id="searchQuery"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search checks, issues, or suggestions..."
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label
                                                htmlFor="priorityFilter"
                                                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                                            >
                                                Filter by Priority
                                            </label>
                                            <select
                                                id="priorityFilter"
                                                value={priorityFilter}
                                                onChange={(e) =>
                                                    setPriorityFilter(
                                                        e.target.value as 'all' | 'high' | 'medium' | 'low'
                                                    )
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="all">All Priorities</option>
                                                <option value="high">High Priority</option>
                                                <option value="medium">Medium Priority</option>
                                                <option value="low">Low Priority</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <ResultsAccordion
                                    detailedResults={analysisResult.detailedResults}
                                    improvements={improvements}
                                    onImprove={handleImprovement}
                                    searchQuery={searchQuery}
                                    priorityFilter={priorityFilter}
                                />
                            </div>
                        )}
                </div>
            )}

            {analysisResult && analysisResult.status === 'failed' && (
                <div className="p-6 border border-red-300 dark:border-red-700 rounded-lg shadow-sm bg-red-50 dark:bg-red-900/30">
                    <div className="flex items-center gap-3 mb-2">
                        <svg
                            className="w-6 h-6 text-red-600 dark:text-red-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <h3 className="text-lg font-semibold text-red-900 dark:text-red-300">Analysis Failed</h3>
                    </div>
                    {analysisResult.errorInfo && (
                        <p className="text-red-700 dark:text-red-400">{analysisResult.errorInfo}</p>
                    )}
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default AnalysisPage;
