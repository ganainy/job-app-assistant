import { z } from 'zod';

/**
 * Job application status enum
 */
const jobStatusEnum = z.enum([
  'Applied',
  'Not Applied',
  'Interview',
  'Assessment',
  'Rejected',
  'Closed',
  'Offer',
]);

/**
 * Create job application body schema
 */
export const createJobBodySchema = z.object({
  jobTitle: z.string({
    required_error: 'Job title is required',
  }).min(1, 'Job title cannot be empty').trim(),
  companyName: z.string({
    required_error: 'Company name is required',
  }).min(1, 'Company name cannot be empty').trim(),
  status: jobStatusEnum.optional(),
  jobUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  notes: z.string().optional(),
  jobDescriptionText: z.string().optional(),
});

/**
 * Update job application body schema (all fields optional)
 */
export const updateJobBodySchema = z.object({
  jobTitle: z.string().min(1, 'Job title cannot be empty').trim().optional(),
  companyName: z.string().min(1, 'Company name cannot be empty').trim().optional(),
  status: jobStatusEnum.optional(),
  jobUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  notes: z.string().optional(),
  jobDescriptionText: z.string().optional(),
  dateApplied: z.string().datetime().optional().or(z.date().optional()),
});

/**
 * Scrape job description body schema
 */
export const scrapeJobBodySchema = z.object({
  url: z.string().url('Invalid URL format').optional(),
}).optional();

/**
 * Create job from URL body schema
 */
export const createJobFromUrlBodySchema = z.object({
  url: z.string({
    required_error: 'URL is required',
  }).url('Invalid URL format').refine(
    (val) => val.startsWith('http://') || val.startsWith('https://'),
    {
      message: 'URL must start with http:// or https://',
    }
  ),
});

/**
 * Update draft body schema
 */
export const updateDraftBodySchema = z.object({
  draftCvJson: z.any().optional(), // JsonResumeSchema - using any for flexibility
  draftCoverLetterText: z.string().optional(),
}).refine(
  (data) => data.draftCvJson !== undefined || data.draftCoverLetterText !== undefined,
  {
    message: 'At least one of draftCvJson or draftCoverLetterText must be provided',
  }
);

