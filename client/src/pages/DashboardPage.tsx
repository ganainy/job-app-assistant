// client/src/pages/DashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { getJobs, JobApplication } from '../services/jobApi'; // Import the API function and type

const DashboardPage: React.FC = () => {
  // State to hold the list of job applications
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  // State to track loading status
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // State to hold potential errors
  const [error, setError] = useState<string | null>(null);

  // useEffect hook to fetch data when the component mounts
  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true); // Start loading
      setError(null); // Reset error state
      try {
        const fetchedJobs = await getJobs();
        setJobs(fetchedJobs); // Update state with fetched jobs
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
        setError("Failed to load job applications. Please try again later."); // Set error message for UI
      } finally {
        setIsLoading(false); // Stop loading regardless of success or failure
      }
    };

    fetchJobs(); // Call the fetch function

    // Cleanup function (optional) - not strictly needed for a simple GET
    // return () => { /* potential cleanup logic */ };
  }, []); // Empty dependency array means this runs only once on mount

  // --- Render Logic ---

  if (isLoading) {
    return <div className="text-center p-10">Loading jobs...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-600">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Job Application Dashboard</h1>

      {/* Button to add new job (functionality to be added) */}
      <button className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Add New Job
      </button>

      {/* Display the jobs - basic table example */}
      {jobs.length === 0 ? (
        <p>No job applications found.</p>
      ) : (
        <div className="overflow-x-auto"> {/* Make table scrollable on small screens */}
          <table className="min-w-full bg-white border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 border-b text-left">Job Title</th>
                <th className="py-2 px-4 border-b text-left">Company</th>
                <th className="py-2 px-4 border-b text-left">Status</th>
                <th className="py-2 px-4 border-b text-left">Date Added</th>
                <th className="py-2 px-4 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job._id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{job.jobTitle}</td>
                  <td className="py-2 px-4 border-b">{job.companyName}</td>
                  <td className="py-2 px-4 border-b">
                    {/* Add styling based on status later */}
                    <span className="px-2 py-1 text-sm rounded bg-gray-200">{job.status}</span>
                  </td>
                  <td className="py-2 px-4 border-b">
                     {/* Format date nicely */}
                     {new Date(job.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {/* Action buttons (functionality to be added) */}
                    <button className="text-blue-600 hover:underline mr-2 text-sm">Edit</button>
                    <button className="text-red-600 hover:underline text-sm">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;