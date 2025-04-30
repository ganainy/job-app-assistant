// client/src/services/jobApi.ts
import axios from 'axios';
import { JsonResumeSchema } from '../../../server/src/types/jsonresume'; // Adjust path if needed or redefine/share type

// Define the base URL for your backend API
// It's good practice to use environment variables for this later,
// but for now, we'll hardcode it for local development.
const API_BASE_URL = 'http://localhost:5001/api'; // Your backend URL


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
    language?: 'en' | 'de'; // More specific type
    draftCvJson?: any | null; // Use JsonResumeSchema if imported, else any
    draftCoverLetterText?: string | null;
    generationStatus?: 'none' | 'pending_input' | 'pending_generation' | 'draft_ready' | 'finalized' | 'error'; // Added pending_generation
    generatedCvFilename?: string; // Added
    generatedCoverLetterFilename?: string; // Added
    createdAt: string; // Dates are often strings in JSON
    updatedAt: string; // Dates are often strings in JSON
    // userId?: string; // Add later
}
export type CreateJobPayload = Omit<JobApplication, '_id' | 'createdAt' | 'updatedAt' | 'draftCvJson' | 'draftCoverLetterText' | 'generationStatus'>; // Exclude draft fields on create
export type UpdateJobPayload = Partial<Omit<JobApplication, '_id' | 'userId' | 'createdAt' | 'updatedAt'>>; // Allow updating most fields

interface ScrapeResponse {
    message: string;
    job: JobApplication; // Return the updated job
}
interface DeleteResponse {
    message: string;
    id: string;
}

// ---  Interface for Draft Response ---
export interface JobDraftData {
    jobId: string;
    jobTitle: string;
    companyName: string;
    generationStatus?: 'none' | 'pending_input' | 'draft_ready' | 'finalized' | 'error';
    draftCvJson: JsonResumeSchema | null | any; // Use specific type or any
    draftCoverLetterText: string | null;
}

// --- API Functions ---

// Function to get all job applications
export const getJobs = async (): Promise<JobApplication[]> => {
    try {
        // Use axios directly - Auth header is set by AuthProvider
        const response = await axios.get(`${API_BASE_URL}/job-applications`); // Corrected endpoint
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
export const createJob = async (jobData: CreateJobPayload): Promise<JobApplication> => {
    try {
        const response = await axios.post(`${API_BASE_URL}/job-applications`, jobData); // Corrected endpoint
        return response.data;
    } catch (error) {
        console.error("Error creating job:", error);
        throw error;
    }
};

// Function to update a job application
// Payload can be partial data for the update
export const updateJob = async (id: string, updates: UpdateJobPayload): Promise<JobApplication> => {
    try {
        const response = await axios.put(`${API_BASE_URL}/job-applications/${id}`, updates); // Corrected endpoint
        return response.data;
    } catch (error) {
        console.error(`Error updating job ${id}:`, error);
        throw error;
    }
};


// Function to delete a job application
// Usually returns some confirmation or just succeeds/fails
export const deleteJob = async (id: string): Promise<DeleteResponse> => {
    try {
        const response = await axios.delete(`${API_BASE_URL}/job-applications/${id}`); // Corrected endpoint
        return response.data;
    } catch (error) {
        console.error(`Error deleting job ${id}:`, error);
        throw error;
    }
};

// Get single job (optional, if needed)
export const getJobById = async (id: string): Promise<JobApplication> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/job-applications/${id}`); // Corrected endpoint
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
        const response = await axios.patch<ScrapeResponse>(`${API_BASE_URL}/job-applications/${jobId}/scrape`, payload); // Corrected endpoint
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
        const response = await axios.post<JobApplication>(`${API_BASE_URL}/job-applications/create-from-url`, { url }); // Corrected endpoint
        return response.data;
    } catch (error: any) {
        console.error(`Error creating job from URL ${url}:`, error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred while creating job from URL.' };
    }
};

// ---  Get Draft Data Function ---
export const getJobDraft = async (jobId: string): Promise<JobDraftData> => {
    try {
        // Assumes auth token is handled by default axios instance
        const response = await axios.get<JobDraftData>(`${API_BASE_URL}/job-applications/${jobId}/draft`); // Corrected endpoint
        return response.data;
    } catch (error: any) {
        console.error(`Error fetching draft data for job ${jobId}:`, error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data; // Throw backend error structure
        }
        throw { message: 'An unknown error occurred fetching draft data.' };
    }
};

// ---  Update Draft Data Function ---
interface UpdateDraftPayload {
    draftCvJson?: JsonResumeSchema | any; // Allow sending partial updates potentially
    draftCoverLetterText?: string;
}
interface UpdateDraftResponse {
    message: string;
}
export const updateJobDraft = async (jobId: string, draftData: UpdateDraftPayload): Promise<UpdateDraftResponse> => {
    try {
        const response = await axios.put<UpdateDraftResponse>(`${API_BASE_URL}/job-applications/${jobId}/draft`, draftData); // Corrected endpoint
        return response.data;
    } catch (error: any) {
        console.error(`Error updating draft for job ${jobId}:`, error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred updating draft data.' };
    }
};