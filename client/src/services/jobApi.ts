// client/src/services/jobApi.ts
import axios from 'axios';

// Define the base URL for your backend API
// It's good practice to use environment variables for this later,
// but for now, we'll hardcode it for local development.
const API_BASE_URL = 'http://localhost:5001/api'; // Your backend URL

// Create an Axios instance (optional but good practice)
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Add Authorization headers here later if needed for auth
  },
});

// Define the expected structure of a job application (matching backend)
// It's often useful to have this type definition accessible in the frontend
export interface JobApplication {
  _id: string; // MongoDB assigns _id
  jobTitle: string;
  companyName: string;
  status: 'Applied' | 'Not Applied' | 'Interview' | 'Assessment' | 'Rejected' | 'Closed' | 'Offer';
  dateApplied?: string; // Dates are often strings in JSON
  jobUrl?: string;
  notes?: string;
  jobDescriptionText?: string;
  createdAt: string; // Dates are often strings in JSON
  updatedAt: string; // Dates are often strings in JSON
  // userId?: string; // Add later
}

// --- API Functions ---

// Function to get all job applications
export const getJobs = async (): Promise<JobApplication[]> => {
  try {
    const response = await apiClient.get('/jobs');
    return response.data; // Axios automatically parses JSON
  } catch (error) {
    console.error("Error fetching jobs:", error);
    // Handle or throw error appropriately for UI feedback
    throw error;
  }
};

// Function to create a new job application
// We need the data to send (Payload Type) - excluding _id, createdAt, updatedAt
export type CreateJobPayload = Omit<JobApplication, '_id' | 'createdAt' | 'updatedAt'>;
export const createJob = async (jobData: CreateJobPayload): Promise<JobApplication> => {
    try {
        const response = await apiClient.post('/jobs', jobData);
        return response.data;
    } catch (error) {
        console.error("Error creating job:", error);
        throw error;
    }
};

// Function to update a job application
// Payload can be partial data for the update
type UpdateJobPayload = Partial<Omit<JobApplication, '_id' | 'createdAt' | 'updatedAt'>>;
export const updateJob = async (id: string, updates: UpdateJobPayload): Promise<JobApplication> => {
    try {
        const response = await apiClient.put(`/jobs/${id}`, updates);
        return response.data;
    } catch (error) {
        console.error(`Error updating job ${id}:`, error);
        throw error;
    }
};


// Function to delete a job application
// Usually returns some confirmation or just succeeds/fails
interface DeleteResponse {
    message: string;
    id: string;
}
export const deleteJob = async (id: string): Promise<DeleteResponse> => {
    try {
        const response = await apiClient.delete(`/jobs/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting job ${id}:`, error);
        throw error;
    }
};

// Get single job (optional, if needed)
export const getJobById = async (id: string): Promise<JobApplication> => {
    try {
        const response = await apiClient.get(`/jobs/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching job ${id}:`, error);
        throw error;
    }
};