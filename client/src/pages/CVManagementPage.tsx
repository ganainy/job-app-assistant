// client/src/pages/CVManagementPage.tsx
import React, { useState, ChangeEvent, FormEvent, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  uploadCV,
  getMasterCv,
  getAllCvs,
  updateCv,
  deleteCv,
  CVDocument
} from '../services/cvApi';
import { ResumeBuilder } from '../components/resume-builder';
import CvLivePreview from '../components/cv-editor/CvLivePreview';
import { JsonResumeSchema } from '../../../server/src/types/jsonresume';
import Toast from '../components/common/Toast';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { fetchAllSectionsAnalysis, fetchSectionAnalysis, SectionAnalysisResult } from '../services/analysisApi';
import { improveSection } from '../services/generatorApi';
import { scanAts, getAtsScores, getLatestAts, AtsScores, getAtsForJob } from '../services/atsApi';
import { getAllTemplates } from '../templates/config';
import Sidebar from '../components/cv-management/Sidebar';

const CVManagementPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [currentCvData, setCurrentCvData] = useState<JsonResumeSchema | null>(null);
  const [masterCvId, setMasterCvId] = useState<string | null>(null); // Store master CV's MongoDB ID
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
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [creationMode, setCreationMode] = useState<'choose' | 'upload' | 'scratch'>('choose');

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
  const [activeCvId, setActiveCvId] = useState<string | null>(null); // CV's MongoDB _id (null = loading)

  // All CVs state (master + job CVs) from unified model
  const [allCvs, setAllCvs] = useState<CVDocument[]>([]);
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

  // Derived state from allCvs
  const masterCv = useMemo(() => allCvs.find(cv => cv.isMasterCv), [allCvs]);
  const jobCvs = useMemo(() => allCvs.filter(cv => !cv.isMasterCv), [allCvs]);

  // Get active CV document
  const activeCv = useMemo(() => {
    if (!activeCvId) return masterCv || null;
    return allCvs.find(cv => cv._id === activeCvId) || null;
  }, [activeCvId, allCvs, masterCv]);

  // Get active job (for job CVs)
  const activeJob = useMemo(() => {
    return activeCv?.isMasterCv === false ? activeCv.jobApplication : null;
  }, [activeCv]);

  // Get active CV data (cvJson)
  const activeCvData = useMemo(() => {
    if (!activeCv) return currentCvData; // Fallback to legacy state during transition
    return activeCv.cvJson || null;
  }, [activeCv, currentCvData]);

  // Calculate unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!activeCvData) return false;

    // For master CV
    if (activeCv?.isMasterCv) {
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
  }, [activeCvData, activeCv, saveStatus, saveTrigger]); // Include saveTrigger to force recalculation

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
      // If activeCv is master, pass undefined for jobId
      const jobId = activeCv?.isMasterCv ? undefined : activeCv?.jobApplicationId || undefined;

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
        const response = await getMasterCv();
        const cvDoc = response.cv;
        const cvData = cvDoc?.cvJson || null;
        setCurrentCvData(cvData);
        setMasterCvId(cvDoc?._id || null); // Store the CV's MongoDB ID
        originalCvDataRef.current = cvData ? JSON.parse(JSON.stringify(cvData)) : null;
        // Reset save trigger to ensure proper comparison
        setSaveTrigger(0);

        // Load saved template preference from CV document
        if (cvDoc?.templateId) {
          setSelectedTemplate(cvDoc.templateId);
        }

        // Load cached analysis if available
        // Backend has already verified the hash matches, so we can trust the cache
        if (cvData && cvDoc?.analysisCache) {
          console.log('Loading cached analysis results');
          const cache = cvDoc.analysisCache as { analyses?: Record<string, any>; cvHash?: string };
          if (cache.analyses) {
            setAnalyses(cache.analyses);
            // Store the hash for future comparisons
            lastAnalyzedCvHashRef.current = cache.cvHash || null;
          }
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
        const cache = cvDoc?.analysisCache as { analyses?: Record<string, any> } | null;
        if (cvData && (!cache || !cache.analyses)) {
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

  // Fetch all CVs (master + job) from unified API
  useEffect(() => {
    const fetchAllCvsData = async () => {
      setIsLoadingJobCvs(true);
      try {
        const response = await getAllCvs();
        setAllCvs(response.cvs);

        // Set activeCvId to master CV if not set yet
        const master = response.cvs.find(cv => cv.isMasterCv);
        if (master && !activeCvId) {
          setActiveCvId(master._id);
        }
      } catch (error: any) {
        console.error("Error fetching CVs:", error);
        // Silently fail - job CVs are optional
      } finally {
        setIsLoadingJobCvs(false);
      }
    };

    // Fetch when master CV is loaded
    if (masterCvId) {
      fetchAllCvsData();
    }
  }, [masterCvId]);

  // Fetch ATS scores when switching context
  useEffect(() => {
    const fetchContextAts = async () => {
      setAtsScores(null); // Clear while loading

      try {
        if (activeCv?.isMasterCv) {
          const atsResponse = await getLatestAts();
          if (atsResponse.atsScores) {
            setAtsScores(atsResponse.atsScores);
            setAtsAnalysisId(atsResponse.analysisId);
          }
        } else if (activeCv?.jobApplicationId) {
          // Fetch for specific job
          const atsResponse = await getAtsForJob(activeCv.jobApplicationId);
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
  }, [activeCv, activeCvData]);


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
      const cvData = response.cv?.cvJson || null;
      setCurrentCvData(cvData);
      setMasterCvId(response.cv?._id || null); // Store the new CV's MongoDB ID
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
    if (activeCv?.isMasterCv) {
      setCurrentCvData(updatedCv);
    } else if (activeCvId) {
      // Optimistically update job CV in allCvs
      setAllCvs((prev: CVDocument[]) => prev.map((cv: CVDocument) =>
        cv._id === activeCvId ? { ...cv, cvJson: updatedCv } : cv
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
    if (currentCvData && masterCvId) {
      // Use a separate timeout to avoid conflicts with CV auto-save
      setTimeout(() => {
        updateCv(masterCvId, { cvJson: currentCvData, templateId: newTemplate }).catch((error: any) => {
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

      if (!activeCv?._id) {
        throw new Error('CV ID not found. Please refresh the page.');
      }

      // Use unified updateCv API for both master and job CVs
      const response = await updateCv(activeCv._id, {
        cvJson: activeCvData,
        templateId: activeCv.isMasterCv ? selectedTemplate : undefined
      });
      message = response.message || message;

      if (activeCv.isMasterCv) {
        // Deep copy to ensure proper comparison - update the ref with the exact data that was saved
        originalCvDataRef.current = JSON.parse(JSON.stringify(activeCvData));
        // Trigger recalculation of hasUnsaved changes
        setSaveTrigger(prev => prev + 1);
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
  }, [activeCvData, activeCv, selectedTemplate]);


  const handleDeleteCv = async (cvId: string) => {
    // Find the CV to determine if it's master or job
    const cvToDelete = allCvs.find(cv => cv._id === cvId);
    const isJobCv = cvToDelete && !cvToDelete.isMasterCv;

    const confirmMessage = isJobCv
      ? 'Are you sure you want to delete this job-specific CV? This action cannot be undone.'
      : 'Are you sure you want to delete your master CV? This action cannot be undone.';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);
    try {
      // Use unified deleteCv API for both master and job CVs
      await deleteCv(cvId);

      if (isJobCv) {
        // Update local state - remove the CV from allCvs list
        setAllCvs((prev: CVDocument[]) => prev.filter((cv: CVDocument) => cv._id !== cvId));

        // Switch to master CV if we were viewing the deleted job CV
        if (activeCvId === cvId && masterCv) {
          setActiveCvId(masterCv._id);
        }

        setToast({ message: 'Job CV deleted successfully.', type: 'success' });
      } else {
        // Master CV deleted
        setCurrentCvData(null);
        setMasterCvId(null);
        setAllCvs((prev: CVDocument[]) => prev.filter((cv: CVDocument) => cv._id !== cvId));
        originalCvDataRef.current = null;
        setSelectedFile(null);
        setActiveCvId(null);
        const fileInput = document.getElementById('cvFileInput') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        setToast({ message: 'CV deleted successfully.', type: 'success' });
      }
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
    <div className="flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Hide Sidebar when in upload/create mode */}
      {!isReplacing && (
        <Sidebar
          masterCv={masterCv || null}
          jobCvs={jobCvs}
          activeCvId={activeCvId}
          onSelectCv={setActiveCvId}
          onAddNewCv={() => {
            setIsReplacing(true);
            setSelectedFile(null);
            setCreationMode('choose');
          }}
          onReplaceCv={() => {
            setIsReplacing(true);
            setSelectedFile(null);
            setCreationMode('upload');
          }}
          onDeleteCv={handleDeleteCv}
          className="w-80 flex-shrink-0 z-20"
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="flex-1 p-6 lg:p-8 space-y-6">

          {/* Header with CV name and tabs */}
          {currentCvData && !isReplacing && (
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6 -mx-6 lg:-mx-8 -mt-6 lg:-mt-8 mb-6 rounded-b-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white truncate max-w-2xl">
                      {activeCvData?.basics?.name ? `${activeCvData.basics.name}_CV.pdf` : 'CV_Document.pdf'}
                    </h1>
                    {activeCv?.isMasterCv && (
                      <span className="px-3 py-1 text-xs font-bold tracking-wide bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-700">
                        MASTER CV
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {activeCv?.isMasterCv ? 'Your primary CV document' : 'Job-Specific CV Document'}
                  </p>
                </div>

                {/* Save Status Indicator */}
                {activeCv?.isMasterCv && (
                  <div className="flex items-center gap-2 text-sm">
                    {saveStatus === 'saving' && (
                      <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Saving...
                      </span>
                    )}
                    {saveStatus === 'saved' && (
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Saved
                      </span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Error saving
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* View Mode Tabs - Only show for Master CV */}
              {activeCv?.isMasterCv && (
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1 w-fit">
                  <button
                    onClick={() => setViewMode('edit')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'edit'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'preview'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Upload Section - Only show when no CV exists or when replacing */}
          {(!currentCvData || isReplacing) && !isLoadingCv && (
            <div className="mb-8">
              {/* Back Button - Top Left */}
              <button
                onClick={() => {
                  setIsReplacing(false);
                  setCreationMode('choose');
                }}
                className="mb-6 flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to My CVs
              </button>

              <div>

                {/* Choice Mode - Show two options */}
                {creationMode === 'choose' && (
                  <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-8">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {masterCv ? 'Update Your CV' : 'Create Your CV'}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto text-lg">
                        Choose how you'd like to {masterCv ? 'update' : 'create'} your professional CV
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Create from Scratch Card */}
                      <button
                        onClick={() => {
                          // Create empty CV data structure
                          const emptyCvData: JsonResumeSchema = {
                            basics: {
                              name: '',
                              label: '',
                              email: '',
                              phone: '',
                              summary: '',
                              location: { city: '', region: '', countryCode: '' },
                              profiles: [],
                            },
                            work: [],
                            education: [],
                            skills: [],
                            projects: [],
                            languages: [],
                            certificates: [],
                          };
                          setCurrentCvData(emptyCvData);
                          setCreationMode('choose');
                        }}
                        className="group relative p-8 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 text-left"
                      >
                        <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                          Create from Scratch
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Start with a blank canvas and build your CV step by step using our guided form.
                        </p>
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </div>
                      </button>

                      {/* Upload CV Card */}
                      <button
                        onClick={() => setCreationMode('upload')}
                        className="group relative p-8 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 text-left"
                      >
                        <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                          Upload Existing CV
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Import your existing PDF or RTF file. AI will extract and populate all fields.
                        </p>
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </div>
                      </button>
                    </div>
                  </div>
                )}


                {/* Upload Mode - only show when upload is selected */}
                {creationMode === 'upload' && (
                  <>
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
                        {isReplacing ? 'Import New CV' : 'Import Your CV'}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto text-lg">
                        {isReplacing
                          ? 'Upload a PDF or RTF file. AI will extract the content and update your form fields.'
                          : 'Drop your PDF or RTF file here. AI will extract the content and fill in the form automatically.'}
                      </p>
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
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Extract & Fill Form</span>
                          </>
                        )}
                      </button>
                    </form>

                    {/* Upload Error Display */}
                    {
                      uploadError && (
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
                      )
                    }
                  </>
                )}
              </div>
            </div>
          )}

          {/* CV Editor - Only show when NOT in upload/create mode */}
          {!isReplacing && (
            <div className="space-y-8">
              {/* CV Editor */}
              <div id="master-cv-editor">
                {/* For Job CVs - Show Read-Only Preview with link to Review page */}
                {activeCv && !activeCv.isMasterCv && activeJob && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          CV Preview
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                          Read-only
                        </span>
                      </div>
                      <Link
                        to={`/jobs/${activeCv.jobApplicationId}/review/cv`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit on Review Page
                      </Link>
                    </div>
                    <div className="p-6">
                      <div style={{ minHeight: '800px' }}>
                        <CvLivePreview
                          data={activeCvData}
                          templateId={selectedTemplate}
                          onTemplateChange={handleTemplateChange}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* For Master CV - Show Edit or Preview based on viewMode */}
                {/* Also show this fallback if it's a job-specific CV but activeJob is missing (orphaned or unlinked) */}
                {((activeCv && activeCv.isMasterCv) || (activeCv && !activeCv.isMasterCv && !activeJob)) && (
                  <>
                    {/* Edit Mode - Resume Builder */}
                    {viewMode === 'edit' && activeCv.isMasterCv && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                        <ResumeBuilder
                          data={activeCvData || { basics: {} }}
                          onChange={handleCvChange}
                          onImproveSection={handleImproveSection}
                          improvingSections={improvingSections}
                        />
                      </div>
                    )}

                    {/* Preview Mode */}
                    {(viewMode === 'preview' || !activeCv.isMasterCv) && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-6">
                          <div style={{ minHeight: '800px' }}>
                            <CvLivePreview
                              data={activeCvData}
                              templateId={selectedTemplate}
                              onTemplateChange={handleTemplateChange}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* New CV from Scratch - Show Resume Builder when currentCvData exists but no activeCv */}
                {!activeCv && currentCvData && !isReplacing && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                    <ResumeBuilder
                      data={currentCvData}
                      onChange={handleCvChange}
                      onImproveSection={handleImproveSection}
                      improvingSections={improvingSections}
                    />
                  </div>
                )}
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