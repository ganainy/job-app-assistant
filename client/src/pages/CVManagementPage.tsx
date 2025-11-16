// client/src/pages/CVManagementPage.tsx
import React, { useState, ChangeEvent, FormEvent, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { uploadCV, getCurrentCv, updateCurrentCv, deleteCurrentCv, previewCv } from '../services/cvApi';
import CvFormEditor from '../components/cv-editor/CvFormEditor';
import CvPreviewModal from '../components/cv-editor/CvPreviewModal';
import { JsonResumeSchema } from '../../../server/src/types/jsonresume';
import Toast from '../components/common/Toast';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { fetchAllSectionsAnalysis, fetchSectionAnalysis, SectionAnalysisResult } from '../services/analysisApi';
import { improveSection } from '../services/generatorApi';
import { scanAts, getAtsScores, getLatestAts, AtsScores } from '../services/atsApi';
import GeneralCvAtsPanel from '../components/ats/GeneralCvAtsPanel';

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
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewPdfBase64, setPreviewPdfBase64] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<boolean>(false);
  
  // Analysis state
  const [analyses, setAnalyses] = useState<Record<string, SectionAnalysisResult[]>>({});
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [improvingSections, setImprovingSections] = useState<Record<string, boolean>>({});
  
  // ATS Analysis state
  const [atsScores, setAtsScores] = useState<AtsScores | null>(null);
  const [isScanningAts, setIsScanningAts] = useState<boolean>(false);
  const [atsAnalysisId, setAtsAnalysisId] = useState<string | null>(null);
  const atsPollingIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track original CV data for unsaved changes detection
  const originalCvDataRef = useRef<JsonResumeSchema | null>(null);
  const [saveTrigger, setSaveTrigger] = useState<number>(0); // Force recalculation after save
  
  // Track last analyzed CV hash to avoid re-analyzing unchanged CVs
  // Can be backend hash (SHA256) or frontend hash (JSON string) - both work for comparison
  const lastAnalyzedCvHashRef = useRef<string | null>(null);


  // Calculate unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!currentCvData || !originalCvDataRef.current) return false;
    // Deep comparison using JSON.stringify
    // This handles nested objects and arrays properly
    try {
      const currentStr = JSON.stringify(currentCvData);
      const originalStr = JSON.stringify(originalCvDataRef.current);
      return currentStr !== originalStr;
    } catch (error) {
      // If stringification fails, assume there are changes
      console.error('Error comparing CV data:', error);
      return true;
    }
  }, [currentCvData, saveTrigger]); // Include saveTrigger to force recalculation

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
  const runAtsAnalysis = async () => {
    if (!currentCvData) {
      setToast({ message: 'No CV data available for ATS analysis.', type: 'error' });
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
      // Trigger ATS scan without job description (general CV analysis)
      const response = await scanAts(undefined, atsAnalysisId || undefined);
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
          runFullCvAnalysis(cvData);
        }
        
        // Trigger ATS analysis only if no existing scores were found
        if (cvData && !hasExistingAtsScores) {
          setTimeout(() => runAtsAnalysis(), 1000);
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


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // Validate file type
      const validTypes = ['application/pdf', 'application/rtf', 'text/rtf'];
      const validExtensions = ['.pdf', '.rtf'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        setToast({ message: 'Please select a valid PDF or RTF file.', type: 'error' });
        return;
      }
      
      setSelectedFile(file);
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
    if (files && files[0]) {
      const file = files[0];
      const validTypes = ['application/pdf', 'application/rtf', 'text/rtf'];
      const validExtensions = ['.pdf', '.rtf'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        setToast({ message: 'Please drop a valid PDF or RTF file.', type: 'error' });
        return;
      }
      
      setSelectedFile(file);
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

    try {
      const response = await uploadCV(selectedFile);
      const cvData = response.cvData || null;
      setCurrentCvData(cvData);
      originalCvDataRef.current = cvData ? JSON.parse(JSON.stringify(cvData)) : null;
      // Reset save trigger to ensure proper comparison
      setSaveTrigger(0);
      
      // Run analysis after CV is uploaded
      if (cvData) {
        runFullCvAnalysis(cvData);
        // Also trigger ATS analysis
        setTimeout(() => runAtsAnalysis(), 1000); // Small delay to let section analysis start first
      }
      
      setSelectedFile(null);
      setIsReplacing(false);
      const fileInput = document.getElementById('cvFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      setToast({ message: response.message || 'CV uploaded and processed successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Upload failed:', error);
      setToast({ message: error.message || 'Failed to upload CV. Please try again.', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCvChange = (updatedCv: JsonResumeSchema) => {
    setCurrentCvData(updatedCv);
    
    // Check if relevant sections changed and trigger re-analysis if needed
    // Use simple JSON comparison to detect changes
    const currentHash = generateCvHash(updatedCv);
    if (lastAnalyzedCvHashRef.current !== currentHash) {
      // CV sections changed, re-analyze (backend will use cache if hash matches)
      runFullCvAnalysis(updatedCv);
      // Also trigger ATS analysis when CV changes
      setTimeout(() => runAtsAnalysis(), 1000);
    }
  };

  const handleSaveCv = useCallback(async () => {
    if (!currentCvData) {
      setToast({ message: 'No CV data to save.', type: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const response = await updateCurrentCv(currentCvData);
      // Deep copy to ensure proper comparison - update the ref with the exact data that was saved
      originalCvDataRef.current = JSON.parse(JSON.stringify(currentCvData));
      // Trigger recalculation of hasUnsavedChanges
      setSaveTrigger(prev => prev + 1);
      setToast({ message: response.message || 'CV updated successfully!', type: 'success' });
    } catch (error: any) {
      console.error("Error saving CV:", error);
      // Handle both object errors and Error instances
      const errorMessage = error?.message || error?.error || 'Failed to save CV changes.';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [currentCvData]);


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

  const handlePreviewCv = async () => {
    if (!currentCvData) {
      setToast({ message: 'No CV data available to preview.', type: 'error' });
      return;
    }

    setIsGeneratingPreview(true);
    try {
      const response = await previewCv(currentCvData);
      setPreviewPdfBase64(response.pdfBase64);
      setIsPreviewOpen(true);
    } catch (error: any) {
      console.error("Error generating CV preview:", error);
      setToast({ message: error.message || 'Failed to generate CV preview.', type: 'error' });
    } finally {
      setIsGeneratingPreview(false);
    }
  };


  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Handle section improvement
  const handleImproveSection = async (
    sectionName: string,
    sectionIndex: number,
    originalData: any
  ) => {
    if (!currentCvData) return;

    const sectionKey = `${sectionName}-${sectionIndex}`;
    setImprovingSections((prev) => ({ ...prev, [sectionKey]: true }));

    try {
      const improvedData = await improveSection(sectionName, originalData);

      // Update the CV data with improved section - deep copy to ensure proper change detection
      const updatedCv = JSON.parse(JSON.stringify(currentCvData));
      
      if (sectionName === 'work' && updatedCv.work) {
        updatedCv.work[sectionIndex] = { ...updatedCv.work[sectionIndex], ...improvedData };
      } else if (sectionName === 'education' && updatedCv.education) {
        updatedCv.education[sectionIndex] = { ...updatedCv.education[sectionIndex], ...improvedData };
      } else if (sectionName === 'skills' && updatedCv.skills) {
        updatedCv.skills[sectionIndex] = { ...updatedCv.skills[sectionIndex], ...improvedData };
      }

      setCurrentCvData(updatedCv);

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
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && currentCvData && hasUnsavedChanges) {
        e.preventDefault();
        handleSaveCv();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCvData, hasUnsavedChanges, handleSaveCv]);

  // State for collapsible ATS panel
  const [isAtsPanelOpen, setIsAtsPanelOpen] = useState<boolean>(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
        <div className="space-y-6">

      {/* Upload Section - Only show when no CV exists or when replacing */}
      {(!currentCvData || isReplacing) && !isLoadingCv && (
        <div className="mb-8 p-6 sm:p-8 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg bg-white dark:bg-gray-800 transition-all duration-300 hover:shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 p-3 rounded-xl shadow-sm">
                {isUploading ? (
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {isReplacing ? 'Replace CV' : 'Upload CV'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {isReplacing 
                    ? 'Upload a new CV file to replace your existing CV. We will use AI to parse it into a structured format.'
                    : 'Upload your CV in PDF or RTF format. We will use AI to parse it into a structured format.'}
                </p>
              </div>
            </div>
            {isReplacing && (
              <button
                onClick={() => setIsReplacing(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Cancel replacement"
              >
                Cancel
              </button>
            )}
          </div>

        <form onSubmit={handleSubmit}>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mb-6 p-8 sm:p-12 border-2 border-dashed rounded-xl transition-all duration-300 ${
              isDragging
                ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 scale-[1.02] shadow-lg'
                : 'border-gray-300 dark:border-gray-600 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800/50 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
          >
            <div className="text-center">
              {isUploading ? (
                <div className="mx-auto h-16 w-16 mb-4 flex items-center justify-center">
                  <svg className="animate-spin h-16 w-16 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4 transition-transform hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              <label htmlFor="cvFileInput" className="cursor-pointer block">
                <span className="text-base sm:text-lg font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                  Click to upload
                </span>
                <span className="text-base sm:text-lg text-gray-600 dark:text-gray-400"> or drag and drop</span>
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">PDF or RTF (MAX. 10MB)</p>
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
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/40 p-3 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    const fileInput = document.getElementById('cvFileInput') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';
                  }}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  disabled={isUploading}
                  title="Remove file"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedFile || isUploading}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Uploading and Processing...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Upload and Process CV</span>
              </>
            )}
          </button>
        </form>
        
        {/* Upload Error Display */}
        {uploadError && (
          <div className={`mt-4 p-4 rounded-lg border ${
            isApiKeyError(uploadError)
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
                <h3 className={`text-sm font-semibold mb-1 ${
                  isApiKeyError(uploadError)
                    ? 'text-amber-800 dark:text-amber-300'
                    : 'text-red-800 dark:text-red-300'
                }`}>
                  {isApiKeyError(uploadError) ? 'API Key Required' : 'Upload Error'}
                </h3>
                <p className={`text-sm mb-3 ${
                  isApiKeyError(uploadError)
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

      {/* CV Info Section - Show when CV exists and not replacing */}
      {currentCvData && !isLoadingCv && !isReplacing && (
        <div className="mb-8 p-6 sm:p-8 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg bg-white dark:bg-gray-800 transition-all duration-300 hover:shadow-xl">
          {/* Analysis Status Indicator */}
          {isAnalyzing && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-3 shadow-sm">
              <svg
                className="animate-spin h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0"
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
              <div>
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-300 block">
                  Analyzing CV sections...
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  AI is reviewing your CV for improvement suggestions
                </span>
              </div>
            </div>
          )}
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 p-3 rounded-xl shadow-sm">
                <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Your CV</h2>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                  {currentCvData.basics?.name || 'CV uploaded'}
                  {currentCvData.basics?.label && (
                    <span className="text-gray-500 dark:text-gray-400"> • {currentCvData.basics.label}</span>
                  )}
                </p>
                {/* Quick Stats */}
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  {hasUnsavedChanges && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-xs font-medium">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
                      Unsaved changes
                    </span>
                  )}
                  {atsScores && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      ATS Compatibility Checked
                    </span>
                  )}
                  {Object.keys(analyses).length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Section Improvement Suggestions Ready
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0">
              <button
                onClick={handlePreviewCv}
                disabled={isGeneratingPreview}
                className="px-4 py-2.5 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none"
                title="Preview your CV as a PDF"
              >
                {isGeneratingPreview ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="hidden sm:inline">Preview</span>
                    <span className="sm:hidden">Preview</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setIsReplacing(true);
                  setSelectedFile(null);
                }}
                className="px-4 py-2.5 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                title="Replace with a new CV file"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="hidden sm:inline">Replace</span>
                <span className="sm:hidden">Replace</span>
              </button>
              <button
                onClick={handleDeleteCv}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none"
                title="Delete your CV (cannot be undone)"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Deleting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="hidden sm:inline">Delete</span>
                    <span className="sm:hidden">Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ATS Analysis Panel - Show when CV exists and not replacing */}
      {currentCvData && !isLoadingCv && !isReplacing && (
        <div className="mb-8 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg bg-white dark:bg-gray-800 overflow-hidden transition-all duration-300 hover:shadow-xl">
          <button
            onClick={() => setIsAtsPanelOpen(!isAtsPanelOpen)}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 p-3 rounded-xl shadow-sm">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">ATS Analysis</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {atsScores ? 'Comprehensive ATS compatibility review' : 'Get insights on your CV\'s ATS compatibility'}
                </p>
              </div>
              {atsScores && (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-semibold">
                    Score: {atsScores.score !== null && atsScores.score !== undefined ? `${Math.round(atsScores.score)}%` : 'N/A'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!atsScores && !isScanningAts && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    runAtsAnalysis();
                  }}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                  title="Run ATS Analysis"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">Analyze</span>
                </button>
              )}
              <svg
                className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isAtsPanelOpen ? 'transform rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          {isAtsPanelOpen && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900/50">
              <GeneralCvAtsPanel atsScores={atsScores} isLoading={isScanningAts} />
            </div>
          )}
        </div>
      )}

      {/* Editor Section */}
      <div className="mb-8 p-6 sm:p-8 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg bg-white dark:bg-gray-800 transition-all duration-300 hover:shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 p-3 rounded-xl shadow-sm">
            <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Edit CV</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Review and edit your parsed CV data. Changes are saved when you click Save.
            </p>
          </div>
        </div>

        {isLoadingCv ? (
          <div className="space-y-6 py-8">
            <LoadingSkeleton lines={4} />
            <LoadingSkeleton lines={4} />
            <LoadingSkeleton lines={4} />
          </div>
        ) : currentCvData ? (
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
                data={currentCvData}
                onChange={handleCvChange}
                analyses={analyses}
                onImproveSection={handleImproveSection}
                improvingSections={improvingSections}
              />
            </div>
          </div>
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
      {currentCvData && hasUnsavedChanges && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row items-center gap-4 min-w-[280px] sm:min-w-0">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 flex-1">
              <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Unsaved changes</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleSaveCv}
                disabled={isSaving || isUploading}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
              <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400 px-2">Ctrl+S</span>
            </div>
          </div>
        </div>
      )}

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