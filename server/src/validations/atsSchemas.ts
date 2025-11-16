import { z } from 'zod';

// Schema for ATS scan request body
export const atsScanBodySchema = z.object({
    jobApplicationId: z.string().optional(), // Job application ID to get job description from
    analysisId: z.string().optional() // Optional: if provided, scan for existing analysis
}).strict();

// Schema for ATS scan with analysis ID in params
export const atsScanParamsSchema = z.object({
    analysisId: z.string().min(1, 'Analysis ID is required')
});

// Schema for getting ATS scores
export const atsScoresParamsSchema = z.object({
    analysisId: z.string().min(1, 'Analysis ID is required')
});

