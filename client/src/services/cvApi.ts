// client/src/services/cvApi.ts
/**
 * Unified CV API Service
 * 
 * Uses the new unified CV model with isMasterCv flag.
 * All CVs (master and job-specific) are stored in the same collection.
 */
import axios from 'axios';
import { JsonResumeSchema } from '../../../server/src/types/jsonresume';

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001/api'}/cvs`;

// ============================================================================
// Types
// ============================================================================

export interface CVDocument {
    _id: string;
    isMasterCv: boolean;
    jobApplicationId?: string | null;
    jobApplication?: {
        _id: string;
        jobTitle: string;
        companyName: string;
        status: string;
        jobUrl?: string;
    } | null;
    cvJson: JsonResumeSchema;
    templateId?: string | null;
    filename?: string | null;
    analysisCache?: Record<string, unknown> | null;
    tailoringChanges?: Array<{
        section: string;
        description: string;
        reason: string;
    }> | null;
    createdAt: string;
    updatedAt: string;
}

export interface GetAllCvsResponse {
    cvs: CVDocument[];
}

export interface GetCvResponse {
    cv: CVDocument | null;
    message?: string;
}

export interface UploadCvResponse {
    message: string;
    cv: CVDocument;
}

export interface UpdateCvResponse {
    message: string;
    cv: CVDocument;
}

export interface DeleteCvResponse {
    message: string;
    deletedCvId: string;
}

export interface PromoteCvResponse {
    message: string;
    cv: CVDocument;
}

export interface PreviewCvResponse {
    message: string;
    pdfBase64: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get all CVs for the current user
 */
export const getAllCvs = async (): Promise<GetAllCvsResponse> => {
    try {
        const response = await axios.get<GetAllCvsResponse>(API_BASE_URL);
        return response.data;
    } catch (error: any) {
        console.error('Get all CVs API error:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred fetching CVs.' };
    }
};

/**
 * Get the master CV for the current user
 */
export const getMasterCv = async (): Promise<GetCvResponse> => {
    try {
        const response = await axios.get<GetCvResponse>(`${API_BASE_URL}/master`);
        return response.data;
    } catch (error: any) {
        console.error('Get master CV API error:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred fetching master CV.' };
    }
};

/**
 * Get a specific CV by ID
 */
export const getCvById = async (cvId: string): Promise<GetCvResponse> => {
    try {
        const response = await axios.get<GetCvResponse>(`${API_BASE_URL}/${cvId}`);
        return response.data;
    } catch (error: any) {
        console.error('Get CV by ID API error:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred fetching CV.' };
    }
};

/**
 * Get the CV for a specific job application
 */
export const getJobCv = async (jobId: string): Promise<GetCvResponse> => {
    try {
        const response = await axios.get<GetCvResponse>(`${API_BASE_URL}/job/${jobId}`);
        return response.data;
    } catch (error: any) {
        console.error('Get job CV API error:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred fetching job CV.' };
    }
};

/**
 * Upload a new CV file (creates/replaces master CV)
 */
export const uploadCV = async (file: File): Promise<UploadCvResponse> => {
    const formData = new FormData();
    formData.append('cvFile', file);

    try {
        const response = await axios.post<UploadCvResponse>(`${API_BASE_URL}/upload`, formData);
        return response.data;
    } catch (error: any) {
        console.error('Upload CV API error:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred uploading CV.' };
    }
};

/**
 * Create a job-specific CV (copies from master if no cvJson provided)
 */
export const createJobCv = async (
    jobId: string,
    options?: { cvJson?: JsonResumeSchema; templateId?: string }
): Promise<UpdateCvResponse> => {
    try {
        const response = await axios.post<UpdateCvResponse>(
            `${API_BASE_URL}/job/${jobId}`,
            options || {}
        );
        return response.data;
    } catch (error: any) {
        console.error('Create job CV API error:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred creating job CV.' };
    }
};

/**
 * Update a CV by ID
 */
export const updateCv = async (
    cvId: string,
    data: { cvJson?: JsonResumeSchema; templateId?: string }
): Promise<UpdateCvResponse> => {
    try {
        const response = await axios.put<UpdateCvResponse>(`${API_BASE_URL}/${cvId}`, data);
        return response.data;
    } catch (error: any) {
        console.error('Update CV API error:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred updating CV.' };
    }
};

/**
 * Delete a CV by ID
 */
export const deleteCv = async (cvId: string): Promise<DeleteCvResponse> => {
    try {
        const response = await axios.delete<DeleteCvResponse>(`${API_BASE_URL}/${cvId}`);
        return response.data;
    } catch (error: any) {
        console.error('Delete CV API error:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred deleting CV.' };
    }
};

/**
 * Promote a job CV to become the master CV
 */
export const promoteCvToMaster = async (cvId: string): Promise<PromoteCvResponse> => {
    try {
        const response = await axios.post<PromoteCvResponse>(`${API_BASE_URL}/${cvId}/promote`);
        return response.data;
    } catch (error: any) {
        console.error('Promote CV API error:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred promoting CV.' };
    }
};

/**
 * Generate PDF preview for a CV by ID
 */
export const previewCvById = async (
    cvId: string,
    template?: string
): Promise<PreviewCvResponse> => {
    try {
        const response = await axios.post<PreviewCvResponse>(
            `${API_BASE_URL}/${cvId}/preview`,
            { template }
        );
        return response.data;
    } catch (error: any) {
        console.error('Preview CV API error:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred generating preview.' };
    }
};

/**
 * Generate PDF preview from provided CV data (without saving)
 */
export const previewCv = async (
    cvData: JsonResumeSchema,
    template?: string
): Promise<PreviewCvResponse> => {
    try {
        const response = await axios.post<PreviewCvResponse>(`${API_BASE_URL}/preview`, {
            cvData,
            template,
        });
        return response.data;
    } catch (error: any) {
        console.error('Preview CV data API error:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
        }
        throw { message: 'An unknown error occurred generating preview.' };
    }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the effective template for a CV (with fallback to user default)
 */
export const getEffectiveTemplate = (cv: CVDocument, userDefault?: string): string => {
    return cv.templateId || userDefault || 'modern-clean';
};

/**
 * Filter CVs by type
 */
export const filterMasterCv = (cvs: CVDocument[]): CVDocument | undefined => {
    return cvs.find(cv => cv.isMasterCv);
};

export const filterJobCvs = (cvs: CVDocument[]): CVDocument[] => {
    return cvs.filter(cv => !cv.isMasterCv);
};

/**
 * Find CV for a specific job
 */
export const findCvForJob = (cvs: CVDocument[], jobId: string): CVDocument | undefined => {
    return cvs.find(cv => cv.jobApplicationId === jobId);
};