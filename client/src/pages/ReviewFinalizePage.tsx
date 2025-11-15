// client/src/pages/ReviewFinalizePage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getJobById, updateJob, JobApplication, scrapeJobDescriptionApi, updateJobDraft } from '../services/jobApi';
import { renderFinalPdfs, getDownloadUrl, generateDocuments } from '../services/generatorApi';
import { analyzeCv, AnalysisResult, getAnalysis } from '../services/analysisApi';
import { JsonResumeSchema } from '../../../server/src/types/jsonresume';
import CvFormEditor from '../components/cv-editor/CvFormEditor';
import { generateCoverLetter } from '../services/coverLetterApi';
import { getCurrentCv } from '../services/cvApi';
import axios from 'axios';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorAlert from '../components/common/ErrorAlert';
import Spinner from '../components/common/Spinner';
import Toast from '../components/common/Toast';
import JobStatusBadge from '../components/jobs/JobStatusBadge';
import ProgressIndicator from '../components/jobs/ProgressIndicator';

interface ToastState {
    message: string;
    type: 'success' | 'error' | 'info';
}

const ReviewFinalizePage: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const [jobApplication, setJobApplication] = useState<JobApplication | null>(null);
    const [cvData, setCvData] = useState<JsonResumeSchema>({ basics: {} });
    const [coverLetterText, setCoverLetterText] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isRenderingPdf, setIsRenderingPdf] = useState<boolean>(false);
    const [renderError, setRenderError] = useState<string | null>(null);
    const [refreshError, setRefreshError] = useState<string | null>(null);
    const [analyzeError, setAnalyzeError] = useState<string | null>(null);
    const [finalPdfFiles, setFinalPdfFiles] = useState<{ cv: string | null, cl: string | null }>({ cv: null, cl: null });
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [analyzingSections, setAnalyzingSections] = useState<Record<string, boolean>>({});
    const pollingIntervalId = useRef<NodeJS.Timeout | null>(null);
    const POLLING_INTERVAL_MS = 2000;
    const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState<boolean>(false);
    const [coverLetterError, setCoverLetterError] = useState<string | null>(null);
    const [isGeneratingCv, setIsGeneratingCv] = useState<boolean>(false);
    const [generateCvError, setGenerateCvError] = useState<string | null>(null);
    const [hasMasterCv, setHasMasterCv] = useState<boolean>(false);
    const [toast, setToast] = useState<ToastState | null>(null);
    const [isJobDescriptionExpanded, setIsJobDescriptionExpanded] = useState<boolean>(false);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
    };

    const fetchJobData = useCallback(async () => {
        if (!jobId) return;
        setIsLoading(true);
        setFetchError(null);
        try {
            const data = await getJobById(jobId);
            setJobApplication(data);
            if (data.draftCvJson) {
                setCvData(data.draftCvJson);
            }
            setCoverLetterText(data.draftCoverLetterText || '');

            if (data.generatedCvFilename || data.generatedCoverLetterFilename) {
                setFinalPdfFiles({
                    cv: data.generatedCvFilename || null,
                    cl: data.generatedCoverLetterFilename || null
                });
            }

            try {
                const cvResponse = await getCurrentCv();
                setHasMasterCv(!!cvResponse.cvData);
            } catch (error) {
                console.error("Error checking master CV:", error);
                setHasMasterCv(false);
            }
        } catch (error: any) {
            console.error("Error fetching job application:", error);
            setFetchError(error.message || 'Failed to fetch job details.');
        } finally {
            setIsLoading(false);
        }
    }, [jobId]);

    useEffect(() => {
        fetchJobData();
    }, [fetchJobData]);

    const handleCvChange = (updatedCv: JsonResumeSchema) => {
        setCvData(updatedCv);
    };

    const handleCoverLetterChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCoverLetterText(event.target.value);
    };

    const handleRefreshJobDetails = async () => {
        if (!jobId || !jobApplication?.jobUrl) return;

        setIsRefreshing(true);
        setRefreshError(null);
        try {
            const response = await scrapeJobDescriptionApi(jobId);
            setJobApplication(response.job);
            showToast('Job details refreshed successfully', 'success');
        } catch (error: any) {
            console.error("Error refreshing job details:", error);
            setRefreshError(error.message || 'Failed to refresh job details.');
        } finally {
            setIsRefreshing(false);
        }
    };

    const pollAnalysisResults = useCallback(async (id: string) => {
        try {
            const response = await getAnalysis(id);

            if (response.status === 'completed') {
                setAnalysisResult(prev => ({
                    ...prev,
                    ...response
                }));
                if (pollingIntervalId.current) {
                    clearInterval(pollingIntervalId.current);
                    pollingIntervalId.current = null;
                }
            } else if (response.status === 'failed') {
                setAnalyzeError(response.errorInfo || 'Analysis failed');
                if (pollingIntervalId.current) {
                    clearInterval(pollingIntervalId.current);
                    pollingIntervalId.current = null;
                }
            }
        } catch (error: any) {
            console.error('Error polling analysis results:', error);
            setAnalyzeError(error.message || 'Failed to get analysis results');
        }
    }, []);

    const handleAnalyzeSection = async (section: string) => {
        if (!jobId || !cvData) return;

        setAnalyzingSections(prev => ({ ...prev, [section]: true }));
        setAnalyzeError(null);

        try {
            const sectionData = {
                ...cvData,
                basics: cvData.basics,
                work: section === 'work' ? cvData.work : undefined,
                education: section === 'education' ? cvData.education : undefined,
                skills: section === 'skills' ? cvData.skills : undefined,
                projects: section === 'projects' ? cvData.projects : undefined,
                languages: section === 'languages' ? cvData.languages : undefined,
                certificates: section === 'certificates' ? cvData.certificates : undefined,
            };

            const jobContext = jobApplication?.jobDescriptionText ? { jobDescription: jobApplication.jobDescriptionText } : undefined;
            const response = await analyzeCv(sectionData, jobContext);

            if (pollingIntervalId.current) {
                clearInterval(pollingIntervalId.current);
            }
            pollAnalysisResults(response.id);
            pollingIntervalId.current = setInterval(() => pollAnalysisResults(response.id), POLLING_INTERVAL_MS);

        } catch (error: any) {
            console.error(`Error analyzing ${section}:`, error);
            setAnalyzeError(error.message || `Failed to analyze ${section}.`);
        } finally {
            setAnalyzingSections(prev => ({ ...prev, [section]: false }));
        }
    };

    useEffect(() => {
        return () => {
            if (pollingIntervalId.current) {
                clearInterval(pollingIntervalId.current);
                pollingIntervalId.current = null;
            }
        };
    }, []);

    const handleSaveChanges = async () => {
        if (!jobId || !jobApplication) return false;

        setIsSaving(true);
        setSaveError(null);
        try {
            const updatePayload: any = {
                draftCvJson: cvData,
                draftCoverLetterText: coverLetterText,
            };

            if (cvData && typeof cvData === 'object' && Object.keys(cvData).length > 0 && coverLetterText && coverLetterText.trim().length > 0) {
                const currentStatus = jobApplication.generationStatus;
                if (currentStatus !== 'finalized') {
                    updatePayload.generationStatus = 'draft_ready';
                }
            }

            await updateJob(jobId, updatePayload);
            setJobApplication(prev => prev ? { ...prev, ...updatePayload } : null);
            showToast('Changes saved successfully', 'success');
            return true;
        } catch (error: any) {
            console.error("Error saving changes:", error);
            setSaveError(error.message || 'Failed to save changes.');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateFinalPdfs = async () => {
        if (!jobId) return;

        setIsRenderingPdf(true);
        setRenderError(null);
        setFinalPdfFiles({ cv: null, cl: null });

        try {
            const saveSuccess = await handleSaveChanges();
            if (!saveSuccess) {
                throw new Error(`Cannot generate PDFs: Failed to save changes first.`);
            }

            const result = await renderFinalPdfs(jobId);
            setFinalPdfFiles({ cv: result.cvFilename, cl: result.coverLetterFilename });
            setJobApplication(prev => prev ? { ...prev, generationStatus: 'finalized' } : null);
            showToast('PDFs generated successfully', 'success');
        } catch (error: any) {
            console.error("Error generating final PDFs:", error);
            if (!saveError) {
                setRenderError(error.message || 'Failed to generate final PDFs.');
            }
        } finally {
            setIsRenderingPdf(false);
        }
    };

    const handleDownload = async (filename: string | null) => {
        if (!filename) return;
        try {
            const url = getDownloadUrl(filename);
            const response = await axios.get(url, {
                responseType: 'blob',
            });

            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            showToast('Download started', 'success');
        } catch (error: any) {
            const errorMessage = error.response?.data instanceof Blob ?
                await error.response.data.text() :
                error.response?.data?.message || error.message || 'An unknown error occurred during download.';
            showToast(`Failed to download: ${errorMessage}`, 'error');
        }
    };

    const handleGenerateCoverLetter = async () => {
        if (!jobId || !jobApplication) return;

        setIsGeneratingCoverLetter(true);
        setCoverLetterError(null);

        try {
            if (!jobApplication.jobDescriptionText) {
                setCoverLetterError('Please scrape the job description first using the "Refresh Job Details" button.');
                return;
            }

            if (!hasMasterCv) {
                setCoverLetterError('Please upload your master CV first at the CV Management page.');
                return;
            }

            const language = jobApplication.language || 'en';
            const generatedText = await generateCoverLetter(jobId, language as 'en' | 'de');

            await updateJobDraft(jobId, {
                draftCoverLetterText: generatedText
            });

            await fetchJobData();
            showToast('Cover letter generated successfully', 'success');
        } catch (error: any) {
            console.error('Error generating cover letter:', error);
            setCoverLetterError(error.message || 'Failed to generate cover letter');
        } finally {
            setIsGeneratingCoverLetter(false);
        }
    };

    const handleGenerateSpecificCv = async () => {
        if (!jobId || !jobApplication) return;

        setIsGeneratingCv(true);
        setGenerateCvError(null);

        try {
            if (!jobApplication.jobDescriptionText) {
                setGenerateCvError('Please scrape the job description first using the "Refresh Job Details" button.');
                return;
            }

            if (!hasMasterCv) {
                setGenerateCvError('Please upload your master CV first at the CV Management page.');
                return;
            }

            const language = jobApplication.language || 'en';
            const response = await generateDocuments(jobId, language as 'en' | 'de');

            if (response.status === 'draft_ready') {
                await fetchJobData();
                showToast('CV generated successfully', 'success');
            } else if (response.status === 'pending_input') {
                setGenerateCvError('Generation requires additional input. Please check the console for details.');
            } else {
                setGenerateCvError('Unexpected response from generation service.');
            }
        } catch (error: any) {
            console.error('Error generating specific CV:', error);
            setGenerateCvError(error.message || 'Failed to generate job-specific CV.');
        } finally {
            setIsGeneratingCv(false);
        }
    };

    // Calculate progress steps
    const getProgressSteps = () => {
        if (!jobApplication) return [];
        return [
            {
                label: 'Job Details',
                completed: !!jobApplication.jobDescriptionText,
            },
            {
                label: 'CV Generated',
                completed: !!jobApplication.draftCvJson,
            },
            {
                label: 'Cover Letter',
                completed: !!jobApplication.draftCoverLetterText,
            },
            {
                label: 'PDFs Ready',
                completed: !!(finalPdfFiles.cv && finalPdfFiles.cl),
            },
        ];
    };

    // Format date helper
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return 'N/A';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="container mx-auto p-4">
                    <div className="mb-6">
                        <LoadingSkeleton lines={2} />
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <LoadingSkeleton lines={5} />
                    </div>
                </div>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="container mx-auto p-4">
                    <div className="mb-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Dashboard
                        </button>
                    </div>
                    <ErrorAlert
                        message={fetchError}
                        onRetry={() => fetchJobData()}
                    />
                </div>
            </div>
        );
    }

    if (!jobApplication) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="container mx-auto p-4 text-center">
                    <p className="text-gray-900 dark:text-gray-300 mb-4">Job application data not found.</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-800"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const progressSteps = getProgressSteps();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Sticky Header with Breadcrumbs */}
            <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Link to="/dashboard" className="hover:text-gray-900 dark:hover:text-gray-100">
                                Dashboard
                            </Link>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="text-gray-900 dark:text-gray-100 font-medium truncate max-w-md">
                                {jobApplication.jobTitle} at {jobApplication.companyName}
                            </span>
                        </div>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                {/* Page Title and Status Badges */}
                <div className="mb-6">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                            {jobApplication.jobTitle}
                        </h1>
                        <JobStatusBadge type="application" status={jobApplication.status} />
                        {jobApplication.generationStatus && (
                            <JobStatusBadge type="generation" status={jobApplication.generationStatus} />
                        )}
                    </div>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                        {jobApplication.companyName}
                    </p>

                    {/* Progress Indicator */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
                        <ProgressIndicator steps={progressSteps} />
                    </div>
                </div>

                {/* Job Details Section */}
                <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                            <div className="flex-1">
                                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">Job Details</h2>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500 dark:text-gray-400">Status:</span>
                                        <JobStatusBadge type="application" status={jobApplication.status} />
                                    </div>
                                    {jobApplication.dateApplied && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500 dark:text-gray-400">Date Applied:</span>
                                            <span className="text-gray-900 dark:text-gray-100">{formatDate(jobApplication.dateApplied)}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500 dark:text-gray-400">Created:</span>
                                        <span className="text-gray-900 dark:text-gray-100">{formatDate(jobApplication.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500 dark:text-gray-400">Updated:</span>
                                        <span className="text-gray-900 dark:text-gray-100">{formatDate(jobApplication.updatedAt)}</span>
                                    </div>
                                    {jobApplication.jobUrl && (
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={jobApplication.jobUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                View Job Posting
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={handleRefreshJobDetails}
                                disabled={isRefreshing || !jobApplication.jobUrl}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isRefreshing ? (
                                    <>
                                        <Spinner size="sm" />
                                        <span>Refreshing...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span>Refresh Job Details</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {refreshError && (
                            <div className="mb-4">
                                <ErrorAlert
                                    message={refreshError}
                                    onDismiss={() => setRefreshError(null)}
                                    onRetry={handleRefreshJobDetails}
                                />
                            </div>
                        )}

                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Job Description</h3>
                                {jobApplication.jobDescriptionText && (
                                    <button
                                        onClick={() => setIsJobDescriptionExpanded(!isJobDescriptionExpanded)}
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        {isJobDescriptionExpanded ? 'Show Less' : 'Show More'}
                                    </button>
                                )}
                            </div>
                            <div
                                className={`p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-gray-900 dark:text-gray-300 whitespace-pre-wrap ${
                                    isJobDescriptionExpanded ? '' : 'max-h-60 overflow-y-auto'
                                }`}
                            >
                                {jobApplication.jobDescriptionText || (
                                    <p className="text-gray-500 dark:text-gray-400 italic">No job description available. Click "Refresh Job Details" to scrape it.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* CV Generation or Editor Section */}
                {jobApplication.draftCvJson ? (
                    <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit CV</h2>
                            </div>
                            {analyzeError && (
                                <div className="mb-4">
                                    <ErrorAlert
                                        message={`Analysis Error: ${analyzeError}`}
                                        onDismiss={() => setAnalyzeError(null)}
                                    />
                                </div>
                            )}
                            {cvData && (
                                <CvFormEditor
                                    data={cvData}
                                    onChange={handleCvChange}
                                    analysisResult={analysisResult}
                                    onAnalyzeSection={handleAnalyzeSection}
                                    analyzingSections={analyzingSections}
                                />
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="p-6">
                            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Generate Job-Specific CV</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                Generate a tailored CV for this specific job application based on your master CV and the job requirements.
                            </p>
                            {generateCvError && (
                                <div className="mb-4">
                                    <ErrorAlert
                                        message={generateCvError}
                                        onDismiss={() => setGenerateCvError(null)}
                                    />
                                </div>
                            )}
                            <button
                                onClick={handleGenerateSpecificCv}
                                disabled={isGeneratingCv || !hasMasterCv || !jobApplication.jobDescriptionText}
                                className="flex items-center gap-2 px-6 py-3 bg-purple-600 dark:bg-purple-700 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                                title={
                                    !hasMasterCv
                                        ? 'Please upload your master CV first at the CV Management page'
                                        : !jobApplication.jobDescriptionText
                                        ? 'Please scrape the job description first'
                                        : 'Generate a tailored CV for this job'
                                }
                            >
                                {isGeneratingCv ? (
                                    <>
                                        <Spinner size="sm" />
                                        <span>Generating CV...</span>
                                    </>
                                ) : (
                                    'Generate Specific CV for the Job'
                                )}
                            </button>
                            {!hasMasterCv && (
                                <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
                                    ⚠️ You need to upload your master CV first. Go to <Link to="/manage-cv" className="underline">CV Management</Link> to upload it.
                                </p>
                            )}
                            {!jobApplication.jobDescriptionText && (
                                <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
                                    ⚠️ Please scrape the job description first using the "Refresh Job Details" button above.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Cover Letter Generation or Editor Section */}
                {jobApplication.draftCoverLetterText ? (
                    <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit Cover Letter</h2>
                                <button
                                    onClick={handleGenerateCoverLetter}
                                    disabled={isGeneratingCoverLetter || !jobApplication?.jobDescriptionText || !hasMasterCv}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
                                    title={
                                        !hasMasterCv
                                            ? 'Please upload your master CV first'
                                            : !jobApplication?.jobDescriptionText
                                            ? 'Please scrape the job description first'
                                            : 'Regenerate cover letter'
                                    }
                                >
                                    {isGeneratingCoverLetter ? (
                                        <>
                                            <Spinner size="sm" />
                                            <span>Regenerating...</span>
                                        </>
                                    ) : (
                                        'Regenerate Cover Letter'
                                    )}
                                </button>
                            </div>
                            {coverLetterError && (
                                <div className="mb-4">
                                    <ErrorAlert
                                        message={coverLetterError}
                                        onDismiss={() => setCoverLetterError(null)}
                                    />
                                </div>
                            )}
                            <textarea
                                value={coverLetterText}
                                onChange={handleCoverLetterChange}
                                className="w-full h-64 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Edit your cover letter here..."
                            />
                        </div>
                    </div>
                ) : (
                    <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="p-6">
                            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Generate Cover Letter</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                Generate a tailored cover letter for this specific job application based on your master CV and the job requirements.
                            </p>
                            {coverLetterError && (
                                <div className="mb-4">
                                    <ErrorAlert
                                        message={coverLetterError}
                                        onDismiss={() => setCoverLetterError(null)}
                                    />
                                </div>
                            )}
                            <button
                                onClick={handleGenerateCoverLetter}
                                disabled={isGeneratingCoverLetter || !hasMasterCv || !jobApplication.jobDescriptionText}
                                className="flex items-center gap-2 px-6 py-3 bg-purple-600 dark:bg-purple-700 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                                title={
                                    !hasMasterCv
                                        ? 'Please upload your master CV first at the CV Management page'
                                        : !jobApplication.jobDescriptionText
                                        ? 'Please scrape the job description first'
                                        : 'Generate a tailored cover letter for this job'
                                }
                            >
                                {isGeneratingCoverLetter ? (
                                    <>
                                        <Spinner size="sm" />
                                        <span>Generating Cover Letter...</span>
                                    </>
                                ) : (
                                    'Generate Cover Letter'
                                )}
                            </button>
                            {!hasMasterCv && (
                                <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
                                    ⚠️ You need to upload your master CV first. Go to <Link to="/manage-cv" className="underline">CV Management</Link> to upload it.
                                </p>
                            )}
                            {!jobApplication.jobDescriptionText && (
                                <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
                                    ⚠️ Please scrape the job description first using the "Refresh Job Details" button above.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Action Bar */}
            {jobApplication.draftCvJson && jobApplication.draftCoverLetterText && (
                <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-30">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                            <div className="flex-1">
                                {saveError && (
                                    <ErrorAlert
                                        message={`Save Error: ${saveError}`}
                                        onDismiss={() => setSaveError(null)}
                                        className="mb-2"
                                    />
                                )}
                                {renderError && (
                                    <ErrorAlert
                                        message={`Render Error: ${renderError}`}
                                        onDismiss={() => setRenderError(null)}
                                    />
                                )}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={handleSaveChanges}
                                    disabled={isSaving || isRenderingPdf}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                                >
                                    {isSaving ? (
                                        <>
                                            <Spinner size="sm" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>

                                <button
                                    onClick={handleGenerateFinalPdfs}
                                    disabled={isRenderingPdf || isSaving}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 dark:bg-green-700 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                                >
                                    {isRenderingPdf ? (
                                        <>
                                            <Spinner size="sm" />
                                            <span>{(jobApplication.generatedCvFilename || jobApplication.generatedCoverLetterFilename) ? 'Regenerating PDFs...' : 'Generating PDFs...'}</span>
                                        </>
                                    ) : (
                                        (jobApplication.generatedCvFilename || jobApplication.generatedCoverLetterFilename) ? 'Regenerate PDFs' : 'Generate PDFs'
                                    )}
                                </button>

                                {(finalPdfFiles.cv || finalPdfFiles.cl) && (
                                    <div className="flex gap-2">
                                        {finalPdfFiles.cv && (
                                            <button
                                                onClick={() => handleDownload(finalPdfFiles.cv)}
                                                className="flex items-center gap-2 px-4 py-3 bg-green-600 dark:bg-green-700 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <span className="hidden sm:inline">Download CV</span>
                                            </button>
                                        )}
                                        {finalPdfFiles.cl && (
                                            <button
                                                onClick={() => handleDownload(finalPdfFiles.cl)}
                                                className="flex items-center gap-2 px-4 py-3 bg-purple-600 dark:bg-purple-700 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-800 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <span className="hidden sm:inline">Download CL</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewFinalizePage;
