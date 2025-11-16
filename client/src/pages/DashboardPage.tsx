// client/src/pages/DashboardPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getJobs,
  createJob,
  deleteJob,
  updateJob,
  JobApplication,
  CreateJobPayload,
  createJobFromUrlApi
} from '../services/jobApi';
import JobStatusBadge from '../components/jobs/JobStatusBadge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import Toast from '../components/common/Toast';

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

  // --- Delete Confirmation Modal State ---
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; jobId: string | null; jobTitle: string }>({
    isOpen: false,
    jobId: null,
    jobTitle: ''
  });

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
      setCreateFromUrlError(err.message || 'Failed to process URL.');
      setToast({ message: err.message || 'Failed to process URL.', type: 'error' });
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

  // --- Statistics Calculation ---
  const statistics = useMemo(() => {
    const total = jobs.length;
    const statusCounts = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivity = jobs.filter(job => {
      const createdDate = new Date(job.createdAt);
      return createdDate >= sevenDaysAgo;
    }).length;

    return {
      total,
      statusCounts,
      recentActivity,
      applied: statusCounts['Applied'] || 0,
      interview: statusCounts['Interview'] || 0,
      offer: statusCounts['Offer'] || 0,
      rejected: statusCounts['Rejected'] || 0
    };
  }, [jobs]);

  // --- Render Loading State ---
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Job Application Dashboard</h1>
        
        {/* Statistics Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <LoadingSkeleton lines={2} />
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <LoadingSkeleton key={i} lines={1} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Render Error State ---
  if (error && !isLoading) {
    return (
      <div className="container mx-auto p-4 relative">
        <div className="p-4 mb-4 text-sm text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-800" role="alert">
          <span className="font-medium">Error:</span> {error}
          <button onClick={() => window.location.reload()} className='ml-4 underline text-xs'>Try Reloading</button>
        </div>
      </div>
    );
  }

  // --- Main Dashboard Content ---
  return (
    <div className="container mx-auto p-4 relative">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Job Application Dashboard</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Jobs Card */}
        <div
          onClick={() => setFilterStatus('')}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Applications</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{statistics.total}</p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Applied Card */}
        <div
          onClick={() => setFilterStatus('Applied')}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Applied</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{statistics.applied}</p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full">
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Interview Card */}
        <div
          onClick={() => setFilterStatus('Interview')}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Interviews</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{statistics.interview}</p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Recent (7 days)</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{statistics.recentActivity}</p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-full">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Add Job Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 transition-colors flex items-center gap-2 font-medium"
          disabled={isSubmitting || isCreatingFromUrl}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Job Manually
        </button>
        <div className="flex-1 flex flex-col sm:flex-row gap-2">
          <form onSubmit={handleCreateFromUrlSubmit} className="flex-1 flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setCreateFromUrlError(null); }}
              placeholder="Paste Job URL to auto-create..."
              required
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={isCreatingFromUrl}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
              disabled={isCreatingFromUrl || !urlInput}
            >
              {isCreatingFromUrl ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Create from URL
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      {createFromUrlError && <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded border border-red-300 dark:border-red-800">{createFromUrlError}</div>}

      {/* Filter Controls */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
        <div>
          <label htmlFor="filterText" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Title/Company:</label>
          <input
            type="text"
            id="filterText"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Enter text..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Status:</label>
          <select
            id="filterStatus"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">All Statuses</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Job List */}
      {displayedJobs.length === 0 ? (
        <div className="text-center py-12 px-4">
          {jobs.length > 0 ? (
            <>
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No matches found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                No job applications match your current filters. Try adjusting your search or filter criteria.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => { setFilterText(''); setFilterStatus(''); }}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear Filters
                </button>
              </div>
            </>
          ) : (
            <>
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No job applications</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by adding a new job application manually or by pasting a job URL above.
              </p>
              <div className="mt-6">
                <button
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Your First Job
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto shadow-md sm:rounded-lg">
          <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs leading-normal">
              <tr>
                <th onClick={() => handleSort('jobTitle')} className="py-3 px-4 border-b border-gray-200 dark:border-gray-600 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600">
                  Job Title{renderSortArrow('jobTitle')}
                </th>
                <th onClick={() => handleSort('companyName')} className="py-3 px-4 border-b border-gray-200 dark:border-gray-600 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600">
                  Company{renderSortArrow('companyName')}
                </th>
                <th onClick={() => handleSort('status')} className="py-3 px-4 border-b border-gray-200 dark:border-gray-600 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600">
                  Status{renderSortArrow('status')}
                </th>
                <th onClick={() => handleSort('createdAt')} className="py-3 px-4 border-b border-gray-200 dark:border-gray-600 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600">
                  Date Added{renderSortArrow('createdAt')}
                </th>
                <th onClick={() => handleSort('language')} className="py-3 px-4 border-b border-gray-200 dark:border-gray-600 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600">
                  Language{renderSortArrow('language')}
                </th>
                <th className="py-3 px-4 border-b border-gray-200 dark:border-gray-600 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-900 dark:text-gray-300">
              {displayedJobs.map((job) => (
                <tr
                  key={job._id}
                  onClick={() => handleRowClick(job._id)}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <td className="py-3 px-4 text-gray-900 dark:text-gray-300 font-medium">{job.jobTitle}</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-gray-300">{job.companyName}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      <JobStatusBadge type="application" status={job.status} />
                      {job.generationStatus && job.generationStatus !== 'none' && (
                        <JobStatusBadge type="generation" status={job.generationStatus} />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-900 dark:text-gray-300">{new Date(job.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    {job.language ? (
                      <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-medium uppercase">
                        {job.language}
                      </span>
                    ) : ('-')}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={(e) => handleOpenEditModal(job, e)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium flex items-center gap-1 transition-colors"
                        title="Edit job application"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(job, e)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium flex items-center gap-1 transition-colors"
                        title="Delete job application"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-80 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg mx-4 sm:mx-0">
            <h2 className="text-2xl font-semibold mb-5 text-gray-900 dark:text-gray-100">
              {modalMode === 'add' ? 'Add New Job Manually' : 'Edit Job Application'}
            </h2>
            <form onSubmit={handleFormSubmit}>
              {modalError && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded border border-red-300 dark:border-red-800">
                  {modalError}
                </div>
              )}

              {/* Job Title */}
              <div className="mb-4">
                <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Job Title <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="jobTitle"
                  name="jobTitle"
                  value={formData.jobTitle || ''}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Company Name */}
              <div className="mb-4">
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company Name <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName || ''}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status */}
              <div className="mb-4">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status || 'Not Applied'}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* Language */}
              <div className="mb-4">
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Language
                </label>
                <select
                  id="language"
                  name="language"
                  value={formData.language || 'en'}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="en">English</option>
                  <option value="de">German</option>
                </select>
              </div>

              {/* Job URL */}
              <div className="mb-4">
                <label htmlFor="jobUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Job URL
                </label>
                <input
                  type="url"
                  id="jobUrl"
                  name="jobUrl"
                  value={formData.jobUrl || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://..."
                />
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 border-t pt-4 border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {isSubmitting ? (modalMode === 'add' ? 'Adding...' : 'Updating...') : (modalMode === 'add' ? 'Add Job' : 'Update Job')}
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delete Job Application</h3>
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
  );
};

export default DashboardPage;


