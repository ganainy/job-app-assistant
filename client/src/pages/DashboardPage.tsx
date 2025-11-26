// client/src/pages/DashboardPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  getJobs,
  createJob,
  deleteJob,
  updateJob,
  JobApplication,
  CreateJobPayload,
  createJobFromUrlApi
} from '../services/jobApi';
import { getApiKeys } from '../services/settingsApi';
import JobStatusBadge from '../components/jobs/JobStatusBadge';
import JobRecommendationBadge from '../components/jobs/JobRecommendationBadge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import Toast from '../components/common/Toast';
import { getAllJobRecommendations, JobRecommendation } from '../services/jobRecommendationApi';

// Define type for the form data used in the Add/Edit modal
type JobFormData = Partial<Omit<JobApplication, '_id' | 'createdAt' | 'updatedAt' | 'generationStatus' | 'generatedCvFilename' | 'generatedCoverLetterFilename'>>;

// Explicitly list sortable keys for type safety
type SortableJobKeys = 'jobTitle' | 'companyName' | 'status' | 'createdAt' | 'language';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // --- Core State ---
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- Modal & Form State ---
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [formData, setFormData] = useState<JobFormData>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // --- Create from URL State ---
  const [urlInput, setUrlInput] = useState<string>('');
  const [isCreatingFromUrl, setIsCreatingFromUrl] = useState<boolean>(false);
  const [createFromUrlError, setCreateFromUrlError] = useState<string | null>(null);

  // --- Filtering & Sorting State ---
  const [filterText, setFilterText] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortableJobKeys>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // --- Toast State ---
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // --- API Key Status ---
  const [isGeminiKeyMissing, setIsGeminiKeyMissing] = useState<boolean>(false);
  const [isCheckingApiKeys, setIsCheckingApiKeys] = useState<boolean>(true);

  // --- Delete Confirmation Modal State ---
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; jobId: string | null; jobTitle: string }>({
    isOpen: false,
    jobId: null,
    jobTitle: ''
  });


  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState<number>(1);

  // --- Recommendations State ---
  const [recommendations, setRecommendations] = useState<Record<string, JobRecommendation>>({});
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState<boolean>(false);

  // --- useEffect: Check API keys status ---
  useEffect(() => {
    const checkApiKeys = async () => {
      setIsCheckingApiKeys(true);
      try {
        const apiKeys = await getApiKeys();
        setIsGeminiKeyMissing(!apiKeys.gemini.accessToken);
      } catch (err: any) {
        console.error("Failed to check API keys:", err);
        // If we can't check, assume key is missing to show warning
        setIsGeminiKeyMissing(true);
      } finally {
        setIsCheckingApiKeys(false);
      }
    };
    checkApiKeys();
  }, []);

  // --- useEffect: Fetch initial job data ---
  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedJobs = await getJobs();
        setJobs(fetchedJobs);
      } catch (err: any) {
        console.error("Failed to fetch jobs:", err);
        setError(err.message || "Failed to load job applications.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, []);

  // --- useEffect: Fetch recommendations when jobs are loaded ---
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (jobs.length === 0) {
        setRecommendations({});
        return;
      }
      
      setIsLoadingRecommendations(true);
      try {
        const fetchedRecommendations = await getAllJobRecommendations();
        setRecommendations(fetchedRecommendations);
      } catch (err: any) {
        console.error("Failed to fetch recommendations:", err);
        setRecommendations({});
      } finally {
        setIsLoadingRecommendations(false);
      }
    };
    
    if (!isLoading) {
      fetchRecommendations();
    }
  }, [jobs, isLoading]);

  // --- Function to refetch recommendations ---
  const refetchRecommendations = async () => {
    setIsLoadingRecommendations(true);
    try {
      const fetchedRecommendations = await getAllJobRecommendations();
      setRecommendations(fetchedRecommendations);
    } catch (err: any) {
      console.error("Failed to refetch recommendations:", err);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterText, filterStatus]);

  // --- Derived State: Filtered and Sorted Jobs ---
  const displayedJobs = useMemo(() => {
    let filteredJobs = [...jobs];

    // Apply Text Filter
    if (filterText) {
      const lowerCaseFilter = filterText.toLowerCase();
      filteredJobs = filteredJobs.filter(job =>
        job.jobTitle.toLowerCase().includes(lowerCaseFilter) ||
        job.companyName.toLowerCase().includes(lowerCaseFilter)
      );
    }

    // Apply Status Filter
    if (filterStatus) {
      filteredJobs = filteredJobs.filter(job => job.status === filterStatus);
    }

    // Apply Sorting
    if (sortKey) {
      filteredJobs.sort((a, b) => {
        const aValue = a[sortKey as keyof JobApplication] as any;
        const bValue = b[sortKey as keyof JobApplication] as any;

        let comparison = 0;

        if (sortKey === 'createdAt') {
          const dateA = new Date(aValue).getTime();
          const dateB = new Date(bValue).getTime();
          comparison = (isNaN(dateA) ? 0 : dateA) - (isNaN(dateB) ? 0 : dateB);
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else {
          const valA = aValue ?? '';
          const valB = bValue ?? '';
          if (valA < valB) comparison = -1;
          if (valA > valB) comparison = 1;
        }

        return sortDirection === 'asc' ? comparison : comparison * -1;
      });
    }

    return filteredJobs;
  }, [jobs, filterText, filterStatus, sortKey, sortDirection]);

  // --- Modal Event Handlers ---
  const handleOpenAddModal = () => {
    setFormData({ jobTitle: '', companyName: '', status: 'Not Applied', jobUrl: '', notes: '', language: 'en' });
    setCurrentJobId(null);
    setModalError(null);
    setModalMode('add');
  };

  const handleOpenEditModal = (job: JobApplication, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click navigation
    setCurrentJobId(job._id);
    setFormData({
      jobTitle: job.jobTitle,
      companyName: job.companyName,
      status: job.status,
      jobUrl: job.jobUrl,
      notes: job.notes,
      dateApplied: job.dateApplied,
      language: job.language
    });
    setModalError(null);
    setModalMode('edit');
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setModalMode(null);
    setCurrentJobId(null);
    setFormData({});
    setModalError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModalError(null);
    if (!formData.jobTitle || !formData.companyName) {
      setModalError("Job Title and Company Name are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (modalMode === 'add') {
        const payload = formData as CreateJobPayload;
        const createdJob = await createJob(payload);
        setJobs(prevJobs => [createdJob, ...prevJobs]);
        handleCloseModal();
        setToast({ message: 'Job application added successfully!', type: 'success' });
      } else if (modalMode === 'edit' && currentJobId) {
        const updatedJob = await updateJob(currentJobId, formData);
        setJobs(prevJobs => prevJobs.map(job => job._id === currentJobId ? updatedJob : job));
        handleCloseModal();
        setToast({ message: 'Job application updated successfully!', type: 'success' });
      }
    } catch (err: any) {
      console.error(`Failed to ${modalMode} job:`, err);
      setModalError(err.message || `Failed to ${modalMode === 'add' ? 'add' : 'update'} job.`);
      setToast({ message: err.message || `Failed to ${modalMode === 'add' ? 'add' : 'update'} job.`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Delete Handler ---
  const handleDeleteClick = (job: JobApplication, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click navigation
    setDeleteConfirmModal({
      isOpen: true,
      jobId: job._id,
      jobTitle: `${job.jobTitle} at ${job.companyName}`
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmModal.jobId) return;
    const jobId = deleteConfirmModal.jobId;
    setError(null);
    try {
      await deleteJob(jobId);
      setJobs(prevJobs => prevJobs.filter(job => job._id !== jobId));
      setRecommendations(prev => {
        const updated = { ...prev };
        delete updated[jobId];
        return updated;
      });
      setDeleteConfirmModal({ isOpen: false, jobId: null, jobTitle: '' });
      setToast({ message: 'Job application deleted successfully!', type: 'success' });
    } catch (err: any) {
      console.error(`Failed to delete job ${jobId}:`, err);
      setError(err.message || `Failed to delete job application.`);
      setToast({ message: err.message || 'Failed to delete job application.', type: 'error' });
      setDeleteConfirmModal({ isOpen: false, jobId: null, jobTitle: '' });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmModal({ isOpen: false, jobId: null, jobTitle: '' });
  };


  // Helper to check if error is about missing API key
  const isApiKeyError = (errorMessage: string): boolean => {
    return errorMessage.toLowerCase().includes('api key') || 
           errorMessage.toLowerCase().includes('gemini') ||
           errorMessage.toLowerCase().includes('apify');
  };

  // --- Create from URL Handler ---
  const handleCreateFromUrlSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!urlInput || !urlInput.startsWith('http')) {
      setCreateFromUrlError('Please enter a valid job URL.');
      return;
    }
    setIsCreatingFromUrl(true);
    setCreateFromUrlError(null);
    setError(null);

    try {
      const newJob = await createJobFromUrlApi(urlInput);
      setJobs(prevJobs => [newJob, ...prevJobs]);
      setUrlInput('');
      setToast({ message: 'Job application created from URL successfully!', type: 'success' });
    } catch (err: any) {
      console.error("Failed to create job from URL:", err);
      const errorMessage = err.message || 'Failed to process URL.';
      setCreateFromUrlError(errorMessage);
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setIsCreatingFromUrl(false);
    }
  };

  // --- Sort Handler ---
  const handleSort = (key: SortableJobKeys) => {
    if (sortKey === key) {
      setSortDirection(prevDir => prevDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // --- Navigation Handler ---
  const handleRowClick = (jobId: string) => {
    navigate(`/jobs/${jobId}/review`);
  };


  // --- Helper function to render sort indicators ---
  const renderSortArrow = (key: SortableJobKeys) => {
    if (sortKey !== key) return null;
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  // Define status options for filter dropdown
  const statusOptions: JobApplication['status'][] = ['Not Applied', 'Applied', 'Interview', 'Assessment', 'Rejected', 'Closed', 'Offer'];

  // Icon components
  const AddIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );

  const LinkIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );

  const SearchIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );

  const ArrowDownIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );


  const EditIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );

  const DeleteIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );

  const ChevronLeftIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );

  const ChevronRightIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );

  // --- Render Loading State ---
  if (isLoading) {
    return (
      <div className="h-full p-8">
        <LoadingSkeleton lines={5} />
      </div>
    );
  }

  // --- Render Error State ---
  if (error && !isLoading) {
    return (
      <div className="h-full p-8">
        <div className="p-4 mb-4 text-sm text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-800" role="alert">
          <span className="font-medium">Error:</span> {error}
          <button onClick={() => window.location.reload()} className='ml-4 underline text-xs'>Try Reloading</button>
        </div>
      </div>
    );
  }

  // Calculate pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(displayedJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedJobs = displayedJobs.slice(startIndex, endIndex);

  // --- Main Dashboard Content ---
  return (
    <div className="h-full flex flex-col">

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Persistent API Key Warning Banner */}
        {!isCheckingApiKeys && isGeminiKeyMissing && (
          <div className="mb-6 p-4 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold mb-1 text-amber-800 dark:text-amber-300">
                  API Key Required
                </h3>
                <p className="text-sm mb-3 text-amber-700 dark:text-amber-400">
                  Gemini API key is required to use AI features like job extraction, CV analysis, and document generation. Please add your Gemini API key in Settings. You can get a free API key from{' '}
                  <a 
                    href="https://makersuite.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-900 dark:hover:text-amber-300"
                  >
                    https://makersuite.google.com/app/apikey
                  </a>
                </p>
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
              </div>
            </div>
          </div>
        )}

      {/* Add Job Section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
        <button
          onClick={handleOpenAddModal}
              className="w-full md:w-auto flex-shrink-0 bg-indigo-600 dark:bg-indigo-600 text-white font-semibold py-2.5 px-6 rounded-md flex items-center justify-center gap-2 hover:bg-indigo-700 dark:hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
          disabled={isSubmitting || isCreatingFromUrl}
        >
              <AddIcon />
              <span>Add New Job Manually</span>
        </button>
            <form onSubmit={handleCreateFromUrlSubmit} className="relative flex-grow w-full">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                <LinkIcon />
              </div>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setCreateFromUrlError(null); }}
              placeholder="Paste Job URL to auto-create..."
                className="w-full bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-indigo-600 dark:focus:ring-indigo-500 rounded-md pl-12 py-2.5 pr-40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-50"
              disabled={isCreatingFromUrl}
            />
            <button
              type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-1.5 px-4 rounded-md text-sm hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isCreatingFromUrl || !urlInput}
            >
                {isCreatingFromUrl ? 'Processing...' : 'Create from URL'}
            </button>
          </form>
        </div>
          {createFromUrlError && (
            <div className={`p-4 rounded-lg border ${
              isApiKeyError(createFromUrlError)
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                : 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {isApiKeyError(createFromUrlError) ? (
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
                    isApiKeyError(createFromUrlError)
                      ? 'text-amber-800 dark:text-amber-300'
                      : 'text-red-800 dark:text-red-300'
                  }`}>
                    {isApiKeyError(createFromUrlError) ? 'API Key Required' : 'Error'}
                  </h3>
                  <p className={`text-sm mb-3 ${
                    isApiKeyError(createFromUrlError)
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}>
                    {createFromUrlError}
                  </p>
                  {isApiKeyError(createFromUrlError) && (
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

      {/* Filter Controls */}
        <div>
            <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
              <div className="w-full md:w-1/3">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1" htmlFor="filter-title">Filter by Title/Company</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <SearchIcon />
                  </div>
          <input
            type="text"
                    id="filter-title"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Enter text..."
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-indigo-600 dark:focus:ring-indigo-500 rounded-md pl-10 h-10 text-slate-900 dark:text-slate-100"
          />
        </div>
              </div>
              <div className="w-full md:w-auto">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1" htmlFor="filter-status">Filter by Status</label>
                <select
                  id="filter-status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-indigo-600 dark:focus:ring-indigo-500 rounded-md h-10 px-3 text-slate-900 dark:text-slate-100"
                >
            <option value="">All Statuses</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

            {/* Table */}
            <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
      {displayedJobs.length === 0 ? (
        <div className="text-center py-12 px-4">
          {jobs.length > 0 ? (
            <>
                      <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">No matches found</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                No job applications match your current filters. Try adjusting your search or filter criteria.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => { setFilterText(''); setFilterStatus(''); }}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Clear Filters
                </button>
              </div>
            </>
          ) : (
            <>
                      <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">No job applications</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Get started by adding a new job application manually or by pasting a job URL above.
              </p>
              <div className="mt-6">
                <button
                  onClick={handleOpenAddModal}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                          <AddIcon />
                          <span className="ml-2">Add Your First Job</span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
                <>
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th className="p-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Job Title</th>
                        <th className="p-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Company</th>
                        <th className="p-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Status</th>
                        <th className="p-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Job Match Score</th>
                        <th
                          onClick={() => handleSort('createdAt')}
                          className="p-4 text-sm font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <div className="flex items-center gap-1">
                            <span>Date Added</span>
                            {sortKey === 'createdAt' && <ArrowDownIcon />}
                          </div>
                </th>
                        <th className="p-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Language</th>
                        <th className="p-4 text-sm font-semibold text-slate-500 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
                    <tbody>
                      {paginatedJobs.map((job) => (
                <tr
                  key={job._id}
                  onClick={() => handleRowClick(job._id)}
                          className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                          <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{job.jobTitle}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{job.companyName}</td>
                          <td className="p-4">
                            <JobStatusBadge type="application" status={job.status} />
                          </td>
                          <td className="p-4">
                            <JobRecommendationBadge 
                              recommendation={recommendations[job._id] || null}
                              isLoading={isLoadingRecommendations}
                            />
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">
                            {new Date(job.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                  </td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{job.language ? job.language.toUpperCase() : '-'}</td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleOpenEditModal(job, e)}
                                className="flex items-center justify-center w-8 h-8 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                title="Edit"
                      >
                                <EditIcon />
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(job, e)}
                                className="flex items-center justify-center w-8 h-8 rounded-md text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                title="Delete"
                      >
                                <DeleteIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Showing {startIndex + 1} to {Math.min(endIndex, displayedJobs.length)} of {displayedJobs.length} results
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center justify-center w-9 h-9 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeftIcon />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`flex items-center justify-center w-9 h-9 rounded-md text-sm font-semibold transition-colors ${
                            currentPage === page
                              ? 'bg-indigo-600 dark:bg-indigo-600 text-white'
                              : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center justify-center w-9 h-9 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRightIcon />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      {/* Add/Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-80 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg mx-4 sm:mx-0 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {modalMode === 'add' ? 'Add New Job Manually' : 'Edit Job Application'}
              </h2>
              <button
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col">
              {modalError && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded border border-red-300 dark:border-red-800">
                  {modalError}
                </div>
              )}

              <div className="flex-1 overflow-y-auto pr-1">
                {/* Job Title */}
                <div className="mb-5">
                  <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Job Title <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="jobTitle"
                    name="jobTitle"
                    value={formData.jobTitle || ''}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  />
                </div>

                {/* Company Name */}
                <div className="mb-5">
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Company Name <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    value={formData.companyName || ''}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  />
                </div>

                {/* Status and Language - Side by Side */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  {/* Status */}
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status || 'Not Applied'}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors appearance-none cursor-pointer"
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status} className="bg-white dark:bg-gray-700">{status}</option>
                      ))}
                    </select>
                  </div>

                  {/* Language */}
                  <div>
                    <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Language
                    </label>
                    <select
                      id="language"
                      name="language"
                      value={formData.language || 'en'}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors appearance-none cursor-pointer"
                    >
                      <option value="en" className="bg-white dark:bg-gray-700">English</option>
                      <option value="de" className="bg-white dark:bg-gray-700">German</option>
                    </select>
                  </div>
                </div>

                {/* Job URL */}
                <div className="mb-5">
                  <label htmlFor="jobUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Job URL
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <input
                      type="url"
                      id="jobUrl"
                      name="jobUrl"
                      value={formData.jobUrl || ''}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-5">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={formData.notes || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 dark:bg-purple-600 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {modalMode === 'add' ? 'Adding...' : 'Updating...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {modalMode === 'add' ? 'Add Job' : 'Update Job'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-80 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Delete Job Application</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Are you sure you want to delete this job application? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md mb-4">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{deleteConfirmModal.jobTitle}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
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
  );
};

export default DashboardPage;