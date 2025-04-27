// client/src/pages/DashboardPage.tsx
import React, { useState, useEffect } from 'react';
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


  // --- NEW Scrape Handler ---
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


  // --- NEW Handler for Create from URL ---
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

  // --- Render Logic ---

  // Display loading indicator during initial data fetch
  if (isLoading) {
    return <div className="text-center p-10">Loading jobs...</div>;
  }

  // Display general error message (e.g., initial load failed)
  // Note: This currently replaces the whole dashboard on error.
  if (error && !isLoading) {
    return (
      <div className="container mx-auto p-4 relative">
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg border border-red-300" role="alert">
          <span className="font-medium">Error:</span> {error}
        </div>
        <h1 className="text-3xl font-bold mb-6">Job Application Dashboard</h1>
        {/* Still show Add Job options even if fetch failed? Maybe */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <button onClick={handleOpenAddModal} className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" disabled={true} > Add New Job Manually </button>
          </div>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-2 md:space-y-0 md:flex md:gap-2">
            <input type="url" placeholder="Paste Job URL to auto-create..." required disabled className="flex-grow w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
            <button type="submit" className="w-full md:w-auto px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled={true} > Create from URL </button>
          </form>
        </div>
      </div>
    );
  }

  // Main dashboard content
  return (
    <div className="container mx-auto p-4 relative">
      <h1 className="text-3xl font-bold mb-6">Job Application Dashboard</h1>

      {/* --- Add Job Section --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Manual Add Button */}
        <div>
          <button
            onClick={handleOpenAddModal}
            className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={isLoading || isSubmitting || isCreatingFromUrl} // Disable during relevant loadings
          > Add New Job Manually </button>
        </div>

        {/* Create from URL Form */}
        <form onSubmit={handleCreateFromUrlSubmit} className="space-y-2 md:space-y-0 md:flex md:gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); setCreateFromUrlError(null); }} // Update state and clear error on change
            placeholder="Paste Job URL to auto-create..."
            required
            className="flex-grow w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isCreatingFromUrl} // Disable input while processing
          />
          <button
            type="submit"
            className="w-full md:w-auto px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isCreatingFromUrl || !urlInput} // Disable if processing or no input
          >
            {isCreatingFromUrl ? 'Processing URL...' : 'Create from URL'}
          </button>
        </form>
      </div>
      {/* Display Create from URL Error */}
      {createFromUrlError && <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded border border-red-300">{createFromUrlError}</div>}


      {/* Job list table or message if no jobs */}
      {jobs.length === 0 && !isLoading ? (
        <p>No job applications found. Add one manually or paste a URL above.</p>
      ) : (
        <div className="overflow-x-auto shadow-md sm:rounded-lg">
          <table className="min-w-full bg-white border border-gray-200 text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs leading-normal">
              <tr>
                <th className="py-3 px-4 border-b border-gray-200 text-left">Job Title</th>
                <th className="py-3 px-4 border-b border-gray-200 text-left">Company</th>
                <th className="py-3 px-4 border-b border-gray-200 text-left">Status</th>
                <th className="py-3 px-4 border-b border-gray-200 text-left">Date Added</th>
                <th className="py-3 px-4 border-b border-gray-200 text-left">Language</th> {/* Added Language Header */}
                <th className="py-3 px-4 border-b border-gray-200 text-left">Description Status</th>
                <th className="py-3 px-4 border-b border-gray-200 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {jobs.map((job) => (
                <tr key={job._id} className="border-b border-gray-200 hover:bg-gray-50">
                  {/* Job Title, Company, Status, Date Added */}
                  <td className="py-3 px-4">{job.jobTitle}</td>
                  <td className="py-3 px-4">{job.companyName}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs rounded bg-gray-200 font-medium">{job.status}</span>
                  </td>
                  <td className="py-3 px-4">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </td>
                  {/* Language Cell */}
                  <td className="py-3 px-4">
                    {job.language ? (
                      <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 font-medium uppercase">{job.language}</span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">-</span>
                    )}
                  </td>
                  {/* Description Status / Scrape Button */}
                  <td className="py-3 px-4 text-left align-top">
                    {/* Show "OK" if description exists */}
                    {job.jobDescriptionText && job.jobDescriptionText.length > 10 ? (
                      <span
                        className="text-xs text-green-600 bg-green-50 p-1 rounded inline-block"
                        title={job.jobDescriptionText.substring(0, 150) + '...'} // Show preview on hover
                      > Description OK </span>
                      // Show "Scrape" button if URL exists but description doesn't
                    ) : job.jobUrl ? (
                      <button
                        onClick={() => handleScrapeDescription(job)} // Still keep manual scrape? Maybe remove if create-from-url works well
                        className="text-purple-600 hover:underline text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={scrapingId === job._id || !!deletingId || !!generatingId}
                        title={`Re-Scrape from: ${job.jobUrl}`}
                      > {scrapingId === job._id ? 'Scraping...' : 'Re-Scrape'} </button> // Renamed button?
                      // Show "No URL" otherwise
                    ) : (
                      <span className="text-xs text-gray-400 italic">No URL/Desc</span>
                    )}
                    {/* Display scrape error for this row */}
                    {scrapeError[job._id] && (
                      <p className="text-red-600 text-xs mt-1">Error: {scrapeError[job._id]}</p>
                    )}
                  </td>

                  {/* Actions Column */}
                  <td className="py-3 px-4 text-center align-top">
                    <div className="flex flex-col items-center gap-2"> {/* Vertical layout */}
                      {/* Row for Action Buttons */}
                      <div className='flex gap-2 justify-center flex-wrap'>
                        <button onClick={() => handleOpenEditModal(job)} className="text-blue-600 hover:underline text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed px-1" disabled={!!deletingId || !!generatingId || !!scrapingId} > Edit </button>
                        <button onClick={() => handleDeleteJob(job._id)} className="text-red-600 hover:underline text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed px-1" disabled={deletingId === job._id || !!generatingId || !!scrapingId} > {deletingId === job._id ? 'Deleting...' : 'Delete'} </button>
                        <button onClick={() => handleGenerateDocs(job._id)} className="text-green-600 hover:underline text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed px-1" disabled={!job.jobDescriptionText || !user?.cvJson || !!deletingId || generatingId === job._id || !!scrapingId} title={!job.jobDescriptionText ? "Scrape or add job description first" : !user?.cvJson ? "Upload your base CV first" : "Generate CV & Cover Letter"} > {generatingId === job._id ? 'Generating...' : 'Generate Docs'} </button>
                      </div>

                      {/* Area for displaying generator errors or download links */}
                      <div className='mt-1 text-xs w-full text-center'>
                        {/* Display generation error if exists */}
                        {generatorError[job._id] && (<p className="text-red-600 bg-red-50 p-1 rounded my-1">Error: {generatorError[job._id]}</p>)}
                        {/* Display download links if files were generated successfully */}
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
          {/* Modal Content Box */}
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg mx-4 sm:mx-0">
            {/* Dynamic Title */}
            <h2 className="text-2xl font-semibold mb-5 text-gray-800">
              {modalMode === 'add' ? 'Add New Job Manually' : 'Edit Job Application'}
            </h2>
            {/* Form uses unified submit handler */}
            <form onSubmit={handleFormSubmit}>
              {/* Display modal-specific errors */}
              {modalError && <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded border border-red-300">{modalError}</div>}

              {/* Form Fields */}
              <div className="mb-4">
                <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">Job Title <span className="text-red-500">*</span></label>
                <input type="text" id="jobTitle" name="jobTitle" value={formData.jobTitle || ''} onChange={handleInputChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="mb-4">
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">Company Name <span className="text-red-500">*</span></label>
                <input type="text" id="companyName" name="companyName" value={formData.companyName || ''} onChange={handleInputChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="mb-4">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select id="status" name="status" value={formData.status || 'Not Applied'} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="Not Applied">Not Applied</option>
                  <option value="Applied">Applied</option>
                  <option value="Interview">Interview</option>
                  <option value="Assessment">Assessment</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Closed">Closed</option>
                  <option value="Offer">Offer</option>
                </select>
              </div>
              <div className="mb-4">
                <label htmlFor="jobUrl" className="block text-sm font-medium text-gray-700 mb-1">Job URL</label>
                <input type="url" id="jobUrl" name="jobUrl" value={formData.jobUrl || ''} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="https://..." />
              </div>
              {/* Allow editing description/language/notes in Edit mode */}
              {modalMode === 'edit' && (
                <>
                  <div className="mb-4">
                    <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">Language (e.g., en, de)</label>
                    <input type="text" id="language" name="language" value={formData.language || ''} onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxLength={5} />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="jobDescriptionText" className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
                    <textarea id="jobDescriptionText" name="jobDescriptionText" rows={5} value={formData.jobDescriptionText || ''} onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Scraped or manually pasted job description..." />
                  </div>
                </>
              )}
              <div className="mb-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea id="notes" name="notes" rows={3} value={formData.notes || ''} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>

              {/* Modal Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 border-t pt-4 border-gray-200">
                <button type="button" onClick={handleCloseModal} disabled={isSubmitting}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400"> Cancel </button>
                <button type="submit" disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1">
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