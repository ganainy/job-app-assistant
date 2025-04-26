// D:\projects\job-app-assistant\client\src\pages\DashboardPage.tsx
import React, { useState, useEffect } from 'react';
// Import all necessary API functions and types
import {
    getJobs,
    createJob,
    deleteJob,
    updateJob,
    JobApplication,
    CreateJobPayload
} from '../services/jobApi';

// Define type for the form data (can be partial during editing/adding)
// Excludes fields automatically managed by backend/DB (_id, timestamps)
type JobFormData = Partial<Omit<JobApplication, '_id' | 'createdAt' | 'updatedAt'>>;

const DashboardPage: React.FC = () => {
  // --- Core State ---
  const [jobs, setJobs] = useState<JobApplication[]>([]); // Holds the list of job applications
  const [isLoading, setIsLoading] = useState<boolean>(true); // Tracks initial data loading
  const [error, setError] = useState<string | null>(null); // Stores general page errors (fetch/delete)

  // --- Modal & Form State ---
  // Determines if modal is open and its purpose ('add' or 'edit')
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  // Stores the ID of the job currently being edited (null if adding)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  // Holds the data entered into the modal form (for both add and edit)
  const [formData, setFormData] = useState<JobFormData>({});
  // Tracks if the modal form submission (add/edit) is in progress
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // Stores error messages specific to the modal form submission
  const [modalError, setModalError] = useState<string | null>(null);

  // --- Delete State ---
  // Stores the ID of the job currently being deleted (for row-specific feedback)
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // --- useEffect: Fetch initial job data on component mount ---
  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true);
      setError(null); // Clear previous errors before fetching
      try {
        const fetchedJobs = await getJobs();
        setJobs(fetchedJobs); // Populate jobs state
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
        setError("Failed to load job applications. Please try again later.");
      } finally {
        setIsLoading(false); // Finish loading state
      }
    };

    fetchJobs();
  }, []); // Empty dependency array means run only once on mount

  // --- Event Handlers ---

  // Opens the modal in 'add' mode and resets the form
  const handleOpenAddModal = () => {
    setFormData({ // Default values for a new job
      jobTitle: '',
      companyName: '',
      status: 'Not Applied',
      jobUrl: '',
      notes: ''
    });
    setCurrentJobId(null); // No ID for adding
    setModalError(null);
    setModalMode('add');
  };

  // Opens the modal in 'edit' mode and pre-fills the form with existing job data
  const handleOpenEditModal = (job: JobApplication) => {
    setCurrentJobId(job._id); // Store the ID we are editing
    setFormData({ // Pre-fill form with data from the selected job
      jobTitle: job.jobTitle,
      companyName: job.companyName,
      status: job.status,
      jobUrl: job.jobUrl,
      notes: job.notes,
      dateApplied: job.dateApplied,
      jobDescriptionText: job.jobDescriptionText // Include any other editable fields
    });
    setModalError(null);
    setModalMode('edit');
  };

  // Closes the modal and resets modal-related state
  const handleCloseModal = () => {
    if (isSubmitting) return; // Don't close if submitting
    setModalMode(null);
    setCurrentJobId(null);
    setFormData({}); // Clear form data
    setModalError(null);
  };

  // Updates the formData state whenever an input field in the modal changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value })); // Update the corresponding field
  };

  // Handles the form submission for both adding and editing jobs
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent default browser form submission
    setModalError(null); // Clear previous modal errors

    // Client-side validation
    if (!formData.jobTitle || !formData.companyName) {
      setModalError("Job Title and Company Name are required.");
      return; // Stop submission if validation fails
    }

    setIsSubmitting(true); // Indicate submission started

    try {
      if (modalMode === 'add') {
        // --- Add Logic ---
        // Type assertion might be needed if defaults don't perfectly match CreateJobPayload
        const payload = formData as CreateJobPayload;
        const createdJob = await createJob(payload); // Call create API
        // Update UI instantly by adding the new job to the beginning of the list
        setJobs(prevJobs => [createdJob, ...prevJobs]);
        handleCloseModal(); // Close modal on success

      } else if (modalMode === 'edit' && currentJobId) {
        // --- Edit Logic ---
        const payload = formData; // Send the changed fields for update
        const updatedJob = await updateJob(currentJobId, payload); // Call update API
        // Update UI instantly by replacing the old job data with the updated one
        setJobs(prevJobs => prevJobs.map(job =>
          job._id === currentJobId ? updatedJob : job // Find by ID and replace
        ));
        handleCloseModal(); // Close modal on success
      }
    } catch (err) {
      console.error(`Failed to ${modalMode} job:`, err);
      // Set error message to be displayed within the modal
      setModalError(`Failed to ${modalMode === 'add' ? 'add' : 'update'} job. Please try again.`);
    } finally {
      setIsSubmitting(false); // Indicate submission finished
    }
  };

  // Handles the deletion of a job
  const handleDeleteJob = async (jobId: string) => {
    // Confirmation dialog
    if (!window.confirm('Are you sure you want to delete this job application? This action cannot be undone.')) {
      return; // Do nothing if user cancels
    }

    setDeletingId(jobId); // Set state to indicate deletion is in progress for this specific job
    setError(null); // Clear general page errors

    try {
      await deleteJob(jobId); // Call delete API
      // Update UI instantly by filtering out the deleted job from the list
      setJobs(prevJobs => prevJobs.filter(job => job._id !== jobId));
    } catch (err) {
      console.error(`Failed to delete job ${jobId}:`, err);
      setError(`Failed to delete job application. Please try again.`); // Set general page error
    } finally {
      setDeletingId(null); // Reset deleting indicator for the job ID
    }
  };

  // --- Render Logic ---

  // Show loading indicator during initial data fetch
  if (isLoading) {
    return <div className="text-center p-10">Loading jobs...</div>;
  }

  // Show general error message if fetching or deleting failed
  // Note: This could potentially hide the dashboard if an error occurs after initial load.
  // Consider displaying errors as toasts or alongside the table later.
  if (error && !isLoading) {
     return (
         <div className="container mx-auto p-4 relative">
             <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg border border-red-300" role="alert">
                 <span className="font-medium">Error:</span> {error}
             </div>
             <h1 className="text-3xl font-bold mb-6">Job Application Dashboard</h1>
             {/* Consider showing the Add button even if there's an error */}
         </div>
     );
  }

  // Main dashboard content
  return (
    <div className="container mx-auto p-4 relative">
      <h1 className="text-3xl font-bold mb-6">Job Application Dashboard</h1>

      {/* Add New Job button */}
      <button
        onClick={handleOpenAddModal}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        disabled={isLoading || isSubmitting} // Disable if initial load or modal submission is happening
      >
        Add New Job
      </button>

      {/* Table displaying job applications */}
      {jobs.length === 0 && !isLoading ? (
         <p>No job applications found. Click "Add New Job" to get started.</p>
      ) : (
        <div className="overflow-x-auto shadow-md sm:rounded-lg">
          <table className="min-w-full bg-white border border-gray-200 text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs leading-normal">
              <tr>
                <th className="py-3 px-4 border-b border-gray-200 text-left">Job Title</th>
                <th className="py-3 px-4 border-b border-gray-200 text-left">Company</th>
                <th className="py-3 px-4 border-b border-gray-200 text-left">Status</th>
                <th className="py-3 px-4 border-b border-gray-200 text-left">Date Added</th>
                <th className="py-3 px-4 border-b border-gray-200 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {jobs.map((job) => (
                <tr key={job._id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4">{job.jobTitle}</td>
                  <td className="py-3 px-4">{job.companyName}</td>
                  <td className="py-3 px-4">
                    {/* Consider dynamic styling based on status */}
                    <span className="px-2 py-1 text-xs rounded bg-gray-200 font-medium">{job.status}</span>
                  </td>
                  <td className="py-3 px-4">
                     {new Date(job.createdAt).toLocaleDateString()} {/* Format date */}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {/* Edit button for this row */}
                    <button
                        onClick={() => handleOpenEditModal(job)} // Opens modal in edit mode with this job's data
                        className="text-blue-600 hover:underline mr-3 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={deletingId === job._id} // Disable if this job is being deleted
                    >
                        Edit
                    </button>
                    {/* Delete button for this row */}
                    <button
                        onClick={() => handleDeleteJob(job._id)} // Calls delete handler with this job's ID
                        className="text-red-600 hover:underline text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={deletingId === job._id} // Disable if this job is being deleted
                    >
                      {deletingId === job._id ? 'Deleting...' : 'Delete'} {/* Show deleting status */}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Reusable Add/Edit Job Modal --- */}
      {/* Conditionally render modal based on modalMode state */}
      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 transition-opacity duration-300 ease-in-out">
          {/* Modal Content Box */}
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg mx-4 sm:mx-0">
            {/* Dynamic Title */}
            <h2 className="text-2xl font-semibold mb-5 text-gray-800">
                {modalMode === 'add' ? 'Add New Job Application' : 'Edit Job Application'}
            </h2>

            {/* Form uses unified submit handler */}
            <form onSubmit={handleFormSubmit}>
              {/* Display modal-specific errors */}
              {modalError && <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded border border-red-300">{modalError}</div>}

              {/* Form Fields bound to formData state */}
              <div className="mb-4">
                <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">Job Title <span className="text-red-500">*</span></label>
                <input
                  type="text" id="jobTitle" name="jobTitle"
                  value={formData.jobTitle || ''} // Controlled component
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Software Engineer"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">Company Name <span className="text-red-500">*</span></label>
                <input
                  type="text" id="companyName" name="companyName"
                  value={formData.companyName || ''} // Controlled component
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Tech Innovations Inc."
                />
              </div>
              <div className="mb-4">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  id="status" name="status"
                  value={formData.status || 'Not Applied'} // Controlled component
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    {/* Status options */}
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
                <input
                  type="url" id="jobUrl" name="jobUrl"
                  value={formData.jobUrl || ''} // Controlled component
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/careers/posting"
                />
              </div>
               <div className="mb-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  id="notes" name="notes" rows={3}
                  value={formData.notes || ''} // Controlled component
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any specific requirements, contacts, or reminders..."
                />
              </div>
              {/* Add other form fields here if needed (e.g., dateApplied) */}

              {/* Modal Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 border-t pt-4 border-gray-200">
                <button
                  type="button" // Prevent default submit behavior
                  onClick={handleCloseModal}
                  disabled={isSubmitting} // Disable during submission
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting} // Disable during submission
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                >
                  {/* Dynamic button text */}
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