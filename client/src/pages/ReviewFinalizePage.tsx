// client/src/pages/ReviewFinalizePage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getJobById, updateJob, JobApplication, scrapeJobDescriptionApi, updateJobDraft } from '../services/jobApi';
import { renderFinalPdfs, renderCvPdf, renderCoverLetterPdf, getDownloadUrl, generateDocuments } from '../services/generatorApi';
import { analyzeCv, AnalysisResult, getAnalysis } from '../services/analysisApi';
import { scanAts, getAtsScores, getAtsForJob, AtsScores } from '../services/atsApi';
import { JsonResumeSchema } from '../../../server/src/types/jsonresume';
import CvFormEditor from '../components/cv-editor/CvFormEditor';
import { generateCoverLetter } from '../services/coverLetterApi';
import { getCurrentCv } from '../services/cvApi';
import { AtsFeedbackPanel } from '../components/ats';
import axios from 'axios';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorAlert from '../components/common/ErrorAlert';
import Spinner from '../components/common/Spinner';
import Toast from '../components/common/Toast';
import JobStatusBadge from '../components/jobs/JobStatusBadge';
import ProgressIndicator from '../components/jobs/ProgressIndicator';
import CoverLetterEditor from '../components/CoverLetterEditor';

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
    const [isRenderingCvPdf, setIsRenderingCvPdf] = useState<boolean>(false);
    const [isRenderingCoverLetterPdf, setIsRenderingCoverLetterPdf] = useState<boolean>(false);
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
    const [notes, setNotes] = useState<string>('');
    const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);
    const [toast, setToast] = useState<ToastState | null>(null);
    const [isJobDescriptionExpanded, setIsJobDescriptionExpanded] = useState<boolean>(false);
    const [atsScores, setAtsScores] = useState<AtsScores | null>(null);
    const [isLoadingAts, setIsLoadingAts] = useState<boolean>(false);
    const [isScanningAts, setIsScanningAts] = useState<boolean>(false);
    const [atsAnalysisId, setAtsAnalysisId] = useState<string | null>(null);
    const [atsPollingIntervalId, setAtsPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
    const [atsProgressMessage, setAtsProgressMessage] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'ai-review' | 'job-description' | 'cover-letter' | 'cv'>('ai-review');
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialLoadRef = useRef<boolean>(true);
    const lastSavedCvDataRef = useRef<string | null>(null);
    const lastSavedCoverLetterRef = useRef<string | null>(null);
    
    const ATS_POLLING_INTERVAL_MS = 3000; // Poll more frequently for ATS
    const ATS_POLLING_TIMEOUT_MS = 120000; // 2 minutes timeout
    const AUTO_SAVE_DELAY_MS = 2000; // Auto-save after 2 seconds of inactivity

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
            setNotes(data.notes || '');

            if (data.generatedCvFilename || data.generatedCoverLetterFilename) {
                setFinalPdfFiles({
                    cv: data.generatedCvFilename || null,
                    cl: data.generatedCoverLetterFilename || null
                });
            }

            // Initialize saved data refs to prevent unnecessary auto-saves
            lastSavedCvDataRef.current = JSON.stringify(data.draftCvJson || { basics: {} });
            lastSavedCoverLetterRef.current = data.draftCoverLetterText || '';

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

    // Reset initial load flag after data is loaded
    useEffect(() => {
        if (jobApplication && !isLoading) {
            // Small delay to ensure all data is set
            const timer = setTimeout(() => {
                isInitialLoadRef.current = false;
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [jobApplication, isLoading]);

    // Fetch existing ATS scores when job application is loaded
    useEffect(() => {
        const fetchExistingAtsScores = async () => {
            if (jobId && jobApplication) {
                setIsLoadingAts(true);
                try {
                    // Try to find existing ATS analysis for this job
                    const response = await getAtsForJob(jobId);
                    if (response.atsScores && response.analysisId) {
                        setAtsScores(response.atsScores);
                        setAtsAnalysisId(response.analysisId);
                        console.log(`[DEBUG Frontend] Found existing ATS scores for job ${jobId}`);
                    } else {
                        console.log(`[DEBUG Frontend] No existing ATS scores found for job ${jobId}`);
                    }
                } catch (error: any) {
                    console.error('Error fetching existing ATS scores:', error);
                    // Don't show error toast, just log it - ATS scores are optional
                } finally {
                    setIsLoadingAts(false);
                }
            }
        };

        if (jobApplication) {
            fetchExistingAtsScores();
        }
    }, [jobId, jobApplication]);

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
                showToast('ATS analysis completed successfully!', 'success');
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
                showToast('ATS analysis is taking longer than expected. Please try again later.', 'info');
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
        if (!jobApplication || !jobId) {
            showToast('Job application not loaded', 'error');
            return;
        }

        if (!hasMasterCv) {
            showToast('Please upload your master CV first', 'error');
            return;
        }

        if (!jobApplication.jobDescriptionText) {
            showToast('Please scrape the job description first', 'error');
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
            const response = await scanAts(jobId, atsAnalysisId || undefined);
            setAtsAnalysisId(response.analysisId);
            showToast('ATS scan started. Analyzing your CV...', 'info');
            
            const startTime = Date.now();
            
            // Set up interval polling
            const intervalId = setInterval(async () => {
                const result = await pollAtsScores(response.analysisId, startTime, intervalId);
                if (result) {
                    clearInterval(intervalId);
                    setAtsPollingIntervalId(null);
                }
            }, ATS_POLLING_INTERVAL_MS);
            
            setAtsPollingIntervalId(intervalId);
            
            // Start polling immediately
            const checkResult = await pollAtsScores(response.analysisId, startTime, intervalId);
            if (checkResult) {
                clearInterval(intervalId);
                setAtsPollingIntervalId(null);
            }
        } catch (error: any) {
            console.error('Error starting ATS scan:', error);
            showToast(error.message || 'Failed to start ATS scan.', 'error');
            setIsScanningAts(false);
            setAtsProgressMessage('');
        }
    };

    const handleCvChange = (updatedCv: JsonResumeSchema) => {
        setCvData(updatedCv);
    };

    const handleCoverLetterChange = (value: string) => {
        setCoverLetterText(value);
    };

    // Auto-save effect - debounced
    useEffect(() => {
        // Skip auto-save on initial load
        if (isInitialLoadRef.current || !jobId || !jobApplication) {
            return;
        }

        // Serialize current data for comparison
        const currentCvDataStr = JSON.stringify(cvData);
        const currentCoverLetterStr = coverLetterText;

        // Check if data has actually changed
        if (
            currentCvDataStr === lastSavedCvDataRef.current &&
            currentCoverLetterStr === lastSavedCoverLetterRef.current
        ) {
            // No changes, skip auto-save
            return;
        }

        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        // Set new timeout for auto-save
        autoSaveTimeoutRef.current = setTimeout(async () => {
            if (!jobId || !jobApplication) return;

            // Double-check data hasn't changed during the delay
            const cvDataStr = JSON.stringify(cvData);
            const coverLetterStr = coverLetterText;
            
            if (
                cvDataStr === lastSavedCvDataRef.current &&
                coverLetterStr === lastSavedCoverLetterRef.current
            ) {
                // Data hasn't changed, skip save
                return;
            }

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
                
                // Update refs with saved values
                lastSavedCvDataRef.current = JSON.stringify(cvData);
                lastSavedCoverLetterRef.current = coverLetterText;
                
                setJobApplication(prev => prev ? { ...prev, ...updatePayload } : null);
            } catch (error: any) {
                console.error("Error auto-saving changes:", error);
                setSaveError(error.message || 'Failed to save changes.');
            } finally {
                setIsSaving(false);
            }
        }, AUTO_SAVE_DELAY_MS);

        // Cleanup timeout on unmount or when dependencies change
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [cvData, coverLetterText, jobId, jobApplication]);

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
            
            // Update refs with saved values
            lastSavedCvDataRef.current = JSON.stringify(cvData);
            lastSavedCoverLetterRef.current = coverLetterText;
            
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
            // Ensure latest changes are saved before generating PDFs
            const updatePayload: any = {
                draftCvJson: cvData,
                draftCoverLetterText: coverLetterText,
            };

            if (cvData && typeof cvData === 'object' && Object.keys(cvData).length > 0 && coverLetterText && coverLetterText.trim().length > 0) {
                const currentStatus = jobApplication?.generationStatus;
                if (currentStatus !== 'finalized') {
                    updatePayload.generationStatus = 'draft_ready';
                }
            }

            await updateJob(jobId, updatePayload);
            setJobApplication(prev => prev ? { ...prev, ...updatePayload } : null);

            const result = await renderFinalPdfs(jobId);
            setFinalPdfFiles({ cv: result.cvFilename, cl: result.coverLetterFilename });
            setJobApplication(prev => prev ? { ...prev, generationStatus: 'finalized' } : null);
            showToast('PDFs generated successfully', 'success');
        } catch (error: any) {
            console.error("Error generating final PDFs:", error);
            setRenderError(error.message || 'Failed to generate final PDFs.');
        } finally {
            setIsRenderingPdf(false);
        }
    };

    const handleGenerateCvPdf = async () => {
        if (!jobId) return;

        setIsRenderingCvPdf(true);
        setRenderError(null);

        try {
            // Ensure latest CV changes are saved before generating PDF
            const updatePayload: any = {
                draftCvJson: cvData,
            };

            if (cvData && typeof cvData === 'object' && Object.keys(cvData).length > 0) {
                const currentStatus = jobApplication?.generationStatus;
                if (currentStatus !== 'finalized') {
                    updatePayload.generationStatus = 'draft_ready';
                }
            }

            await updateJob(jobId, updatePayload);
            setJobApplication(prev => prev ? { ...prev, ...updatePayload } : null);

            const result = await renderCvPdf(jobId);
            setFinalPdfFiles(prev => ({ ...prev, cv: result.cvFilename }));
            setJobApplication(prev => prev ? { ...prev, generationStatus: 'finalized', generatedCvFilename: result.cvFilename } : null);
            showToast('CV PDF generated successfully', 'success');
        } catch (error: any) {
            console.error("Error generating CV PDF:", error);
            setRenderError(error.message || 'Failed to generate CV PDF.');
        } finally {
            setIsRenderingCvPdf(false);
        }
    };

    const handleGenerateCoverLetterPdf = async () => {
        if (!jobId) return;

        setIsRenderingCoverLetterPdf(true);
        setRenderError(null);

        try {
            // Ensure latest cover letter changes are saved before generating PDF
            const updatePayload: any = {
                draftCoverLetterText: coverLetterText,
            };

            if (coverLetterText && coverLetterText.trim().length > 0) {
                const currentStatus = jobApplication?.generationStatus;
                if (currentStatus !== 'finalized') {
                    updatePayload.generationStatus = 'draft_ready';
                }
            }

            await updateJob(jobId, updatePayload);
            setJobApplication(prev => prev ? { ...prev, ...updatePayload } : null);

            const result = await renderCoverLetterPdf(jobId);
            setFinalPdfFiles(prev => ({ ...prev, cl: result.coverLetterFilename }));
            setJobApplication(prev => prev ? { ...prev, generationStatus: 'finalized', generatedCoverLetterFilename: result.coverLetterFilename } : null);
            showToast('Cover Letter PDF generated successfully', 'success');
        } catch (error: any) {
            console.error("Error generating Cover Letter PDF:", error);
            setRenderError(error.message || 'Failed to generate Cover Letter PDF.');
        } finally {
            setIsRenderingCoverLetterPdf(false);
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

    const handleSaveNotes = async () => {
        if (!jobId) return;
        setIsSavingNotes(true);
        try {
            const updatedJob = await updateJob(jobId, { notes });
            setJobApplication(prev => prev ? { ...prev, notes } : null);
            showToast('Notes saved successfully!', 'success');
        } catch (error: any) {
            console.error('Failed to save notes:', error);
            showToast(error.message || 'Failed to save notes.', 'error');
        } finally {
            setIsSavingNotes(false);
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

                {/* Job Details Section - Keep visible above tabs */}
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
                        </div>
                        
                        {/* Notes Section */}
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notes</h3>
                                <button
                                    onClick={handleSaveNotes}
                                    disabled={isSavingNotes}
                                    className="px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors flex items-center gap-2 text-sm"
                                >
                                    {isSavingNotes ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Save Notes
                                        </>
                                    )}
                                </button>
                            </div>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={6}
                                placeholder="Add your notes about this job application..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="flex -mb-px" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('ai-review')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'ai-review'
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                            >
                                AI Review
                            </button>
                            <button
                                onClick={() => setActiveTab('job-description')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'job-description'
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                            >
                                Job Description
                            </button>
                            <button
                                onClick={() => setActiveTab('cover-letter')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'cover-letter'
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                            >
                                Cover Letter
                            </button>
                            <button
                                onClick={() => setActiveTab('cv')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'cv'
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                            >
                                CV
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {/* Tab 1: AI Review */}
                        {activeTab === 'ai-review' && (
                            <div>
                                {jobApplication.jobDescriptionText ? (
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">ATS Analysis</h2>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                        Analyze your CV compatibility with this job's requirements
                                                    </p>
                                                </div>
                                            </div>
                                            {atsScores && !isScanningAts && (
                                                <button
                                                    onClick={handleScanAts}
                                                    disabled={isScanningAts || isLoadingAts || !hasMasterCv}
                                                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors text-sm"
                                                    title={!hasMasterCv ? 'Please upload your master CV first' : 'Rescan your CV'}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    Rescan
                                                </button>
                                            )}
                                        </div>
                                        
                                        {/* ATS Progress Indicator */}
                                        {isScanningAts && (
                                            <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                                                <div className="flex items-start gap-4">
                                                    <div className="flex-shrink-0">
                                                        <Spinner size="md" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                                                            {atsProgressMessage || 'Processing ATS analysis...'}
                                                        </p>
                                                        <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                                                            Analyzing your CV against the job requirements. This may take 30-60 seconds.
                                                        </p>
                                                        <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                                                            <div className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Empty State - No Scores */}
                                        {!atsScores && !isScanningAts && !isLoadingAts && (
                                            <div className="mb-6 p-8 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900/50 dark:to-blue-900/10 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-center">
                                                <div className="max-w-md mx-auto">
                                                    <div className="mb-4 flex justify-center">
                                                        <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                                            <svg className="w-12 h-12 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                                        Ready to Analyze Your CV?
                                                    </h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                                        Get instant insights into how well your CV matches this job's requirements. Our AI-powered ATS analysis will check:
                                                    </p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-left">
                                                        <div className="flex items-start gap-2">
                                                            <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span className="text-xs text-gray-700 dark:text-gray-300">Skill matching</span>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span className="text-xs text-gray-700 dark:text-gray-300">Keyword optimization</span>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span className="text-xs text-gray-700 dark:text-gray-300">ATS compliance</span>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span className="text-xs text-gray-700 dark:text-gray-300">Improvement tips</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={handleScanAts}
                                                        disabled={isScanningAts || isLoadingAts || !hasMasterCv}
                                                        className="px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2 font-semibold transition-all shadow-md hover:shadow-lg mx-auto"
                                                        title={!hasMasterCv ? 'Please upload your master CV first' : 'Start ATS analysis'}
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                                        </svg>
                                                        Start ATS Analysis
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {!hasMasterCv && !atsScores && (
                                            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                                <div className="flex items-start gap-3">
                                                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                    <div>
                                                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
                                                            Master CV Required
                                                        </p>
                                                        <p className="text-xs text-amber-700 dark:text-amber-400">
                                                            You need to upload your master CV first. Go to <Link to="/manage-cv" className="underline font-medium hover:text-amber-900 dark:hover:text-amber-300">CV Management</Link> to upload it.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Show ATS Analysis */}
                                        <AtsFeedbackPanel 
                                            atsScores={atsScores} 
                                            isLoading={isLoadingAts || isScanningAts} 
                                        />
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                                            Please scrape the job description first to enable ATS analysis.
                                        </p>
                                        <button
                                            onClick={handleRefreshJobDetails}
                                            disabled={isRefreshing || !jobApplication.jobUrl}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mx-auto"
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
                                )}
                            </div>
                        )}

                        {/* Tab 2: Job Description */}
                        {activeTab === 'job-description' && (
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Job Description</h2>
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

                                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-gray-900 dark:text-gray-300 whitespace-pre-wrap max-h-[calc(100vh-400px)] overflow-y-auto">
                                    {jobApplication.jobDescriptionText || (
                                        <p className="text-gray-500 dark:text-gray-400 italic">No job description available. Click "Refresh Job Details" to scrape it.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tab 3: Cover Letter */}
                        {activeTab === 'cover-letter' && (
                            <div>
                                {jobApplication.draftCoverLetterText ? (
                                    <>
                                        <div className="mb-4">
                                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Cover Letter</h2>
                                            
                                            {coverLetterError && (
                                                <div className="mb-4">
                                                    <ErrorAlert
                                                        message={coverLetterError}
                                                        onDismiss={() => setCoverLetterError(null)}
                                                    />
                                                </div>
                                            )}
                                            
                                            {/* Action buttons - grouped logically */}
                                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                                {/* Regenerate Cover Letter Text */}
                                                <button
                                                    onClick={handleGenerateCoverLetter}
                                                    disabled={isGeneratingCoverLetter || !jobApplication?.jobDescriptionText || !hasMasterCv}
                                                    className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow-md"
                                                    title={
                                                        !hasMasterCv
                                                            ? 'Please upload your master CV first'
                                                            : !jobApplication?.jobDescriptionText
                                                            ? 'Please scrape the job description first'
                                                            : 'Regenerate cover letter text with AI'
                                                    }
                                                >
                                                    {isGeneratingCoverLetter ? (
                                                        <>
                                                            <Spinner size="sm" />
                                                            <span>Regenerating...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                            Regenerate Cover Letter Text
                                                        </>
                                                    )}
                                                </button>
                                                
                                                {/* Download button - only shown when PDF exists */}
                                                {finalPdfFiles.cl && (
                                                    <>
                                                        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                                                        <button
                                                            onClick={() => handleDownload(finalPdfFiles.cl)}
                                                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-all font-medium shadow-sm hover:shadow-md"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            Download PDF
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="h-[calc(100vh-500px)] min-h-[600px] flex flex-col">
                                            <CoverLetterEditor
                                                value={coverLetterText}
                                                onChange={handleCoverLetterChange}
                                                placeholder="Edit your cover letter here..."
                                                className="h-full"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div>
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
                                )}
                            </div>
                        )}

                        {/* Tab 4: CV */}
                        {activeTab === 'cv' && (
                            <div>
                                {jobApplication.draftCvJson ? (
                                    <>
                                        <div className="mb-4">
                                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit CV</h2>
                                            
                                            {analyzeError && (
                                                <div className="mb-4">
                                                    <ErrorAlert
                                                        message={`Analysis Error: ${analyzeError}`}
                                                        onDismiss={() => setAnalyzeError(null)}
                                                    />
                                                </div>
                                            )}
                                            
                                            {/* Action buttons - grouped logically */}
                                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                                {/* Primary action: Generate/Regenerate PDF */}
                                                <button
                                                    onClick={handleGenerateCvPdf}
                                                    disabled={isRenderingCvPdf || isSaving || !jobApplication.draftCvJson}
                                                    className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow-md"
                                                >
                                                    {isRenderingCvPdf ? (
                                                        <>
                                                            <Spinner size="sm" />
                                                            <span>{finalPdfFiles.cv ? 'Regenerating...' : 'Generating...'}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            {finalPdfFiles.cv ? 'Regenerate PDF' : 'Generate PDF'}
                                                        </>
                                                    )}
                                                </button>
                                                
                                                {/* Download button - only shown when PDF exists */}
                                                {finalPdfFiles.cv && (
                                                    <>
                                                        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                                                        <button
                                                            onClick={() => handleDownload(finalPdfFiles.cv)}
                                                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-all font-medium shadow-sm hover:shadow-md"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            Download PDF
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {cvData && (
                                            <CvFormEditor
                                                data={cvData}
                                                onChange={handleCvChange}
                                                analysisResult={analysisResult}
                                                onAnalyzeSection={handleAnalyzeSection}
                                                analyzingSections={analyzingSections}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <div>
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
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Sticky Action Bar */}
            {jobApplication.draftCvJson && jobApplication.draftCoverLetterText && (
                <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-30">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                            <div className="flex-1 flex items-center gap-3">
                                {isSaving && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Spinner size="sm" />
                                        <span>Saving...</span>
                                    </div>
                                )}
                                {saveError && (
                                    <ErrorAlert
                                        message={`Save Error: ${saveError}`}
                                        onDismiss={() => setSaveError(null)}
                                    />
                                )}
                                {renderError && (
                                    <ErrorAlert
                                        message={`Render Error: ${renderError}`}
                                        onDismiss={() => setRenderError(null)}
                                    />
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
