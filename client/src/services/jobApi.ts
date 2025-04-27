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
  language?: string;
  createdAt: string; // Dates are often strings in JSON
  updatedAt: string; // Dates are often strings in JSON
  // userId?: string; // Add later
}

interface ScrapeResponse {
    message: string;
    job: JobApplication; // Return the updated job
}


// --- API Functions ---

// Function to get all job applications
export const getJobs = async (): Promise<JobApplication[]> => {
    try {
        // Use axios directly - Auth header is set by AuthProvider
        const response = await axios.get(`${API_BASE_URL}/jobs`);
        return response.data;
      } 
 catch (error) {
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
        const response = await axios.post(`${API_BASE_URL}/jobs`, jobData);
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
        const response = await axios.put(`${API_BASE_URL}/jobs/${id}`, updates);
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
        const response = await axios.delete(`${API_BASE_URL}/jobs/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting job ${id}:`, error);
        throw error;
    }
};

// Get single job (optional, if needed)
export const getJobById = async (id: string): Promise<JobApplication> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/jobs/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching job ${id}:`, error);
        throw error;
    }
};

// ---  Scrape Function ---
export const scrapeJobDescriptionApi = async (jobId: string, url?: string): Promise<ScrapeResponse> => {
    try {
        // Auth header should be included by default axios instance
        const payload = url ? { url } : {}; // Send URL in body if provided
        const response = await axios.patch<ScrapeResponse>(`${API_BASE_URL}/jobs/${jobId}/scrape`, payload);
        return response.data;
    } catch (error: any) {
        console.error(`Error scraping description for job ${jobId}:`, error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred during scraping.' };
    }
};


// ---  Create Job From URL Function ---
export const createJobFromUrlApi = async (url: string): Promise<JobApplication> => {
    try {
        // Auth header automatically included
        const response = await axios.post<JobApplication>(`${API_BASE_URL}/jobs/create-from-url`, { url });
        return response.data;
    } catch (error: any) {
        console.error(`Error creating job from URL ${url}:`, error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred while creating job from URL.' };
    }
};