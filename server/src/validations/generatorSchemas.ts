import { z } from 'zod';

/**
 * Language enum
 */
const languageEnum = z.enum(['en', 'de']);

/**
 * Generate documents body schema
 */
export const generateDocumentsBodySchema = z.object({
  language: languageEnum.optional().default('en'),
  baseCvData: z.any().optional(),
}).optional();

/**
 * Intermediate data schema for finalize generation
 */
const intermediateDataSchema = z.object({
  tailoredCvJson: z.any(), // JsonResumeSchema
  coverLetterTemplate: z.string().min(1, 'Cover letter template is required'),
  language: languageEnum,
  jobId: z.string().min(1, 'Job ID is required'),
  userId: z.string().min(1, 'User ID is required'),
});

/**
 * Finalize generation body schema
 */
export const finalizeGenerationBodySchema = z.object({
  intermediateData: intermediateDataSchema,
  userInputData: z.record(z.string(), z.string()).refine(
    (data) => Object.keys(data).length > 0,
    {
      message: 'User input data cannot be empty',
    }
  ),
});

/**
 * Improve section body schema
 */
export const improveSectionBodySchema = z.object({
  sectionName: z.string({
    required_error: 'Section name is required',
  }).min(1, 'Section name cannot be empty'),
  sectionData: z.any({
    required_error: 'Section data is required',
  }), // Can be any JSON object representing a section item
  customInstructions: z.string().optional(),
});

