// client/src/pages/ReviewFinalizePage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { updateCustomPrompts } from '../services/settingsApi';
import { getJobById, updateJob, JobApplication, scrapeJobDescriptionApi, updateJobDraft, getJobsWithCvs } from '../services/jobApi';
import { renderFinalPdfs, renderCvPdf, renderCoverLetterPdf, getDownloadUrl, generateDocuments, generateCvOnly } from '../services/generatorApi';
import { analyzeCv, AnalysisResult, getAnalysis } from '../services/analysisApi';
import { scanAts, getAtsScores, getAtsForJob, AtsScores } from '../services/atsApi';
import { JsonResumeSchema } from '../../../server/src/types/jsonresume';
import CvFormEditor from '../components/cv-editor/CvFormEditor';
import CvLivePreview from '../components/cv-editor/CvLivePreview';
import { DEFAULT_CV_PROMPT, DEFAULT_COVER_LETTER_PROMPT } from '../constants/prompts';
import { getAllTemplates, TemplateConfig } from '../templates/config';
import { generateCoverLetter } from '../services/coverLetterApi';
import { getCurrentCv, previewCv } from '../services/cvApi';
import { AtsFeedbackPanel } from '../components/ats';
import AtsReportView from '../components/ats/AtsReportView';
import CvPreviewModal from '../components/cv-editor/CvPreviewModal';
import axios from 'axios';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorAlert from '../components/common/ErrorAlert';
import Spinner from '../components/common/Spinner';
import Toast from '../components/common/Toast';
import JobStatusBadge from '../components/jobs/JobStatusBadge';
import CoverLetterEditor from '../components/CoverLetterEditor';
import { JobChatWindow, FloatingChatButton } from '../components/chat';
import PromptCustomizer from '../components/common/PromptCustomizer';
import { PromptTemplateSelector } from '../components/common/PromptTemplateSelector';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

interface ToastState {
    message: string;
    type: 'success' | 'error' | 'info';
}

const ReviewFinalizePage: React.FC = () => {
    const { jobId, tab } = useParams<{ jobId: string; tab?: string }>();
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
    const [notesSaveStatus, setNotesSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [notesHasChanged, setNotesHasChanged] = useState<boolean>(false);
    const [originalNotes, setOriginalNotes] = useState<string>('');
    const [toast, setToast] = useState<ToastState | null>(null);
    const [isJobDescriptionExpanded, setIsJobDescriptionExpanded] = useState<boolean>(false);
    const [atsScores, setAtsScores] = useState<AtsScores | null>(null);
    const [isLoadingAts, setIsLoadingAts] = useState<boolean>(false);
    const [isScanningAts, setIsScanningAts] = useState<boolean>(false);
    const [atsAnalysisId, setAtsAnalysisId] = useState<string | null>(null);
    const [atsPollingIntervalId, setAtsPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
    const [atsProgressMessage, setAtsProgressMessage] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'ai-review' | 'job-description' | 'cover-letter' | 'cv'>(() => {
        // Priority 1: URL Param
        if (tab && ['ai-review', 'job-description', 'cover-letter', 'cv'].includes(tab)) {
            return tab as any;
        }
        // Priority 2: Local Storage
        if (jobId) {
            try {
                const saved = localStorage.getItem(`job_tab_${jobId}`);
                if (saved && ['ai-review', 'job-description', 'cover-letter', 'cv'].includes(saved)) {
                    return saved as any;
                }
            } catch (e) {
                console.error("Error reading tab from localStorage", e);
            }
        }
        // Priority 3: Default
        return 'job-description';
    });

    const handleTabChange = (newTab: 'ai-review' | 'job-description' | 'cover-letter' | 'cv') => {
        // setActiveTab(newTab); // Not needed as we rely on URL change or we can do optimistic update
        // Let's do optimistic update + navigation
        setActiveTab(newTab);
        if (jobId) {
            localStorage.setItem(`job_tab_${jobId}`, newTab);
            navigate(`/jobs/${jobId}/review/${newTab}`);
        }
    };

    // Update active tab when URL param changes
    useEffect(() => {
        if (tab && ['ai-review', 'job-description', 'cover-letter', 'cv'].includes(tab)) {
            setActiveTab(tab as any);
        } else if (!tab && jobId) {
            // If no tab in URL, check localStorage or default logic (though initial state handles this, 
            // this handles navigation from /review/cv to /review)
            // But actually, we probably want to Redirect /review to /review/job-description or whatever is saved?
            // For now, let's just stick to what `activeTab` is if tab is invalid or missing, to avoid loops
        }
    }, [tab]);

    // Update active tab when switching jobs (if component doesn't unmount) - keeping existing logic but ensuring it respects URL first
    useEffect(() => {
        if (jobId && !tab) { // Only checking localStorage if no tab param is provided
            const saved = localStorage.getItem(`job_tab_${jobId}`);
            if (saved && ['ai-review', 'job-description', 'cover-letter', 'cv'].includes(saved)) {
                setActiveTab(saved as any);
            } else {
                setActiveTab('job-description');
            }
        }
    }, [jobId]);
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialLoadRef = useRef<boolean>(true);
    const lastSavedCvDataRef = useRef<string | null>(null);
    const lastSavedCoverLetterRef = useRef<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
    const [previewPdfBase64, setPreviewPdfBase64] = useState<string | null>(null);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState<boolean>(false);
    const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
    const [cvViewMode, setCvViewMode] = useState<'edit' | 'preview' | 'split'>('split');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('modern-clean');
    const [availableTemplates, setAvailableTemplates] = useState<TemplateConfig[]>([]);

    // Tailor Job CV Form State
    const [tailoredJobTitle, setTailoredJobTitle] = useState<string>('');
    const [tailoredCompanyName, setTailoredCompanyName] = useState<string>('');
    const [tailoredJobDescription, setTailoredJobDescription] = useState<string>('');
    const [customInstructions, setCustomInstructions] = useState<string>('');
    const [clCustomInstructions, setClCustomInstructions] = useState<string>('');
    // Base CV Selection State
    const [availableCvs, setAvailableCvs] = useState<{ id: string; name: string; data: any }[]>([]);
    const [selectedBaseCvId, setSelectedBaseCvId] = useState<string>('master');
    const [selectedClBaseCvId, setSelectedClBaseCvId] = useState<string>('master');

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
            const notesData = data.notes || '';
            setNotes(notesData);
            setOriginalNotes(notesData);
            setNotesHasChanged(false);

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

    // Sync state with jobApplication for the Tailor Form
    useEffect(() => {
        if (jobApplication) {
            setTailoredJobTitle(jobApplication.jobTitle || '');
            setTailoredCompanyName(jobApplication.companyName || '');
            setTailoredJobDescription(jobApplication.jobDescriptionText || '');
        }
    }, [jobApplication]);

    // Fetch Available CVs (Master + Other Jobs)
    useEffect(() => {
        const loadCvs = async () => {
            try {
                const [cvResponse, jobs] = await Promise.all([
                    getCurrentCv(),
                    getJobsWithCvs()
                ]);

                const options: { id: string; name: string; data: any }[] = [];

                // Add Master CV
                if (cvResponse.cvData) {
                    const masterName = cvResponse.cvFilename
                        ? `Master CV (${cvResponse.cvFilename})`
                        : 'Master CV (Default)';
                    options.push({ id: 'master', name: masterName, data: cvResponse.cvData });
                }

                // Add Job CVs
                jobs.forEach(job => {
                    // Exclude current job from options (optional, but logical since we are generating FOR this job)
                    if (job._id !== jobId) {
                        options.push({
                            id: job._id,
                            name: `${job.jobTitle} at ${job.companyName}`,
                            data: job.draftCvJson
                        });
                    }
                });
                setAvailableCvs(options);
            } catch (err) {
                console.error("Failed to load CVs", err);
            }
        };
        loadCvs();
    }, [jobId]);

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

    // Load available templates
    useEffect(() => {
        setAvailableTemplates(getAllTemplates());
    }, []);

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

    const handlePreviewCv = async () => {
        if (!cvData || !jobApplication?.draftCvJson) {
            showToast('No CV data available to preview.', 'error');
            return;
        }

        setIsGeneratingPreview(true);
        try {
            const response = await previewCv(cvData);
            setPreviewPdfBase64(response.pdfBase64);
            setIsPreviewOpen(true);
        } catch (error: any) {
            console.error("Error generating CV preview:", error);
            showToast(error.message || 'Failed to generate CV preview.', 'error');
        } finally {
            setIsGeneratingPreview(false);
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
            // 1. Update Job Details if changed (using the tailored fields)
            if (
                tailoredJobTitle !== jobApplication.jobTitle ||
                tailoredCompanyName !== jobApplication.companyName ||
                tailoredJobDescription !== jobApplication.jobDescriptionText
            ) {
                await updateJob(jobId, {
                    jobTitle: tailoredJobTitle,
                    companyName: tailoredCompanyName,
                    jobDescriptionText: tailoredJobDescription
                });
                // Update local state to reflect saved
                setJobApplication(prev => prev ? ({
                    ...prev,
                    jobTitle: tailoredJobTitle,
                    companyName: tailoredCompanyName,
                    jobDescriptionText: tailoredJobDescription
                }) : null);
            }

            if (!tailoredJobDescription) {
                setCoverLetterError('Please provide a job description.');
                return;
            }

            if (!hasMasterCv) {
                setCoverLetterError('Please upload your master CV first at the CV Management page.');
                return;
            }

            // 2. Update Custom Prompt with Instructions
            if (clCustomInstructions) {
                const fullPrompt = DEFAULT_COVER_LETTER_PROMPT + "\n\n**USER INSTRUCTIONS:**\n" + clCustomInstructions;
                await updateCustomPrompts({ coverLetterPrompt: fullPrompt });
            } else {
                await updateCustomPrompts({ coverLetterPrompt: null });
            }

            const language = jobApplication.language || 'en';

            // Determine Base CV Data for Cover Letter
            let baseCvDataToUse = undefined;
            if (selectedClBaseCvId !== 'master') {
                const selectedOption = availableCvs.find(cv => cv.id === selectedClBaseCvId);
                if (selectedOption) {
                    baseCvDataToUse = selectedOption.data;
                }
            }

            const generatedText = await generateCoverLetter(jobId, language as 'en' | 'de', baseCvDataToUse);

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

    const handleDownloadWord = async () => {
        if (!coverLetterText || !jobApplication) return;

        try {
            // Split text by newlines to create paragraphs
            const paragraphs = coverLetterText.split('\n').map(line => {
                return new Paragraph({
                    children: [
                        new TextRun({
                            text: line,
                            font: "Calibri",
                            size: 24, // 12pt
                        }),
                    ],
                    spacing: {
                        after: 0, // Minimize spacing to look like plain text lines unless double newline
                    }
                });
            });

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: paragraphs,
                }],
            });

            const blob = await Packer.toBlob(doc);

            // Filename generation
            const sanitize = (str: string) => str?.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_') || 'Unknown';
            const companyName = sanitize(jobApplication.companyName || 'Company');
            const docType = (jobApplication.language === 'de') ? 'Anschreiben' : 'Cover_Letter';
            const filename = `${docType}_${companyName}.docx`;

            saveAs(blob, filename);
            showToast('Word document downloaded', 'success');
        } catch (error: any) {
            console.error('Error generating Word document:', error);
            showToast('Failed to generate Word document', 'error');
        }
    };

    const handleGenerateSpecificCv = async () => {
        if (!jobId || !jobApplication) return;

        setIsGeneratingCv(true);
        setGenerateCvError(null);

        try {
            // 1. Update Job Details if changed
            if (
                tailoredJobTitle !== jobApplication.jobTitle ||
                tailoredCompanyName !== jobApplication.companyName ||
                tailoredJobDescription !== jobApplication.jobDescriptionText
            ) {
                await updateJob(jobId, {
                    jobTitle: tailoredJobTitle,
                    companyName: tailoredCompanyName,
                    jobDescriptionText: tailoredJobDescription
                });
                // Update local state to reflect saved
                setJobApplication(prev => prev ? ({
                    ...prev,
                    jobTitle: tailoredJobTitle,
                    companyName: tailoredCompanyName,
                    jobDescriptionText: tailoredJobDescription
                }) : null);
            }

            if (!tailoredJobDescription) {
                setGenerateCvError('Please provide a job description.');
                return;
            }

            if (!hasMasterCv) {
                setGenerateCvError('Please upload your master CV first at the CV Management page.');
                return;
            }

            // 2. Update Custom Prompt with Instructions
            // We append the custom instructions to the default prompt
            if (customInstructions) {
                const fullPrompt = DEFAULT_CV_PROMPT + "\n\n**USER INSTRUCTIONS:**\n" + customInstructions;
                await updateCustomPrompts({ cvPrompt: fullPrompt });
            } else {
                // Reset to default if empty (optional, but good practice to ensure clean state)
                // Or we could just not update it, but the user might want to clear previous instructions
                // Let's reset it to null to use system default if user cleared the box
                await updateCustomPrompts({ cvPrompt: null });
            }

            const language = jobApplication.language || 'en';

            // Determine Base CV Data
            let baseCvDataToUse = undefined;
            if (selectedBaseCvId !== 'master') {
                const selectedOption = availableCvs.find(cv => cv.id === selectedBaseCvId);
                if (selectedOption) {
                    baseCvDataToUse = selectedOption.data;
                }
            }

            const response = await generateCvOnly(jobId, language as 'en' | 'de', baseCvDataToUse);

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

    const handleSaveNotes = async (notesToSave: string) => {
        if (!jobId) return;
        setIsSavingNotes(true);
        setNotesSaveStatus('saving');
        try {
            const updatedJob = await updateJob(jobId, { notes: notesToSave });
            setJobApplication(prev => prev ? { ...prev, notes: notesToSave } : null);
            setOriginalNotes(notesToSave);
            setNotesHasChanged(false);
            setNotesSaveStatus('saved');
            // Clear saved status after 2 seconds
            setTimeout(() => {
                setNotesSaveStatus('idle');
            }, 2000);
        } catch (error: any) {
            console.error('Failed to save notes:', error);
            setNotesSaveStatus('error');
            showToast(error.message || 'Failed to save notes.', 'error');
            // Clear error status after 3 seconds
            setTimeout(() => {
                setNotesSaveStatus('idle');
            }, 3000);
        } finally {
            setIsSavingNotes(false);
        }
    };

    // Handle notes change and show save button when text changes
    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newNotes = e.target.value;
        setNotes(newNotes);
        setNotesHasChanged(newNotes !== originalNotes);
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
                label: 'Cover Letter Generated',
                completed: !!jobApplication.draftCoverLetterText,
            },
            {
                label: 'AI Review',
                completed: !!atsScores,
            },
        ];
    };

    // Format date helper with relative time
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

            // For older dates, show full date
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return 'N/A';
        }
    };

    // Get full date for tooltip
    const getFullDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
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
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {jobApplication.jobTitle}
                        </h1>
                        <JobStatusBadge type="application" status={jobApplication.status} />

                    </div>
                    <div className="flex items-center gap-2 text-base text-slate-600 dark:text-slate-400 mb-4">
                        <span>{jobApplication.companyName}</span>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <span className="text-sm">Created: {formatDate(jobApplication.createdAt)}</span>
                    </div>
                </div>



                {/* Tabs Navigation with Integrated Progress Indicators */}
                <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <div className="relative flex items-center justify-between w-full max-w-4xl mx-auto">
                        <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-200 dark:bg-gray-700 -z-10 transform -translate-y-1/2"></div>

                        {/* Tab 1: Job Details */}
                        <button
                            onClick={() => handleTabChange('job-description')}
                            className="group flex flex-col items-center focus:outline-none"
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-gray-800 transition-all duration-200 ${activeTab === 'job-description'
                                ? 'bg-primary text-white shadow-lg scale-125'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}>
                                <span className="material-symbols-outlined text-sm">check</span>
                            </div>
                            <span className={`text-xs font-medium mt-2 transition-colors duration-200 ${activeTab === 'job-description'
                                ? 'text-primary font-bold'
                                : 'text-gray-500 dark:text-gray-400'
                                }`}>Job Details</span>
                        </button>

                        {/* Tab 2: CV Generated */}
                        <button
                            onClick={() => handleTabChange('cv')}
                            className="group flex flex-col items-center focus:outline-none"
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-gray-800 transition-all duration-200 ${activeTab === 'cv'
                                ? 'bg-primary text-white shadow-lg scale-125'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}>
                                <span className="material-symbols-outlined text-sm">article</span>
                            </div>
                            <span className={`text-xs font-medium mt-2 transition-colors duration-200 ${activeTab === 'cv'
                                ? 'text-primary font-bold'
                                : 'text-gray-500 dark:text-gray-400'
                                }`}>CV Generated</span>
                        </button>

                        {/* Tab 3: Cover Letter */}
                        <button
                            onClick={() => handleTabChange('cover-letter')}
                            className="group flex flex-col items-center focus:outline-none"
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-gray-800 transition-all duration-200 ${activeTab === 'cover-letter'
                                ? 'bg-primary text-white shadow-lg scale-125'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}>
                                <span className="material-symbols-outlined text-sm">mail</span>
                            </div>
                            <span className={`text-xs font-medium mt-2 transition-colors duration-200 ${activeTab === 'cover-letter'
                                ? 'text-primary font-bold'
                                : 'text-gray-500 dark:text-gray-400'
                                }`}>Cover Letter</span>
                        </button>

                        {/* Tab 4: AI Review */}
                        <button
                            onClick={() => handleTabChange('ai-review')}
                            className="group flex flex-col items-center focus:outline-none"
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-gray-800 transition-all duration-200 ${activeTab === 'ai-review'
                                ? 'bg-primary text-white shadow-lg scale-125'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}>
                                <span className="material-symbols-outlined text-sm">smart_toy</span>
                            </div>
                            <span className={`text-xs font-medium mt-2 transition-colors duration-200 ${activeTab === 'ai-review'
                                ? 'text-primary font-bold'
                                : 'text-gray-500 dark:text-gray-400'
                                }`}>AI Review</span>
                        </button>
                    </div>
                </div>      {/* Tab Content */}
                <div className="p-6">
                    {/* Tab 1: AI Review with ATS Report */}
                    {activeTab === 'ai-review' && (
                        <div>
                            {/* Header with Scan ATS button */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700 mb-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">ATS Analysis</h2>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleScanAts}
                                            disabled={isScanningAts || !jobApplication?.jobDescriptionText || !hasMasterCv}
                                            className="group flex items-center gap-2.5 px-4 py-2.5 bg-blue-600 dark:bg-blue-600 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-700 active:bg-blue-800 dark:active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 dark:disabled:hover:bg-blue-600 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md"
                                            title={!hasMasterCv ? 'Please upload your master CV first' : !jobApplication?.jobDescriptionText ? 'Please scrape the job description first' : 'Run ATS analysis'}
                                        >
                                            {isScanningAts ? (
                                                <>
                                                    <Spinner size="sm" />
                                                    <span>{atsProgressMessage || 'Analyzing...'}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                                    </svg>
                                                    <span>{atsScores ? 'Re-scan ATS' : 'Scan ATS'}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Loading state */}
                            {isLoadingAts && (
                                <div className="flex items-center justify-center py-12">
                                    <Spinner size="lg" />
                                    <span className="ml-3 text-gray-600 dark:text-gray-400">Loading ATS scores...</span>
                                </div>
                            )}

                            {/* No ATS scores yet */}
                            {!isLoadingAts && !atsScores && !isScanningAts && (
                                <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
                                        <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 text-center">
                                        ATS Compatibility Analysis
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
                                        Run an ATS scan to see how well your CV matches this job's requirements. Get actionable feedback to improve your match score.
                                    </p>
                                    {!hasMasterCv && (
                                        <p className="text-amber-600 dark:text-amber-400 text-sm mb-4">
                                            ⚠️ Please upload your master CV first on the <Link to="/manage-cv" className="underline">CV Management page</Link>.
                                        </p>
                                    )}
                                    {hasMasterCv && !jobApplication?.jobDescriptionText && (
                                        <p className="text-amber-600 dark:text-amber-400 text-sm mb-4">
                                            ⚠️ Please scrape the job description first using the "Refresh Job Details" button.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* ATS Report */}
                            {!isLoadingAts && atsScores && (
                                <AtsReportView
                                    atsScores={atsScores}
                                    onEditCv={() => {
                                        handleTabChange('cv');
                                        setCvViewMode('edit');
                                    }}
                                    onDownloadReport={() => {
                                        showToast('Downloading report...', 'info');
                                    }}
                                />
                            )}
                        </div>
                    )}

                    {/* Tab 2: Job Description */}
                    {activeTab === 'job-description' && (
                        <div className="max-w-7xl mx-auto">
                            <div className="max-w-5xl mx-auto space-y-6">

                                {/* Highlights Card */}
                                <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="material-symbols-outlined text-primary">lightbulb</span>
                                        <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">Key Highlights</h2>
                                    </div>
                                    <ul className="space-y-3">

                                        {jobApplication.extractedData?.location && (
                                            <li className="flex items-start gap-3">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                                                <span className="text-sm text-text-sub-light dark:text-text-sub-dark">
                                                    <strong className="text-text-main-light dark:text-text-main-dark">Location:</strong> {jobApplication.extractedData.location}
                                                </span>
                                            </li>
                                        )}
                                        {jobApplication.extractedData?.salaryRaw && (
                                            <li className="flex items-start gap-3">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                                                <span className="text-sm text-text-sub-light dark:text-text-sub-dark">
                                                    <strong className="text-text-main-light dark:text-text-main-dark">Salary Estimate:</strong> {jobApplication.extractedData.salaryRaw}
                                                </span>
                                            </li>
                                        )}
                                        {jobApplication.extractedData?.keyDetails && (
                                            Array.isArray(jobApplication.extractedData.keyDetails) ? (
                                                jobApplication.extractedData.keyDetails.map((item, idx) => (
                                                    <li key={idx} className="flex items-start gap-3">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                                                        <span className="text-sm text-text-sub-light dark:text-text-sub-dark">
                                                            <strong className="text-text-main-light dark:text-text-main-dark">{item.key}:</strong> {item.value}
                                                        </span>
                                                    </li>
                                                ))
                                            ) : (
                                                (jobApplication.extractedData.keyDetails as string).split('\n').filter(line => line.trim()).map((line, idx) => (
                                                    <li key={idx} className="flex items-start gap-3">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                                                        <span className="text-sm text-text-sub-light dark:text-text-sub-dark leading-relaxed">
                                                            {line.replace(/^[\*\-]\s*/, '')}
                                                        </span>
                                                    </li>
                                                ))
                                            )
                                        )}
                                        {jobApplication.jobUrl && (
                                            <li className="flex items-start gap-3">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                                                <span className="text-sm text-text-sub-light dark:text-text-sub-dark">
                                                    <a href={jobApplication.jobUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                        View Original Job Posting
                                                    </a>
                                                </span>
                                            </li>
                                        )}
                                    </ul>
                                </div>

                                {/* Notes Card */}
                                <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 relative">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">Notes</h2>
                                        <button
                                            onClick={() => handleSaveNotes(notes)}
                                            disabled={!notesHasChanged || isSavingNotes}
                                            className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primaryLight focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all ${notesHasChanged || notesSaveStatus === 'saved' ? 'opacity-100' : 'opacity-0'}`}
                                        >
                                            {notesSaveStatus === 'saved' ? (
                                                <><span className="material-symbols-outlined text-sm mr-1">check</span> Saved</>
                                            ) : (
                                                <><span className="material-symbols-outlined text-sm mr-1">save</span> Save</>
                                            )}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <textarea
                                            value={notes}
                                            onChange={handleNotesChange}
                                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-text-main-light dark:text-text-main-dark shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-3 placeholder-gray-400 dark:placeholder-gray-500"
                                            placeholder="Start typing your notes here..."
                                            rows={4}
                                        ></textarea>
                                        <div className="absolute bottom-2 right-2 pointer-events-none">
                                            <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-xl">edit_note</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Description Card */}
                                <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">Description</h2>
                                        {!isRefreshing && (
                                            <button
                                                onClick={handleRefreshJobDetails}
                                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                                            >
                                                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                                Extract Job Details
                                            </button>
                                        )}
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

                                    <div className={`custom-scrollbar overflow-y-auto pr-2 text-sm text-text-main-light dark:text-text-main-dark leading-relaxed space-y-4 ${isJobDescriptionExpanded ? 'max-h-none' : 'max-h-[500px]'}`}>
                                        {jobApplication.jobDescriptionText ? (
                                            <div className="whitespace-pre-wrap">
                                                {jobApplication.jobDescriptionText}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                                <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">description</span>
                                                <p className="text-text-sub-light dark:text-text-sub-dark mb-4">No job description available.</p>
                                                {!isRefreshing && (
                                                    <button
                                                        onClick={handleRefreshJobDetails}
                                                        className="text-primary hover:underline text-sm"
                                                    >
                                                        Click here to scrape from URL
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {jobApplication.jobDescriptionText && (
                                        <div className="mt-4 flex justify-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <button
                                                onClick={() => setIsJobDescriptionExpanded(!isJobDescriptionExpanded)}
                                                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
                                            >
                                                {isJobDescriptionExpanded ? 'Show less' : 'Read full description'}
                                                <span className="material-symbols-outlined text-base">
                                                    {isJobDescriptionExpanded ? 'expand_less' : 'expand_more'}
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Cover Letter */}
                    {activeTab === 'cover-letter' && (
                        <div>
                            {jobApplication.draftCoverLetterText ? (
                                <>
                                    <div className="mb-4">
                                        {/* Grey rounded card containing title and buttons */}
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700 mb-4">
                                            <div className="flex items-center justify-between">
                                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit Cover Letter</h2>

                                                {/* Action buttons - positioned on the right */}
                                                <div className="flex items-center gap-3">
                                                    {/* Regenerate Cover Letter Text */}
                                                    <button
                                                        onClick={handleGenerateCoverLetter}
                                                        disabled={isGeneratingCoverLetter || !jobApplication?.jobDescriptionText || !hasMasterCv}
                                                        className="group flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800/50 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow"
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
                                                                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                </svg>
                                                                <span>Regenerate Cover Letter Text</span>
                                                            </>
                                                        )}
                                                    </button>

                                                    {/* Download Buttons Group */}
                                                    <div className="flex items-center gap-2">
                                                        {/* Download PDF Button */}
                                                        <button
                                                            onClick={finalPdfFiles.cl ? () => handleDownload(finalPdfFiles.cl) : handleGenerateCoverLetterPdf}
                                                            disabled={isRenderingCoverLetterPdf}
                                                            className="group flex items-center gap-2 px-3 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 active:bg-blue-800 dark:active:bg-blue-800 transition-all duration-200 font-medium text-xs shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                                                            title="Download as PDF"
                                                        >
                                                            {isRenderingCoverLetterPdf ? (
                                                                <Spinner size="sm" />
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                </svg>
                                                            )}
                                                            <span>PDF</span>
                                                        </button>

                                                        {/* Download Word Button */}
                                                        <button
                                                            onClick={handleDownloadWord}
                                                            className="group flex items-center gap-2 px-3 py-2 bg-blue-500 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-600 active:bg-blue-700 dark:active:bg-blue-700 transition-all duration-200 font-medium text-xs shadow-sm hover:shadow-md"
                                                            title="Download as Word Document"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                            </svg>
                                                            <span>Word</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {coverLetterError && (
                                            <div className="mb-4">
                                                <ErrorAlert
                                                    message={coverLetterError}
                                                    onDismiss={() => setCoverLetterError(null)}
                                                />
                                            </div>
                                        )}

                                        <div className="mb-4">
                                            <PromptCustomizer
                                                key="cl-customizer-edit"
                                                type="coverLetter"
                                                defaultPrompt={DEFAULT_COVER_LETTER_PROMPT}
                                            />
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
                                    <div className="mb-6">
                                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Create Cover Letter</h2>
                                        <p className="text-gray-600 dark:text-gray-400 text-lg">
                                            Generate a tailored cover letter in seconds. Review the job details and add any specific instructions below.
                                        </p>
                                    </div>

                                    {coverLetterError && (
                                        <div className="mb-6">
                                            <ErrorAlert
                                                message={coverLetterError}
                                                onDismiss={() => setCoverLetterError(null)}
                                            />
                                        </div>
                                    )}

                                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 space-y-8">
                                        {/* Target Role Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">work</span>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Target Role</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Job Title
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={tailoredJobTitle}
                                                        onChange={(e) => setTailoredJobTitle(e.target.value)}
                                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 dark:text-gray-100"
                                                        placeholder="e.g. Senior Product Manager"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Company Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={tailoredCompanyName}
                                                        onChange={(e) => setTailoredCompanyName(e.target.value)}
                                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 dark:text-gray-100"
                                                        placeholder="e.g. Acme Innovations"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Job Description Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">description</span>
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Job Description</h3>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <textarea
                                                    value={tailoredJobDescription}
                                                    onChange={(e) => setTailoredJobDescription(e.target.value)}
                                                    className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 dark:text-gray-100 min-h-[200px]"
                                                    placeholder="Paste the full job description here... Our AI will analyze key requirements."
                                                ></textarea>
                                            </div>
                                        </div>

                                        {/* Base Resume Selection */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">folder</span>
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Base Resume</h3>
                                                </div>
                                                <div className="relative">
                                                    <select
                                                        value={selectedClBaseCvId}
                                                        onChange={(e) => setSelectedClBaseCvId(e.target.value)}
                                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 appearance-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                                    >
                                                        {availableCvs.map(cv => (
                                                            <option key={cv.id} value={cv.id}>{cv.name}</option>
                                                        ))}
                                                        {availableCvs.length === 0 && <option value="master">Loading CVs...</option>}
                                                    </select>
                                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                                        <span className="material-symbols-outlined">expand_more</span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Select the CV version to use for this cover letter.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Custom Instructions */}
                                        <PromptTemplateSelector
                                            type="coverLetter"
                                            value={clCustomInstructions}
                                            onChange={setClCustomInstructions}
                                            label="Custom Instructions"
                                            placeholder="e.g. Focus on my project management skills and keep the tone professional..."
                                            defaultContent={DEFAULT_COVER_LETTER_PROMPT}
                                        />

                                        {/* Footer Actions */}
                                        <div className="mt-8 flex items-center justify-end gap-4">
                                            <button
                                                onClick={() => navigate('/dashboard')}
                                                className="px-6 py-2.5 text-gray-600 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleGenerateCoverLetter}
                                                disabled={isGeneratingCoverLetter || !hasMasterCv || !tailoredJobDescription}
                                                className="group relative flex items-center gap-2 px-8 py-3 bg-purple-600 dark:bg-purple-600 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-700 active:bg-purple-800 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                            >
                                                {isGeneratingCoverLetter ? (
                                                    <>
                                                        <Spinner size="sm" className="text-white" />
                                                        <span>Generating...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-white">auto_awesome</span>
                                                        <span>Generate Cover Letter</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {!hasMasterCv && (
                                            <div className="mt-4 text-center">
                                                <p className="text-sm text-amber-600 dark:text-amber-400">
                                                    ⚠️ You need to upload your master CV first. Go to <Link to="/manage-cv" className="underline font-medium">CV Management</Link> to upload it.
                                                </p>
                                            </div>
                                        )}
                                    </div>
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
                                        {/* Grey rounded card containing title, view mode toggle, and buttons */}
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700 mb-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit CV</h2>

                                                    {/* View Mode Toggle */}
                                                    <div className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                                                        <button
                                                            onClick={() => setCvViewMode('edit')}
                                                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${cvViewMode === 'edit' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => setCvViewMode('split')}
                                                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${cvViewMode === 'split' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                                                        >
                                                            Split
                                                        </button>
                                                        <button
                                                            onClick={() => setCvViewMode('preview')}
                                                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${cvViewMode === 'preview' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                                                        >
                                                            Preview
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Action buttons - positioned on the right */}
                                                <div className="flex items-center gap-3">
                                                    {/* Template Selection */}
                                                    {availableTemplates.length > 0 && (
                                                        <select
                                                            value={selectedTemplate}
                                                            onChange={(e) => setSelectedTemplate(e.target.value)}
                                                            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        >
                                                            {availableTemplates.map((template) => (
                                                                <option key={template.id} value={template.id}>
                                                                    {template.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}

                                                    {/* Download button - only shown when PDF exists */}
                                                    {finalPdfFiles.cv && (
                                                        <button
                                                            onClick={() => handleDownload(finalPdfFiles.cv)}
                                                            className="group flex items-center gap-2.5 px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 active:bg-blue-800 dark:active:bg-blue-800 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md active:shadow-sm transform hover:scale-[1.02] active:scale-[0.98]"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            <span>Download PDF</span>
                                                        </button>
                                                    )}

                                                    {/* Delete CV Button */}
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm('Are you sure you want to delete this CV? You will need to regenerate it.')) {
                                                                if (jobId) {
                                                                    try {
                                                                        // Optimistic update
                                                                        setJobApplication(prev => prev ? { ...prev, draftCvJson: undefined } : null);
                                                                        // Update backend
                                                                        await updateJob(jobId, { draftCvJson: null });
                                                                    } catch (err) {
                                                                        console.error('Failed to delete CV', err);
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                        className="group flex items-center gap-2.5 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md"
                                                        title="Delete CV to regenerate with new instructions"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm border border-blue-100 dark:border-blue-900/30">
                                                <span className="material-symbols-outlined text-base">info</span>
                                                <p>
                                                    To regenerate the CV with different instructions, please delete the current CV using the trash icon above.
                                                </p>
                                            </div>
                                        </div>

                                        {analyzeError && (
                                            <div className="mb-4">
                                                <ErrorAlert
                                                    message={`Analysis Error: ${analyzeError}`}
                                                    onDismiss={() => setAnalyzeError(null)}
                                                />
                                            </div>
                                        )}

                                    </div>

                                    {/* CV Editor with View Modes */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <div className="p-6">
                                            {cvViewMode === 'edit' && cvData && (
                                                <CvFormEditor
                                                    data={cvData}
                                                    onChange={handleCvChange}
                                                    analysisResult={analysisResult}
                                                />
                                            )}
                                            {cvViewMode === 'preview' && (
                                                <div style={{ minHeight: '800px' }}>
                                                    <CvLivePreview
                                                        data={cvData}
                                                        templateId={selectedTemplate}
                                                        onTemplateChange={setSelectedTemplate}
                                                    />
                                                </div>
                                            )}
                                            {cvViewMode === 'split' && (
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                    <div>
                                                        {cvData && (
                                                            <CvFormEditor
                                                                data={cvData}
                                                                onChange={handleCvChange}
                                                                analysisResult={analysisResult}
                                                            />
                                                        )}
                                                    </div>
                                                    <div style={{ minHeight: '800px' }}>
                                                        <CvLivePreview
                                                            data={cvData}
                                                            templateId={selectedTemplate}
                                                            onTemplateChange={setSelectedTemplate}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <div className="mb-6">
                                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Tailor Your CV</h2>
                                        <p className="text-gray-600 dark:text-gray-400 text-lg">
                                            Create a job-specific resume in seconds. Fill in the details below to let our AI optimize your profile.
                                        </p>
                                    </div>

                                    {generateCvError && (
                                        <div className="mb-6">
                                            <ErrorAlert
                                                message={generateCvError}
                                                onDismiss={() => setGenerateCvError(null)}
                                            />
                                        </div>
                                    )}

                                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 space-y-8">
                                        {/* Target Role Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">work</span>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Target Role</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Job Title
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={tailoredJobTitle}
                                                        onChange={(e) => setTailoredJobTitle(e.target.value)}
                                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 dark:text-gray-100"
                                                        placeholder="e.g. Senior Product Manager"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Company Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={tailoredCompanyName}
                                                        onChange={(e) => setTailoredCompanyName(e.target.value)}
                                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 dark:text-gray-100"
                                                        placeholder="e.g. Acme Innovations"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Job Description Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">description</span>
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Job Description</h3>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <textarea
                                                    value={tailoredJobDescription}
                                                    onChange={(e) => setTailoredJobDescription(e.target.value)}
                                                    className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 dark:text-gray-100 min-h-[200px]"
                                                    placeholder="Paste the full job description here... Our AI will analyze key requirements and skills."
                                                ></textarea>
                                            </div>
                                        </div>

                                        <div className="pt-4">
                                            {/* Base Resume - Now Full Width or in a grid if we add more items later, currently logic kept it in grid but requested full width for prompt means prompt moves out */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">folder</span>
                                                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Base Resume</h3>
                                                    </div>
                                                    <div className="relative">
                                                        <select
                                                            value={selectedBaseCvId}
                                                            onChange={(e) => setSelectedBaseCvId(e.target.value)}
                                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 appearance-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                                        >
                                                            {availableCvs.map(cv => (
                                                                <option key={cv.id} value={cv.id}>{cv.name}</option>
                                                            ))}
                                                            {availableCvs.length === 0 && <option value="master">Loading CVs...</option>}
                                                        </select>
                                                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                                            <span className="material-symbols-outlined">expand_more</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        Select the version you want to tailor for this application.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Custom Instructions - Full Width */}
                                            {/* Custom Instructions - Full Width */}
                                            <PromptTemplateSelector
                                                type="cv"
                                                value={customInstructions}
                                                onChange={setCustomInstructions}
                                                label="Custom Instructions"
                                                placeholder="e.g. Highlight my experience with Python and emphasize leadership skills..."
                                                defaultContent={DEFAULT_CV_PROMPT}
                                            />
                                        </div>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="mt-8 flex items-center justify-end gap-4">
                                        <button
                                            onClick={() => navigate('/dashboard')}
                                            className="px-6 py-2.5 text-gray-600 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleGenerateSpecificCv}
                                            disabled={isGeneratingCv || !hasMasterCv || !tailoredJobDescription}
                                            className="group relative flex items-center gap-2 px-8 py-3 bg-purple-600 dark:bg-purple-600 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-700 active:bg-purple-800 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                        >
                                            {isGeneratingCv ? (
                                                <>
                                                    <Spinner size="sm" className="text-white" />
                                                    <span>Generating...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-white">auto_awesome</span>
                                                    <span>Generate Tailored CV</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>


            </div>

            {/* Sticky Action Bar */}
            {
                jobApplication.draftCvJson && jobApplication.draftCoverLetterText && (
                    <div className="fixed bottom-0 left-64 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-30">
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
                )
            }

            {/* CV Preview Modal */}
            <CvPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => {
                    setIsPreviewOpen(false);
                    setPreviewPdfBase64(null);
                }}
                pdfBase64={previewPdfBase64}
                isLoading={isGeneratingPreview}
            />

            {/* Toast Notification */}
            {
                toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )
            }

            {/* Floating Chat Button - Only show if job description exists */}
            {
                jobApplication?.jobDescriptionText && !isChatOpen && (
                    <FloatingChatButton
                        onClick={() => setIsChatOpen(true)}
                    />
                )
            }

            {/* Chat Window */}
            {
                isChatOpen && jobId && jobApplication && (
                    <JobChatWindow
                        jobId={jobId}
                        jobTitle={`${jobApplication.jobTitle} at ${jobApplication.companyName}`}
                        isOpen={isChatOpen}
                        onClose={() => setIsChatOpen(false)}
                    />
                )
            }
        </div >
    );
};

export default ReviewFinalizePage;
