// client/src/pages/DashboardPage.tsx
import React, { useState, useEffect ,useMemo} from 'react';
import {
  getJobs,
  createJob,
  deleteJob,
  updateJob,
  JobApplication,
  CreateJobPayload,
  scrapeJobDescriptionApi
} from '../services/jobApi';
// Import generator service functions
import {
  generateDocuments,
  getDownloadUrl
} from '../services/generatorApi';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { createJobFromUrlApi } from '../services/jobApi';

// Define type for the form data used in the Add/Edit modal
type JobFormData = Partial<Omit<JobApplication, '_id' | 'createdAt' | 'updatedAt'>>;

// --- Helper type for Sort Key ---
// Explicitly list sortable keys for type safety
type SortableJobKeys = 'jobTitle' | 'companyName' | 'status' | 'createdAt' | 'language';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();


  // ---  Download Handler ---
  const handleDownloadFile = async (filename: string) => {
    if (!filename) return;
    console.log(`Attempting to download: ${filename}`);
    // Construct the full URL for the API endpoint
    const downloadUrl = getDownloadUrl(filename); // Your helper function

    try {
      // Make the request using Axios to include the auth header
      const response = await axios.get(downloadUrl, {
        responseType: 'blob', // Important: Ask for the response as binary data (Blob)
        // NOTE: If you configured axios defaults correctly in AuthContext,
        // the Authorization header should be included automatically.
        // If not, add it manually here:
        // headers: {
        //     Authorization: `Bearer ${token}` // Get token from useAuth()
        // }
      });

      // Create a URL for the blob object
      const fileURL = window.URL.createObjectURL(new Blob([response.data]));

      // Create a temporary link element
      const link = document.createElement('a');
      link.href = fileURL;
      link.setAttribute('download', filename); // Set the desired filename
      document.body.appendChild(link); // Append link to body

      // Simulate a click on the link
      link.click();

      // Clean up: remove the link and revoke the object URL
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(fileURL);

    } catch (error: any) {
      console.error(`Failed to download file ${filename}:`, error);
      // Display error to the user (e.g., set an error state, show a toast)
      // You might want to check error.response?.data for backend messages
      setError(`Failed to download ${filename}. Please try generating again.`); // Use general error state or a dedicated one
    }
  };

  // --- Core State ---
  const [jobs, setJobs] = useState<JobApplication[]>([]); // List of job applications
  const [isLoading, setIsLoading] = useState<boolean>(true); // Initial page load status
  const [error, setError] = useState<string | null>(null); // General errors (fetching/deleting)

  // --- Modal & Form State ---
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null); // Modal purpose: null, 'add', or 'edit'
  const [currentJobId, setCurrentJobId] = useState<string | null>(null); // ID of job being edited
  const [formData, setFormData] = useState<JobFormData>({}); // Data for the modal form
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // Modal form submission status
  const [modalError, setModalError] = useState<string | null>(null); // Errors specific to the modal form

  // --- Delete State ---
  const [deletingId, setDeletingId] = useState<string | null>(null); // ID of job currently being deleted

  // --- Generator State ---
  const [generatingId, setGeneratingId] = useState<string | null>(null); // ID of job currently generating documents
  const [generatedFiles, setGeneratedFiles] = useState<{ [jobId: string]: { cv: string, cl: string } }>({}); // Stores filenames of generated PDFs per job ID
  const [generatorError, setGeneratorError] = useState<{ [jobId: string]: string | null }>({}); // Stores generation errors per job ID

  // ---  Scraper State ---
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [scrapeError, setScrapeError] = useState<{ [jobId: string]: string | null }>({});

  // ---  State for Create Job from URL ---
  const [urlInput, setUrlInput] = useState<string>('');
  const [isCreatingFromUrl, setIsCreatingFromUrl] = useState<boolean>(false);
  const [createFromUrlError, setCreateFromUrlError] = useState<string | null>(null);

  // ---  State for Filtering & Sorting ---
  const [filterText, setFilterText] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>(''); // Empty string means 'All'
  const [sortKey, setSortKey] = useState<SortableJobKeys>('createdAt'); // Default sort
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Default direction


  // --- useEffect: Fetch initial job data (keep as is) ---
  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedJobs = await getJobs();
        setJobs(fetchedJobs);
      } catch (err: any) { // Catch as any to access message potentially
        console.error("Failed to fetch jobs:", err);
        setError(err.message || "Failed to load job applications.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, []);


  // --- Derived State: Filtered and Sorted Jobs using useMemo ---
  // This recalculates only when dependencies change
  const displayedJobs = useMemo(() => {
    let filteredJobs = [...jobs]; // Start with a copy of the original jobs

    // Apply Text Filter (Job Title or Company Name)
    if (filterText) {
      const lowerCaseFilter = filterText.toLowerCase();
      filteredJobs = filteredJobs.filter(job =>
        job.jobTitle.toLowerCase().includes(lowerCaseFilter) ||
        job.companyName.toLowerCase().includes(lowerCaseFilter)
      );
    }

    // Apply Status Filter
    if (filterStatus && filterStatus !== '') { // Check if filterStatus is not empty
      filteredJobs = filteredJobs.filter(job => job.status === filterStatus);
    }


    // Apply Sorting
    if (sortKey) {
      filteredJobs.sort((a, b) => {
        // Use type assertion or handle potential undefined keys safely
        const aValue = a[sortKey as keyof JobApplication] as any;
        const bValue = b[sortKey as keyof JobApplication] as any;

        let comparison = 0;

        // Handle different data types for comparison
        if (sortKey === 'createdAt') {
          comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          // Basic fallback for potentially null/undefined or mixed types
          if (aValue < bValue) comparison = -1;
          if (aValue > bValue) comparison = 1;
        }


        return sortDirection === 'asc' ? comparison : comparison * -1; // Apply direction
      });
    }

    return filteredJobs;
  }, [jobs, filterText, filterStatus, sortKey, sortDirection]); // Dependencies for recalculation


  // --- useEffect: Fetch initial job data on component mount ---
  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedJobs = await getJobs();
        setJobs(fetchedJobs);
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
        setError("Failed to load job applications. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- CRUD Event Handlers ---

  // Opens the modal in 'add' mode
  const handleOpenAddModal = () => {
    setFormData({ jobTitle: '', companyName: '', status: 'Not Applied', jobUrl: '', notes: '' });
    setCurrentJobId(null);
    setModalError(null);
    setModalMode('add');
  };

  // Opens the modal in 'edit' mode, pre-filling with job data
  const handleOpenEditModal = (job: JobApplication) => {
    setCurrentJobId(job._id);
    setFormData({
      jobTitle: job.jobTitle, companyName: job.companyName, status: job.status,
      jobUrl: job.jobUrl, notes: job.notes, dateApplied: job.dateApplied,
      jobDescriptionText: job.jobDescriptionText
    });
    setModalError(null);
    setModalMode('edit');
  };

  // Closes the Add/Edit modal
  const handleCloseModal = () => {
    if (isSubmitting) return;
    setModalMode(null);
    setCurrentJobId(null);
    setFormData({});
    setModalError(null);
  };

  // Updates form data state on input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handles form submission for both Add and Edit
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
        setJobs(prevJobs => [createdJob, ...prevJobs]); // Prepend new job
        handleCloseModal();
      } else if (modalMode === 'edit' && currentJobId) {
        const payload = formData;
        const updatedJob = await updateJob(currentJobId, payload);
        setJobs(prevJobs => prevJobs.map(job => job._id === currentJobId ? updatedJob : job)); // Replace updated job
        handleCloseModal();
      }
    } catch (err: any) {
      console.error(`Failed to ${modalMode} job:`, err);
      setModalError(err.message || `Failed to ${modalMode === 'add' ? 'add' : 'update'} job.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handles job deletion
  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this job application?')) return;
    setDeletingId(jobId);
    setError(null);
    try {
      await deleteJob(jobId);
      setJobs(prevJobs => prevJobs.filter(job => job._id !== jobId)); // Remove from list
    } catch (err: any) {
      console.error(`Failed to delete job ${jobId}:`, err);
      setError(err.message || `Failed to delete job application.`);
    } finally {
      setDeletingId(null);
    }
  };

  // --- Generator Event Handler ---

  // Handles triggering the document generation process
  const handleGenerateDocs = async (jobId: string) => {
    setGeneratingId(jobId); // Set loading state for this specific job row
    setGeneratorError(prev => ({ ...prev, [jobId]: null })); // Clear previous errors for this job
    setGeneratedFiles(prev => { // Clear previous generated file links for this job
      const newState = { ...prev };
      delete newState[jobId];
      return newState;
    });
    setError(null); // Clear general page errors

    try {
      const response = await generateDocuments(jobId); // Call the generator API
      // Store the filenames returned by the backend
      setGeneratedFiles(prev => ({
        ...prev,
        [jobId]: {
          cv: response.cvFilename,
          cl: response.coverLetterFilename
        }
      }));
      console.log(`Docs generated for ${jobId}:`, response);
      // Optionally show a success toast notification here
    } catch (err: any) {
      console.error(`Failed to generate documents for job ${jobId}:`, err);
      // Set error specific to this job row
      setGeneratorError(prev => ({
        ...prev,
        [jobId]: err.message || 'Document generation failed.'
      }));
      // Optionally set the general page error as well
      // setError(`Failed to generate documents for job ${jobId}.`);
    } finally {
      setGeneratingId(null); // Clear loading state for this job row
    }
  };


  // ---  Scrape Handler ---
  const handleScrapeDescription = async (job: JobApplication) => {
    if (!job.jobUrl) {
      console.warn("No URL to scrape for job:", job._id);
      // Maybe set a specific error?
      setScrapeError(prev => ({ ...prev, [job._id]: "No URL available for scraping." }));
      return;
    }
    setScrapingId(job._id);
    setScrapeError(prev => ({ ...prev, [job._id]: null })); // Clear previous error
    setError(null); // Clear general error

    try {
      // Pass the job's URL to the API service function
      const response = await scrapeJobDescriptionApi(job._id, job.jobUrl);
      // Update the specific job in the state with the new description
      setJobs(prevJobs => prevJobs.map(j =>
        j._id === job._id ? response.job : j // Replace with the updated job from response
      ));
      // Optionally show success feedback
      console.log("Scraping successful for job:", job._id);

    } catch (err: any) {
      console.error(`Failed to scrape description for job ${job._id}:`, err);
      setScrapeError(prev => ({ ...prev, [job._id]: err.message || 'Scraping failed.' }));
    } finally {
      setScrapingId(null);
    }
  };


  // ---  Handler for Create from URL ---
  const handleCreateFromUrlSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!urlInput || !urlInput.startsWith('http')) {
      setCreateFromUrlError('Please enter a valid job URL.');
      return;
    }
    setIsCreatingFromUrl(true);
    setCreateFromUrlError(null);
    setError(null); // Clear general errors

    try {
      const newJob = await createJobFromUrlApi(urlInput);
      setJobs(prevJobs => [newJob, ...prevJobs]); // Prepend the new job
      setUrlInput(''); // Clear the input field on success
      // Show success feedback? (e.g., toast)
    } catch (err: any) {
      console.error("Failed to create job from URL:", err);
      setCreateFromUrlError(err.message || 'Failed to process URL.');
    } finally {
      setIsCreatingFromUrl(false);
    }
  };


  // ---  Handler for Sorting ---
  const handleSort = (key: SortableJobKeys) => {
    if (sortKey === key) {
      // If clicking the same key, toggle direction
      setSortDirection(prevDir => prevDir === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new key, set key and default to ascending
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // --- Helper function to render sort indicators ---
  const renderSortArrow = (key: SortableJobKeys) => {
    if (sortKey !== key) return null; // No indicator if not sorting by this key
    return sortDirection === 'asc' ? ' ▲' : ' ▼'; // Up for asc, Down for desc
  };

  // --- Render Logic ---

  // Display loading indicator during initial data fetch
  if (isLoading) {
    return <div className="text-center p-10">Loading jobs...</div>;
  }

  // Display general error message (e.g., initial load failed)
  if (error && !isLoading) { // Show error only if not loading
    return (
      <div className="container mx-auto p-4 relative">
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg border border-red-300" role="alert">
          <span className="font-medium">Error:</span> {error}
          {/* Button to try fetching again */}
          <button onClick={() => window.location.reload()} className='ml-4 underline text-xs'>Try Reloading</button>
        </div>
        <h1 className="text-3xl font-bold mb-6">Job Application Dashboard</h1>
      </div>
    );
  }

  // Define status options for filter dropdown
  const statusOptions: JobApplication['status'][] = ['Not Applied', 'Applied', 'Interview', 'Assessment', 'Rejected', 'Closed', 'Offer'];


  // Main dashboard content
  return (
    <div className="container mx-auto p-4 relative">
      <h1 className="text-3xl font-bold mb-6">Job Application Dashboard</h1>

      {/* --- Add Job Section --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Manual Add Button */}
        <div>
          <button onClick={handleOpenAddModal} className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" disabled={isSubmitting || isCreatingFromUrl} > Add New Job Manually </button>
        </div>
        {/* Create from URL Form */}
        <form onSubmit={handleCreateFromUrlSubmit} className="space-y-2 md:space-y-0 md:flex md:gap-2">
          <input type="url" value={urlInput} onChange={(e) => { setUrlInput(e.target.value); setCreateFromUrlError(null); }} placeholder="Paste Job URL to auto-create..." required className="flex-grow w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" disabled={isCreatingFromUrl} />
          <button type="submit" className="w-full md:w-auto px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isCreatingFromUrl || !urlInput} > {isCreatingFromUrl ? 'Processing URL...' : 'Create from URL'} </button>
        </form>
      </div>
      {createFromUrlError && <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded border border-red-300">{createFromUrlError}</div>}

      {/* --- Filter Controls --- */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
        <div>
          <label htmlFor="filterText" className="block text-sm font-medium text-gray-700 mb-1">Filter by Title/Company:</label>
          <input type="text" id="filterText" value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Enter text..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm" />
        </div>
        <div>
          <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700 mb-1">Filter by Status:</label>
          <select id="filterStatus" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm" >
            <option value="">All Statuses</option>
            {statusOptions.map(status => (<option key={status} value={status}>{status}</option>))}
          </select>
        </div>
      </div>

      {/* Job list table or message */}
      {displayedJobs.length === 0 && !isLoading ? (
        <p className='text-center text-gray-500 mt-6'> {jobs.length > 0 ? 'No job applications match your current filters.' : 'No job applications found. Add one manually or paste a URL above.'} </p>
      ) : (
        <div className="overflow-x-auto shadow-md sm:rounded-lg">
          <table className="min-w-full bg-white border border-gray-200 text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs leading-normal">
              <tr>
                <th className="py-3 px-4 border-b border-gray-200 text-left cursor-pointer hover:bg-gray-200" onClick={() => handleSort('jobTitle')}> Job Title{renderSortArrow('jobTitle')} </th>
                <th className="py-3 px-4 border-b border-gray-200 text-left cursor-pointer hover:bg-gray-200" onClick={() => handleSort('companyName')}> Company{renderSortArrow('companyName')} </th>
                <th className="py-3 px-4 border-b border-gray-200 text-left cursor-pointer hover:bg-gray-200" onClick={() => handleSort('status')}> Status{renderSortArrow('status')} </th>
                <th className="py-3 px-4 border-b border-gray-200 text-left cursor-pointer hover:bg-gray-200" onClick={() => handleSort('createdAt')}> Date Added{renderSortArrow('createdAt')} </th>
                <th className="py-3 px-4 border-b border-gray-200 text-left cursor-pointer hover:bg-gray-200" onClick={() => handleSort('language')}> Language{renderSortArrow('language')} </th>
                <th className="py-3 px-4 border-b border-gray-200 text-left">Description Status</th> {/* Not sortable */}
                <th className="py-3 px-4 border-b border-gray-200 text-center">Actions</th> {/* Not sortable */}
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {displayedJobs.map((job) => (
                <tr key={job._id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4">{job.jobTitle}</td>
                  <td className="py-3 px-4">{job.companyName}</td>
                  <td className="py-3 px-4"> <span className="px-2 py-1 text-xs rounded bg-gray-200 font-medium">{job.status}</span> </td>
                  <td className="py-3 px-4"> {new Date(job.createdAt).toLocaleDateString()} </td>
                  <td className="py-3 px-4"> {job.language ? (<span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 font-medium uppercase">{job.language}</span>) : ('-')} </td>
                  <td className="py-3 px-4 text-left align-top">
                    {job.jobDescriptionText && job.jobDescriptionText.length > 10 ? (<span className="text-xs text-green-600 bg-green-50 p-1 rounded inline-block" title={job.jobDescriptionText.substring(0, 150) + '...'}> Desc. OK </span>
                    ) : job.jobUrl ? (<button onClick={() => handleScrapeDescription(job)} className="text-purple-600 hover:underline text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled={scrapingId === job._id || !!deletingId || !!generatingId} title={`Scrape from: ${job.jobUrl}`} > {scrapingId === job._id ? 'Scraping...' : 'Scrape'} </button> // Renamed to 'Scrape' maybe?
                    ) : (<span className="text-xs text-gray-400 italic">No URL/Desc</span>)}
                    {scrapeError[job._id] && (<p className="text-red-600 text-xs mt-1">Error: {scrapeError[job._id]}</p>)}
                  </td>
                  <td className="py-3 px-4 text-center align-top">
                    <div className="flex flex-col items-center gap-2">
                      <div className='flex gap-2 justify-center flex-wrap'>
                        <button onClick={() => handleOpenEditModal(job)} className="text-blue-600 hover:underline text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed px-1" disabled={!!deletingId || !!generatingId || !!scrapingId} > Edit </button>
                        <button onClick={() => handleDeleteJob(job._id)} className="text-red-600 hover:underline text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed px-1" disabled={deletingId === job._id || !!generatingId || !!scrapingId} > {deletingId === job._id ? 'Deleting...' : 'Delete'} </button>
                        <button onClick={() => handleGenerateDocs(job._id)} className="text-green-600 hover:underline text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed px-1" disabled={!job.jobDescriptionText || !user?.cvJson || !!deletingId || generatingId === job._id || !!scrapingId} title={!job.jobDescriptionText ? "Scrape or add job description first" : !user?.cvJson ? "Upload your base CV first" : "Generate CV & Cover Letter"} > {generatingId === job._id ? 'Generating...' : 'Generate Docs'} </button>
                      </div>
                      <div className='mt-1 text-xs w-full text-center'>
                        {generatorError[job._id] && (<p className="text-red-600 bg-red-50 p-1 rounded my-1">Error: {generatorError[job._id]}</p>)}
                        {generatedFiles[job._id] && !generatorError[job._id] && (
                          <div className="flex flex-col items-center gap-1 text-blue-700 mt-1">
                            <button onClick={() => handleDownloadFile(generatedFiles[job._id].cv)} className="hover:underline text-blue-700 text-xs font-medium" > Download CV </button>
                            <button onClick={() => handleDownloadFile(generatedFiles[job._id].cl)} className="hover:underline text-blue-700 text-xs font-medium" > Download Cover Letter </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Reusable Add/Edit Job Modal --- */}
      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 transition-opacity duration-300 ease-in-out">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg mx-4 sm:mx-0">
            <h2 className="text-2xl font-semibold mb-5 text-gray-800"> {modalMode === 'add' ? 'Add New Job Manually' : 'Edit Job Application'} </h2>
            <form onSubmit={handleFormSubmit}>
              {modalError && <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded border border-red-300">{modalError}</div>}
              {/* Job Title */}
              <div className="mb-4">
                <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">Job Title <span className="text-red-500">*</span></label>
                <input type="text" id="jobTitle" name="jobTitle" value={formData.jobTitle || ''} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              {/* Company Name */}
              <div className="mb-4">
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">Company Name <span className="text-red-500">*</span></label>
                <input type="text" id="companyName" name="companyName" value={formData.companyName || ''} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              {/* Status */}
              <div className="mb-4">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select id="status" name="status" value={formData.status || 'Not Applied'} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  {statusOptions.map(status => (<option key={status} value={status}>{status}</option>))}
                </select>
              </div>
              {/* Job URL */}
              <div className="mb-4">
                <label htmlFor="jobUrl" className="block text-sm font-medium text-gray-700 mb-1">Job URL</label>
                <input type="url" id="jobUrl" name="jobUrl" value={formData.jobUrl || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="https://..." />
              </div>
              {/* Edit-Only Fields */}
              {modalMode === 'edit' && (
                <>
                  <div className="mb-4">
                    <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">Language (e.g., en, de)</label>
                    <input type="text" id="language" name="language" value={formData.language || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxLength={5} />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="jobDescriptionText" className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
                    <textarea id="jobDescriptionText" name="jobDescriptionText" rows={5} value={formData.jobDescriptionText || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Scraped or manually pasted job description..." />
                  </div>
                </>
              )}
              {/* Notes */}
              <div className="mb-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea id="notes" name="notes" rows={3} value={formData.notes || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              {/* Modal Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 border-t pt-4 border-gray-200">
                <button type="button" onClick={handleCloseModal} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400"> Cancel </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"> {isSubmitting ? (modalMode === 'add' ? 'Adding...' : 'Updating...') : (modalMode === 'add' ? 'Add Job' : 'Update Job')} </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;