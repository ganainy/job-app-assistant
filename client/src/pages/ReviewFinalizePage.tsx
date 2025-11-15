// client/src/pages/ReviewFinalizePage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJobById, updateJob, JobApplication, scrapeJobDescriptionApi } from '../services/jobApi';
import { renderFinalPdfs, getDownloadUrl } from '../services/generatorApi';
import { analyzeCv, AnalysisResult, getAnalysis } from '../services/analysisApi'; // Import AnalysisResult type
import { JsonResumeSchema } from '../../../server/src/types/jsonresume';
import CvFormEditor from '../components/cv-editor/CvFormEditor';
import axios from 'axios';

const ReviewFinalizePage: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const [jobApplication, setJobApplication] = useState<JobApplication | null>(null);
    const [cvData, setCvData] = useState<JsonResumeSchema | null>(null);
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
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null); // State to hold analysis results
    const [analyzingSections, setAnalyzingSections] = useState<Record<string, boolean>>({});
    const pollingIntervalId = useRef<NodeJS.Timeout | null>(null);
    const POLLING_INTERVAL_MS = 2000;

    const fetchJobData = useCallback(async () => {
        if (!jobId) return;
        setIsLoading(true);
        setFetchError(null);
        try {
            const data = await getJobById(jobId);
            setJobApplication(data);
            setCvData(data.draftCvJson || null);
            setCoverLetterText(data.draftCoverLetterText || '');

            if (data.generatedCvFilename || data.generatedCoverLetterFilename) {
                setFinalPdfFiles({
                    cv: data.generatedCvFilename || null,
                    cl: data.generatedCoverLetterFilename || null
                });
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
            // Show success message or update UI as needed
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
            // Create a partial CV with just the section being analyzed
            const sectionData = {
                ...cvData,
                // Keep basics section always as it may be needed for context
                basics: cvData.basics,
                // Only include the section being analyzed
                work: section === 'work' ? cvData.work : undefined,
                education: section === 'education' ? cvData.education : undefined,
                skills: section === 'skills' ? cvData.skills : undefined,
                projects: section === 'projects' ? cvData.projects : undefined,
                languages: section === 'languages' ? cvData.languages : undefined,
                certificates: section === 'certificates' ? cvData.certificates : undefined,
            };

            const jobContext = jobApplication?.jobDescriptionText ? { jobDescription: jobApplication.jobDescriptionText } : undefined;
            const response = await analyzeCv(sectionData, jobContext);

            // Start polling for results
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
        if (!jobId || !jobApplication || !cvData) return false;

        setIsSaving(true);
        setSaveError(null);
        try {
            const updatePayload = {
                draftCvJson: cvData,
                draftCoverLetterText: coverLetterText,
            };

            await updateJob(jobId, updatePayload);
            console.log("Changes saved successfully");
            setJobApplication(prev => prev ? { ...prev, ...updatePayload } : null);
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
        } catch (error: any) {
            const errorMessage = error.response?.data instanceof Blob ?
                await error.response.data.text() :
                error.response?.data?.message || error.message || 'An unknown error occurred during download.';
            alert(`Failed to download ${filename}: ${errorMessage}`);
        }
    };

    if (isLoading) return <div className="text-center p-4 text-gray-900 dark:text-gray-300">Loading job details...</div>;
    if (fetchError) return <div className="text-center p-4 text-red-600 dark:text-red-400">Error: {fetchError}</div>;
    if (!jobApplication || !cvData) return <div className="text-center p-4 text-gray-900 dark:text-gray-300">Job application data not found.</div>;

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Review and Finalize: {jobApplication.jobTitle} at {jobApplication.companyName}</h1>

            {/* Job Details Section */}
            <div className="mb-6 p-4 border dark:border-gray-700 rounded shadow-sm bg-white dark:bg-gray-800">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Job Details</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">Company: {jobApplication.companyName}</p>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">Title: {jobApplication.jobTitle}</p>
                    </div>
                    <button
                        onClick={handleRefreshJobDetails}
                        disabled={isRefreshing || !jobApplication.jobUrl}
                        className="px-4 py-2 bg-blue-500 dark:bg-blue-700 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isRefreshing ? 'Refreshing...' : 'Refresh Job Details'}
                    </button>
                </div>
                {refreshError && <p className="text-red-500 dark:text-red-400 mb-2">{refreshError}</p>}
                <div className="mt-4">
                    <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Job Description:</h3>
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded max-h-60 overflow-y-auto text-gray-900 dark:text-gray-300">
                        {jobApplication.jobDescriptionText || 'No job description available.'}
                    </div>
                </div>
            </div>

            {/* CV Editor Section */}
            <div className="mb-6 p-4 border dark:border-gray-700 rounded shadow-sm bg-white dark:bg-gray-800">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit CV</h2>
                </div>
                {analyzeError && <p className="text-red-500 dark:text-red-400 mb-2">Analysis Error: {analyzeError}</p>}
                <CvFormEditor
                    data={cvData}
                    onChange={handleCvChange}
                    analysisResult={analysisResult}
                    onAnalyzeSection={handleAnalyzeSection}
                    analyzingSections={analyzingSections}
                />
            </div>

            {/* Cover Letter Editor Section */}
            <div className="mb-6 p-4 border dark:border-gray-700 rounded shadow-sm bg-white dark:bg-gray-800">
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">Edit Cover Letter</h2>
                <textarea
                    value={coverLetterText}
                    onChange={handleCoverLetterChange}
                    className="w-full h-64 p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Edit your cover letter here..."
                />
            </div>

            {/* Action Buttons */}
            <div className="mt-6 p-4 border dark:border-gray-700 rounded shadow-sm bg-white dark:bg-gray-800 flex flex-col items-start space-y-4">
                {saveError && <p className="text-red-500 dark:text-red-400">Save Error: {saveError}</p>}
                {renderError && <p className="text-red-500 dark:text-red-400">Render Error: {renderError}</p>}

                <div className="flex gap-4 flex-wrap">
                    <button
                        onClick={handleSaveChanges}
                        disabled={isSaving || isRenderingPdf}
                        className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>

                    <button
                        onClick={handleGenerateFinalPdfs}
                        disabled={isRenderingPdf || isSaving}
                        className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50"
                    >
                        {isRenderingPdf ? 'Generating PDFs...' : 'Generate Draft Documents'}
                    </button>
                </div>

                {/* Download Links/Buttons */}
                {(finalPdfFiles.cv || finalPdfFiles.cl) && (
                    <div className="flex gap-4 flex-wrap">
                        {finalPdfFiles.cv && (
                            <button
                                onClick={() => handleDownload(finalPdfFiles.cv)}
                                className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-800"
                            >
                                Download Final CV
                            </button>
                        )}
                        {finalPdfFiles.cl && (
                            <button
                                onClick={() => handleDownload(finalPdfFiles.cl)}
                                className="px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-800"
                            >
                                Download Final Cover Letter
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Back button */}
            <button
                onClick={() => navigate('/dashboard')}
                className="mt-6 px-4 py-2 rounded bg-gray-500 dark:bg-gray-700 hover:bg-gray-600 dark:hover:bg-gray-800 text-white font-semibold"
            >
                Back to Dashboard
            </button>
        </div>
    );
};

export default ReviewFinalizePage;