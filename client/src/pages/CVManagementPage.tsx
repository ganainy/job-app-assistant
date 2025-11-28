// client/src/pages/CVManagementPage.tsx
import React, { useState, ChangeEvent, FormEvent, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { uploadCV, getCurrentCv, updateCurrentCv, deleteCurrentCv } from '../services/cvApi';
import CvFormEditor from '../components/cv-editor/CvFormEditor';
import CvLivePreview from '../components/cv-editor/CvLivePreview';
import { JsonResumeSchema } from '../../../server/src/types/jsonresume';
import Toast from '../components/common/Toast';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { fetchAllSectionsAnalysis, fetchSectionAnalysis, SectionAnalysisResult } from '../services/analysisApi';
import { improveSection } from '../services/generatorApi';
import { scanAts, getAtsScores, getLatestAts, AtsScores } from '../services/atsApi';
import GeneralCvAtsPanel from '../components/ats/GeneralCvAtsPanel';
import { getAllTemplates } from '../templates/config';
import { getJobsWithCvs, JobApplication, updateJob } from '../services/jobApi';
import { getAtsForJob } from '../services/atsApi';

const CVManagementPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [currentCvData, setCurrentCvData] = useState<JsonResumeSchema | null>(null);
  const [isLoadingCv, setIsLoadingCv] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isReplacing, setIsReplacing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('modern-clean');
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');

  // Analysis state
  const [analyses, setAnalyses] = useState<Record<string, SectionAnalysisResult[]>>({});
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [improvingSections, setImprovingSections] = useState<Record<string, boolean>>({});

  // ATS Analysis state
  const [atsScores, setAtsScores] = useState<AtsScores | null>(null);
  const [isScanningAts, setIsScanningAts] = useState<boolean>(false);
  const [atsAnalysisId, setAtsAnalysisId] = useState<string | null>(null);
  const [isAnalysisOutdated, setIsAnalysisOutdated] = useState<boolean>(false);
  const atsPollingIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [searchParams] = useSearchParams();
  // UI state
  const [activeCvId, setActiveCvId] = useState<string>(searchParams.get('jobId') || 'master'); // 'master' or job._id

  // Job-specific CVs state
  const [jobCvs, setJobCvs] = useState<JobApplication[]>([]);
  const [isLoadingJobCvs, setIsLoadingJobCvs] = useState<boolean>(false);

  // Track original CV data for unsaved changes detection
  const originalCvDataRef = useRef<JsonResumeSchema | null>(null);
  const [saveTrigger, setSaveTrigger] = useState<number>(0); // Force recalculation after save

  // Track last analyzed CV hash to avoid re-analyzing unchanged CVs
  // Can be backend hash (SHA256) or frontend hash (JSON string) - both work for comparison
  const lastAnalyzedCvHashRef = useRef<string | null>(null);

  // Helper function to check if error is API key related
  const isApiKeyError = (errorMessage: string): boolean => {
    return errorMessage?.toLowerCase().includes('api key');
  };

  // Computed properties for active CV context
  const activeJob = useMemo(() => {
    return activeCvId === 'master' ? null : jobCvs.find(j => j._id === activeCvId);
  }, [activeCvId, jobCvs]);

  const activeCvData = useMemo(() => {
    if (activeCvId === 'master') return currentCvData;
    return activeJob?.draftCvJson || null;
  }, [activeCvId, currentCvData, activeJob]);

  // Calculate unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!activeCvData) return false;

    // For master CV
    if (activeCvId === 'master') {
      if (!originalCvDataRef.current) return false;
      try {
        const currentStr = JSON.stringify(activeCvData);
        const originalStr = JSON.stringify(originalCvDataRef.current);
        return currentStr !== originalStr;
      } catch (error) {
        console.error('Error comparing CV data:', error);
        return true;
      }
    }

    // For Job CVs - we don't track unsaved changes as strictly yet since we don't have the original ref for each job easily accessible without more complex state
    // But we can check if it's currently saving
    return saveStatus === 'saving';
  }, [activeCvData, activeCvId, saveStatus, saveTrigger]); // Include saveTrigger to force recalculation

  // Generate a simple hash for CV comparison (only relevant sections)
  // Note: This should match the backend hash generation logic
  const generateCvHash = (cvJson: JsonResumeSchema): string => {
    const relevantSections = {
      work: cvJson.work || [],
      education: cvJson.education || [],
      skills: cvJson.skills || []
    };
    // Normalize by stringifying (backend uses SHA256, but for frontend comparison we just need consistency)
    return JSON.stringify(relevantSections);
  };

  // Run full CV analysis - single request for all sections
  // Backend handles caching automatically - no need to check locally
  // Run full CV analysis - single request for all sections
  // Backend handles caching automatically - no need to check locally
  const runFullCvAnalysis = async (cvJson: JsonResumeSchema) => {
    if (isAnalyzing) return; // Prevent concurrent analyses

    setIsAnalyzing(true);

    try {
      // Single API call to analyze all sections at once
      // Backend will check its cache and return cached results if CV hash matches
      const allAnalyses = await fetchAllSectionsAnalysis(cvJson);
      setAnalyses(allAnalyses);
      // Store hash for reference (backend uses SHA256, we store the JSON string for local tracking)
      lastAnalyzedCvHashRef.current = generateCvHash(cvJson);
    } catch (error: any) {
      console.error('Error running CV analysis:', error);
      setToast({ message: error.message || 'Failed to analyze CV sections.', type: 'error' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Manual trigger for analysis
  const handleRunAnalysis = async () => {
    if (!activeCvData) return;

    // Save first if there are changes (only for master for now)
    if (activeCvId === 'master' && hasUnsavedChanges) {
      await handleSaveCv();
    }

    // Run both analyses
    runFullCvAnalysis(activeCvData);
    runAtsAnalysis(activeCvData);
    setIsAnalysisOutdated(false);
  };

  // Poll ATS scores until analysis is complete
  const pollAtsScores = async (analysisIdToPoll: string, startTime: number, maxWaitTime: number = 60000): Promise<boolean> => {
    const elapsed = Date.now() - startTime;
    if (elapsed > maxWaitTime) {
      setIsScanningAts(false);
      setToast({ message: 'ATS analysis is taking longer than expected. Please check back later.', type: 'info' });
      return true; // Stop polling
    }

    try {
      const response = await getAtsScores(analysisIdToPoll);
      if (response.atsScores) {
        if (response.atsScores.error) {
          setIsScanningAts(false);
          setToast({ message: `ATS analysis error: ${response.atsScores.error}`, type: 'error' });
          return true; // Stop polling
        }
        if (response.atsScores.score !== null && response.atsScores.score !== undefined) {
          setAtsScores(response.atsScores);
          setIsScanningAts(false);
          setToast({ message: 'ATS analysis completed!', type: 'success' });
          return true; // Stop polling
        }
      }
      return false; // Continue polling
    } catch (error: any) {
      console.error('Error polling ATS scores:', error);
      // Don't stop polling on transient errors, but log them
      return false;
    }
  };

  // Trigger ATS analysis for general CV review (no job description)
  const runAtsAnalysis = async (cvDataOverride?: JsonResumeSchema | null) => {
    const cvDataToUse = cvDataOverride !== undefined ? cvDataOverride : activeCvData;
    if (!cvDataToUse) {
      // Silently return if no CV data - don't show error toast
      return;
    }

    if (isScanningAts) {
      return; // Already scanning
    }

    // Clear any existing polling
    if (atsPollingIntervalIdRef.current) {
      clearInterval(atsPollingIntervalIdRef.current);
      atsPollingIntervalIdRef.current = null;
    }

    setIsScanningAts(true);
    setAtsScores(null); // Clear previous scores

    try {
      // Trigger ATS scan
      // If activeCvId is a job ID, pass it. If 'master', pass undefined.
      const jobId = activeCvId === 'master' ? undefined : activeCvId;

      const response = await scanAts(jobId, atsAnalysisId || undefined);
      setAtsAnalysisId(response.analysisId);
      setToast({ message: 'ATS analysis started. Analyzing your CV...', type: 'info' });

      const startTime = Date.now();
      const POLLING_INTERVAL = 2000; // Poll every 2 seconds

      // Set up interval polling
      const intervalId = setInterval(async () => {
        const result = await pollAtsScores(response.analysisId, startTime);
        if (result) {
          clearInterval(intervalId);
          atsPollingIntervalIdRef.current = null;
        }
      }, POLLING_INTERVAL);

      atsPollingIntervalIdRef.current = intervalId;

      // Start polling immediately
      const checkResult = await pollAtsScores(response.analysisId, startTime);
      if (checkResult) {
        clearInterval(intervalId);
        atsPollingIntervalIdRef.current = null;
      }
    } catch (error: any) {
      console.error('Error starting ATS scan:', error);
      setIsScanningAts(false);
      setToast({ message: error.message || 'Failed to start ATS analysis.', type: 'error' });
    }
  };

  // Fetch current CV on mount
  useEffect(() => {
    const fetchCv = async () => {
      setIsLoadingCv(true);
      try {
        const response = await getCurrentCv();
        const cvData = response.cvData || null;
        setCurrentCvData(cvData);
        originalCvDataRef.current = cvData ? JSON.parse(JSON.stringify(cvData)) : null;
        // Reset save trigger to ensure proper comparison
        setSaveTrigger(0);

        // Load saved template preference
        if (response.selectedTemplate) {
          setSelectedTemplate(response.selectedTemplate);
        }

        // Load cached analysis if available
        // Backend has already verified the hash matches, so we can trust the cache
        if (cvData && response.analysisCache && response.analysisCache.analyses) {
          console.log('Loading cached analysis results');
          setAnalyses(response.analysisCache.analyses);
          // Store the hash for future comparisons (backend uses SHA256, we'll use it for reference)
          lastAnalyzedCvHashRef.current = response.analysisCache.cvHash;
        }

        // Load existing ATS scores if available
        let hasExistingAtsScores = false;
        if (cvData) {
          try {
            const atsResponse = await getLatestAts();
            if (atsResponse.atsScores && atsResponse.analysisId) {
              console.log('Loading existing ATS scores');
              setAtsScores(atsResponse.atsScores);
              setAtsAnalysisId(atsResponse.analysisId);
              hasExistingAtsScores = true;
            }
          } catch (atsError: any) {
            // If no ATS scores exist, that's fine - we'll trigger analysis below
            console.log('No existing ATS scores found, will trigger new analysis');
          }
        }

        setIsLoadingCv(false);

        // Run analysis after CV is loaded (only if no valid cache)
        if (cvData && (!response.analysisCache || !response.analysisCache.analyses)) {
          // We can optionally auto-run here or just let the user decide.
          // For better UX on first load, maybe we just show "Analysis needed"
          setIsAnalysisOutdated(true);
        }

        // Trigger ATS analysis only if no existing scores were found
        if (cvData && !hasExistingAtsScores) {
          // Same here, let user trigger it
          // setIsAnalysisOutdated(true); // Already set above
        }
      } catch (error: any) {
        console.error("Error fetching current CV:", error);
        setToast({ message: error.message || 'Failed to load CV data.', type: 'error' });
        setIsLoadingCv(false);
      }
    };
    fetchCv();

    // Cleanup polling on unmount
    return () => {
      if (atsPollingIntervalIdRef.current) {
        clearInterval(atsPollingIntervalIdRef.current);
        atsPollingIntervalIdRef.current = null;
      }
    };
  }, []);

  // Fetch job-specific CVs
  useEffect(() => {
    const fetchJobCvs = async () => {
      setIsLoadingJobCvs(true);
      try {
        const jobs = await getJobsWithCvs();
        setJobCvs(jobs);
      } catch (error: any) {
        console.error("Error fetching job-specific CVs:", error);
        // Silently fail - job CVs are optional
      } finally {
        setIsLoadingJobCvs(false);
      }
    };

    // Only fetch if we have a master CV
    if (currentCvData) {
      fetchJobCvs();
    }
  }, [currentCvData]);

  // Fetch ATS scores when switching context
  useEffect(() => {
    const fetchContextAts = async () => {
      setAtsScores(null); // Clear while loading

      try {
        if (activeCvId === 'master') {
          const atsResponse = await getLatestAts();
          if (atsResponse.atsScores) {
            setAtsScores(atsResponse.atsScores);
            setAtsAnalysisId(atsResponse.analysisId);
          }
        } else {
          // Fetch for specific job
          const atsResponse = await getAtsForJob(activeCvId);
          if (atsResponse.atsScores) {
            setAtsScores(atsResponse.atsScores);
            setAtsAnalysisId(atsResponse.analysisId);
          }
        }
      } catch (error) {
        console.error('Error fetching ATS scores for context:', error);
      }
    };

    if (activeCvData) {
      fetchContextAts();
    }
  }, [activeCvId, activeCvData]);


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      // Validate file type
      const validTypes = ['application/pdf', 'application/rtf', 'text/rtf'];
      const validExtensions = ['.pdf', '.rtf'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const maxFileSize = 10 * 1024 * 1024; // 10MB

      // Check file type
      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        const actualExtension = file.name.split('.').pop()?.toUpperCase() || 'unknown';
        setToast({
          message: `Invalid file type (.${actualExtension}). Please upload a PDF or RTF file.`,
          type: 'error'
        });
        return;
      }

      // Check file size
      if (file.size > maxFileSize) {
        setToast({
          message: `File too large (${formatFileSize(file.size)}). Maximum size is 10MB.`,
          type: 'error'
        });
        return;
      }

      // Check if file is empty
      if (file.size === 0) {
        setToast({
          message: 'The selected file is empty. Please choose a valid CV file.',
          type: 'error'
        });
        return;
      }

      setSelectedFile(file);
      setUploadError(null); // Clear any previous errors
    } else {
      setSelectedFile(null);
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

    // Check if multiple files were dropped
    if (files && files.length > 1) {
      setToast({
        message: 'Please drop only one file at a time.',
        type: 'error'
      });
      return;
    }

    if (files && files[0]) {
      const file = files[0];
      const validTypes = ['application/pdf', 'application/rtf', 'text/rtf'];
      const validExtensions = ['.pdf', '.rtf'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const maxFileSize = 10 * 1024 * 1024; // 10MB

      // Check file type
      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        const actualExtension = file.name.split('.').pop()?.toUpperCase() || 'unknown';
        setToast({
          message: `Invalid file type (.${actualExtension}). Please drop a PDF or RTF file.`,
          type: 'error'
        });
        return;
      }

      // Check file size
      if (file.size > maxFileSize) {
        setToast({
          message: `File too large (${formatFileSize(file.size)}). Maximum size is 10MB.`,
          type: 'error'
        });
        return;
      }

      // Check if file is empty
      if (file.size === 0) {
        setToast({
          message: 'The dropped file is empty. Please choose a valid CV file.',
          type: 'error'
        });
        return;
      }

      setSelectedFile(file);
      setUploadError(null); // Clear any previous errors

      // Update the file input
      const fileInput = document.getElementById('cvFileInput') as HTMLInputElement;
      if (fileInput) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setToast({ message: 'Please select a PDF or RTF file to upload.', type: 'error' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX (actual upload happens quickly)
      setUploadProgress(30);

      const response = await uploadCV(selectedFile);

      setUploadProgress(60);
      const cvData = response.cvData || null;
      setCurrentCvData(cvData);
      originalCvDataRef.current = cvData ? JSON.parse(JSON.stringify(cvData)) : null;
      // Reset save trigger to ensure proper comparison
      setSaveTrigger(0);

      setUploadProgress(90);

      if (cvData) {
        runFullCvAnalysis(cvData);
        runAtsAnalysis(cvData);
        setIsAnalysisOutdated(false);
      }

      setUploadProgress(100);
      setSelectedFile(null);
      setIsReplacing(false);
      const fileInput = document.getElementById('cvFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      setToast({ message: response.message || 'CV uploaded and processed successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadProgress(0);
      setUploadError(error.message || 'Failed to upload CV. Please try again.');
      setToast({ message: error.message || 'Failed to upload CV. Please try again.', type: 'error' });
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000); // Reset progress after a delay
    }
  };

  const handleCvChange = (updatedCv: JsonResumeSchema) => {
    if (activeCvId === 'master') {
      setCurrentCvData(updatedCv);
    } else {
      // Optimistically update job CV
      setJobCvs(prev => prev.map(j =>
        j._id === activeCvId ? { ...j, draftCvJson: updatedCv } : j
      ));
    }

    setSaveStatus('idle'); // Reset save status when changes are made

    // Trigger auto-save if enabled
    if (autoSaveEnabled) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save (500ms debounce)
      autoSaveTimeoutRef.current = setTimeout(async () => {
        await handleSaveCv(true); // Pass true to indicate auto-save

        // Auto-trigger analysis after save if CV changed
        const currentHash = generateCvHash(updatedCv);
        if (lastAnalyzedCvHashRef.current !== currentHash) {
          runFullCvAnalysis(updatedCv);
          runAtsAnalysis(updatedCv);
          setIsAnalysisOutdated(false);
        }
      }, 500);
    }

    // Check if relevant sections changed
    const currentHash = generateCvHash(updatedCv);
    if (lastAnalyzedCvHashRef.current !== currentHash) {
      setIsAnalysisOutdated(true);
    }
  };

  const handleTemplateChange = (newTemplate: string) => {
    setSelectedTemplate(newTemplate);
    // Save template preference immediately when changed
    if (currentCvData) {
      // Use a separate timeout to avoid conflicts with CV auto-save
      setTimeout(() => {
        updateCurrentCv(currentCvData, newTemplate).catch((error) => {
          console.error("Error saving template preference:", error);
        });
      }, 100);
    }
  };

  const handleSaveCv = useCallback(async (isAutoSave: boolean = false) => {
    if (!activeCvData) {
      setToast({ message: 'No CV data to save.', type: 'error' });
      return;
    }

    // Don't show saving state for auto-save to avoid UI flicker
    if (!isAutoSave) {
      setIsSaving(true);
    }
    setSaveStatus('saving');

    try {
      let message = 'CV updated successfully!';

      if (activeCvId === 'master') {
        const response = await updateCurrentCv(activeCvData, selectedTemplate);
        message = response.message || message;
        // Deep copy to ensure proper comparison - update the ref with the exact data that was saved
        originalCvDataRef.current = JSON.parse(JSON.stringify(activeCvData));
        // Trigger recalculation of hasUnsavedChanges
        setSaveTrigger(prev => prev + 1);
      } else {
        // Save Job CV
        await updateJob(activeCvId, {
          draftCvJson: activeCvData
        });
        message = 'Job CV updated successfully!';
      }

      setSaveStatus('saved');
      setLastSavedTime(new Date());

      // Only show toast for manual saves
      if (!isAutoSave) {
        setToast({ message, type: 'success' });
      }

      // Reset save status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error: any) {
      console.error("Error saving CV:", error);
      setSaveStatus('error');
      // Handle both object errors and Error instances
      const errorMessage = error?.message || error?.error || 'Failed to save CV changes.';
      setToast({ message: errorMessage, type: 'error' });

      // Reset error status after 5 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 5000);
    } finally {
      if (!isAutoSave) {
        setIsSaving(false);
      }
    }
  }, [activeCvData, activeCvId, selectedTemplate]);


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
      originalCvDataRef.current = null;
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



  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 10) return 'just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Handle section improvement
  const handleImproveSection = async (
    sectionName: string,
    sectionIndex: number,
    originalData: any,
    customInstructions?: string
  ) => {
    if (!activeCvData) return;

    const sectionKey = `${sectionName}-${sectionIndex}`;
    setImprovingSections((prev) => ({ ...prev, [sectionKey]: true }));

    try {
      const improvedData = await improveSection(sectionName, originalData, customInstructions);

      // Update the CV data with improved section - deep copy to ensure proper change detection
      const updatedCv = JSON.parse(JSON.stringify(activeCvData));

      if (sectionName === 'work' && updatedCv.work) {
        updatedCv.work[sectionIndex] = { ...updatedCv.work[sectionIndex], ...improvedData };
      } else if (sectionName === 'education' && updatedCv.education) {
        updatedCv.education[sectionIndex] = { ...updatedCv.education[sectionIndex], ...improvedData };
      } else if (sectionName === 'skills' && updatedCv.skills) {
        updatedCv.skills[sectionIndex] = { ...updatedCv.skills[sectionIndex], ...improvedData };
      }

      handleCvChange(updatedCv);

      // Re-analyze the improved section
      const newAnalysis = await fetchSectionAnalysis(sectionName, improvedData);
      setAnalyses((prev) => {
        const updated = { ...prev };
        if (!updated[sectionName]) {
          updated[sectionName] = [];
        }
        const sectionArray = [...(updated[sectionName] || [])];
        sectionArray[sectionIndex] = newAnalysis;
        updated[sectionName] = sectionArray;
        return updated;
      });

      // Update hash since CV changed
      const newHash = generateCvHash(updatedCv);
      lastAnalyzedCvHashRef.current = newHash;

      setToast({ message: 'Section improved successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Error improving section:', error);
      setToast({ message: error.message || 'Failed to improve section.', type: 'error' });
    } finally {
      setImprovingSections((prev) => {
        const updated = { ...prev };
        delete updated[sectionKey];
        return updated;
      });
    }
  };

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && activeCvData && hasUnsavedChanges) {
        e.preventDefault();
        handleSaveCv();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCvData, hasUnsavedChanges, handleSaveCv]);

  // State for collapsible ATS panel
  const [isAtsPanelOpen, setIsAtsPanelOpen] = useState<boolean>(true);

  // Get smart status for display - shows only the most relevant status
  const getSmartStatus = () => {
    if (hasUnsavedChanges) {
      return { text: 'Unsaved changes', color: 'amber', icon: 'dot', tooltip: 'Press Ctrl+S to save' };
    }
    if (saveStatus === 'saving') {
      return { text: 'Saving...', color: 'blue', icon: 'spinner', tooltip: null };
    }
    if (saveStatus === 'error') {
      return { text: 'Save failed', color: 'red', icon: 'error', tooltip: 'Click to retry' };
    }
    if (isAnalysisOutdated) {
      return { text: 'Analysis outdated', color: 'amber', icon: 'warning', tooltip: 'Click Refresh Analysis to update' };
    }
    if (saveStatus === 'saved' && lastSavedTime) {
      return { text: `Saved ${formatRelativeTime(lastSavedTime)}`, color: 'green', icon: 'check', tooltip: null };
    }
    if (atsScores && Object.keys(analyses).length > 0) {
      return { text: 'All up to date', color: 'green', icon: 'check', tooltip: 'CV and analysis are current' };
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
        <div className="space-y-6">

          {/* Upload Section - Only show when no CV exists or when replacing */}
          {(!currentCvData || isReplacing) && !isLoadingCv && (
            <div className="mb-8 p-6 sm:p-8 border border-gray-100 dark:border-gray-700/50 rounded-2xl shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-all duration-300">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                  {isUploading ? (
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {isReplacing ? 'Replace your CV' : 'Upload your CV'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto text-lg">
                  {isReplacing
                    ? 'Upload a new file to replace your current CV. We\'ll re-analyze everything for you.'
                    : 'Drop your PDF or RTF file here to get started with AI-powered analysis.'}
                </p>
                {isReplacing && (
                  <button
                    onClick={() => setIsReplacing(false)}
                    className="mt-4 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline decoration-dotted underline-offset-4 transition-colors"
                  >
                    Cancel replacement
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`group relative mb-8 p-10 sm:p-14 border-2 border-dashed rounded-2xl transition-all duration-300 overflow-hidden ${isDragging
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 scale-[1.01] shadow-lg'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                >
                  {/* Upload Progress Bar */}
                  {isUploading && uploadProgress > 0 && (
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100 dark:bg-gray-700">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}

                  <div className="text-center relative z-10">
                    {isUploading ? (
                      <div className="space-y-4">
                        <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                          {uploadProgress < 40 ? 'Uploading file...' : uploadProgress < 70 ? 'Processing content...' : 'Finalizing...'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {uploadProgress}% complete
                        </p>
                      </div>
                    ) : isDragging ? (
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">Drop it here!</p>
                        <p className="text-gray-500 dark:text-gray-400">We'll take care of the rest</p>
                      </div>
                    ) : (
                      <>
                        <label htmlFor="cvFileInput" className="cursor-pointer block space-y-4">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-xl font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              Click to upload
                            </span>
                            <span className="text-xl text-gray-500 dark:text-gray-400"> or drag and drop</span>
                          </div>
                          <p className="text-sm text-gray-400 dark:text-gray-500">PDF or RTF (MAX. 10MB)</p>
                        </label>
                      </>
                    )}
                    <input
                      type="file"
                      id="cvFileInput"
                      accept=".pdf,.rtf,application/pdf,application/rtf,text/rtf"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </div>
                </div>


                {selectedFile && (
                  <div className="mb-6 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30 flex items-center justify-between gap-4 animate-fade-in">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        const fileInput = document.getElementById('cvFileInput') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      disabled={isUploading}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none disabled:hover:shadow-xl"
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing your CV...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Start AI Analysis</span>
                    </>
                  )}
                </button>
              </form>

              {/* Upload Error Display */}
              {uploadError && (
                <div className={`mt-4 p-4 rounded-lg border ${isApiKeyError(uploadError)
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                  : 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-800'
                  }`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {isApiKeyError(uploadError) ? (
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-semibold mb-1 ${isApiKeyError(uploadError)
                        ? 'text-amber-800 dark:text-amber-300'
                        : 'text-red-800 dark:text-red-300'
                        }`}>
                        {isApiKeyError(uploadError) ? 'API Key Required' : 'Upload Error'}
                      </h3>
                      <p className={`text-sm mb-3 ${isApiKeyError(uploadError)
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-red-700 dark:text-red-400'
                        }`}>
                        {uploadError}
                      </p>
                      {isApiKeyError(uploadError) && (
                        <Link
                          to="/settings"
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-amber-600 hover:bg-amber-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Go to Settings
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: CV Versions (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              {currentCvData && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    My CVs
                  </h3>
                  <div className="space-y-4">
                    {/* Master CV Card */}
                    <div
                      onClick={() => setActiveCvId('master')}
                      className={`w-full p-4 bg-white dark:bg-gray-800 border-2 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all group ${activeCvId === 'master'
                        ? 'border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded uppercase">Master</span>
                        {activeCvId === 'master' && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate">{currentCvData.basics?.name || 'My CV'}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Last updated: {lastSavedTime ? formatRelativeTime(lastSavedTime) : 'Recently'}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsReplacing(true);
                            setSelectedFile(null);
                          }}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Replace
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCv();
                          }}
                          disabled={isDeleting}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Job CV Cards */}
                    {jobCvs.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Optimized CVs</h4>
                        <div className="space-y-3">
                          {jobCvs.map((job) => (
                            <div
                              key={job._id}
                              onClick={() => setActiveCvId(job._id)}
                              className={`w-full p-3 bg-white dark:bg-gray-800 border-2 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all group ${activeCvId === job._id
                                ? 'border-purple-500 ring-2 ring-purple-500/20'
                                : 'border-gray-100 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate text-sm">{job.jobTitle}</h4>
                                    {activeCvId === job._id && (
                                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></div>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{job.companyName}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>

            {/* Right Column: ATS Analysis (8 cols) */}
            <div className="lg:col-span-8">
              {currentCvData && !isLoadingCv && !isReplacing && (
                <div className="h-full border border-gray-100 dark:border-gray-700/50 rounded-2xl shadow-xl bg-white dark:bg-gray-800 overflow-hidden transition-all duration-300 flex flex-col">
                  <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-xl flex items-center justify-center shadow-sm">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Analysis & ATS Report</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Real-time insights</p>
                      </div>
                    </div>
                    {isAnalysisOutdated && !atsScores && (
                      <button
                        onClick={handleRunAnalysis}
                        disabled={isAnalyzing || isScanningAts}
                        className="px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                      </button>
                    )}
                  </div>

                  <div className="p-6 flex-1 overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                    <GeneralCvAtsPanel
                      atsScores={atsScores}
                      analyses={analyses}
                      isLoading={isScanningAts || isAnalyzing}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Editor Section */}
          <div id="master-cv-editor" className="mb-8 p-8 border border-gray-100 dark:border-gray-700/50 rounded-2xl shadow-xl bg-white dark:bg-gray-800 transition-all duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {activeCvId === 'master' ? 'Edit Master CV' : `Edit CV for ${activeJob?.jobTitle}`}
                </h2>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  {activeCvId === 'master'
                    ? 'Review and edit your master CV data. Changes are auto-saved.'
                    : `Tailoring CV for ${activeJob?.companyName}. Changes are saved to this job application.`}
                </p>
              </div>

              {/* Editor Controls */}
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('edit')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${viewMode === 'edit'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setViewMode('split')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${viewMode === 'split'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                  >
                    Split
                  </button>
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${viewMode === 'preview'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                  >
                    Preview
                  </button>
                </div>

              </div>
            </div>

            {isLoadingCv ? (
              <div className="space-y-6 py-8">
                <LoadingSkeleton lines={4} />
                <LoadingSkeleton lines={4} />
                <LoadingSkeleton lines={4} />
              </div>
            ) : activeCvData ? (
              <>
                {viewMode === 'edit' && (
                  <div className="flex justify-center">
                    <div className="w-full max-w-[816px]">
                      {/* Analysis Status Banner */}
                      {isAnalyzing && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-3 shadow-sm">
                          <svg
                            className="animate-spin h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                              Analyzing CV sections...
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              AI is reviewing your work experience, education, and skills to provide improvement suggestions.
                            </p>
                          </div>
                        </div>
                      )}
                      {/* CV Editor */}
                      <CvFormEditor
                        data={activeCvData}
                        onChange={handleCvChange}
                        analyses={analyses}
                        onImproveSection={handleImproveSection}
                        improvingSections={improvingSections}
                      />
                    </div>
                  </div>
                )}
                {viewMode === 'preview' && (
                  <div className="w-full" style={{ minHeight: '800px' }}>
                    <CvLivePreview
                      data={activeCvData}
                      templateId={selectedTemplate}
                      onTemplateChange={handleTemplateChange}
                    />
                  </div>
                )}
                {viewMode === 'split' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="w-full">
                      <div className="sticky top-4">
                        <CvFormEditor
                          data={activeCvData}
                          onChange={handleCvChange}
                          analyses={analyses}
                          onImproveSection={handleImproveSection}
                          improvingSections={improvingSections}
                        />
                      </div>
                    </div>
                    <div className="w-full" style={{ minHeight: '800px' }}>
                      <CvLivePreview
                        data={activeCvData}
                        templateId={selectedTemplate}
                        onTemplateChange={handleTemplateChange}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 px-4">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">No CV data found</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  Upload your CV above to get started. We'll use AI to parse it and make it editable.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>AI-powered parsing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Easy editing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>ATS optimization</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Save Button */}
          {activeCvData && hasUnsavedChanges && (
            <div className="fixed bottom-8 right-8 z-50 animate-slide-up">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4 min-w-[320px] backdrop-blur-sm bg-white/95 dark:bg-gray-800/95">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse shadow-lg shadow-amber-500/50"></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Unsaved changes</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Press Ctrl+S or click to save</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSaveCv(false)}
                  disabled={isSaving || isUploading}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}



          {/* Quick Actions FAB */}
          {activeCvData && (
            <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-3">
              {/* FAB Menu Items */}
              <div className="flex flex-col items-end gap-3 transition-all duration-300 origin-bottom-right">
                {/* Save Action */}
                {hasUnsavedChanges && (
                  <button
                    onClick={() => handleSaveCv(false)}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-all transform hover:scale-105"
                  >
                    <span className="text-sm font-medium">Save Changes</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                  </button>
                )}

                {/* Analyze Action */}
                <button
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing || isScanningAts}
                  className={`flex items-center gap-2 px-5 py-3 rounded-full shadow-xl transition-all transform hover:scale-105 disabled:transform-none disabled:opacity-50 disabled:cursor-not-allowed ${isAnalysisOutdated
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white animate-pulse'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                    }`}
                >
                  {isAnalyzing || isScanningAts ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm font-semibold">Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-sm font-semibold">{isAnalysisOutdated ? 'Analysis Outdated - Refresh' : 'Refresh Analysis'}</span>
                    </>
                  )}
                </button>
              </div>
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
      </div>
    </div>
  );
};

export default CVManagementPage;