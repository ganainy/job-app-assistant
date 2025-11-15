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
    setFormData({ jobTitle: '', companyName: '', status: 'Not Applied', jobUrl: '', notes: '' });
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
      } else if (modalMode === 'edit' && currentJobId) {
        const updatedJob = await updateJob(currentJobId, formData);
        setJobs(prevJobs => prevJobs.map(job => job._id === currentJobId ? updatedJob : job));
        handleCloseModal();
      }
    } catch (err: any) {
      console.error(`Failed to ${modalMode} job:`, err);
      setModalError(err.message || `Failed to ${modalMode === 'add' ? 'add' : 'update'} job.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Delete Handler ---
  const handleDeleteJob = async (jobId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click navigation
    if (!window.confirm('Are you sure you want to delete this job application?')) return;
    setError(null);
    try {
      await deleteJob(jobId);
      setJobs(prevJobs => prevJobs.filter(job => job._id !== jobId));
    } catch (err: any) {
      console.error(`Failed to delete job ${jobId}:`, err);
      setError(err.message || `Failed to delete job application.`);
    }
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
    } catch (err: any) {
      console.error("Failed to create job from URL:", err);
      setCreateFromUrlError(err.message || 'Failed to process URL.');
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

  // --- Render Loading State ---
  if (isLoading) {
    return <div className="text-center p-10 text-gray-900 dark:text-gray-300">Loading jobs...</div>;
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

      {/* Add Job Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <button
            onClick={handleOpenAddModal}
            className="w-full md:w-auto px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50"
            disabled={isSubmitting || isCreatingFromUrl}
          >
            Add New Job Manually
          </button>
        </div>
        <form onSubmit={handleCreateFromUrlSubmit} className="space-y-2 md:space-y-0 md:flex md:gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); setCreateFromUrlError(null); }}
            placeholder="Paste Job URL to auto-create..."
            required
            className="flex-grow w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isCreatingFromUrl}
          />
          <button
            type="submit"
            className="w-full md:w-auto px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isCreatingFromUrl || !urlInput}
          >
            {isCreatingFromUrl ? 'Processing URL...' : 'Create from URL'}
          </button>
        </form>
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
        <p className='text-center text-gray-500 dark:text-gray-400 mt-6'>
          {jobs.length > 0 ? 'No job applications match your current filters.' : 'No job applications found. Add one manually or paste a URL above.'}
        </p>
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
                  <td className="py-3 px-4 text-gray-900 dark:text-gray-300">{job.jobTitle}</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-gray-300">{job.companyName}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium">{job.status}</span>
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
                    <button
                      onClick={(e) => handleOpenEditModal(job, e)}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium mx-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => handleDeleteJob(job._id, e)}
                      className="text-red-600 dark:text-red-400 hover:underline text-xs font-medium mx-2"
                    >
                      Delete
                    </button>
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
    </div>
  );
};

export default DashboardPage;


