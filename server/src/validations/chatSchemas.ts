import { z } from 'zod';
import { jobIdParamSchema } from './commonSchemas';

/**
 * Schema for chat message request body
 */
export const chatMessageBodySchema = z.object({
    question: z.string().min(1, 'Question cannot be empty').max(1000, 'Question is too long'),
});

/**
 * Schema for chat route params (jobId)
 */
export const chatParamsSchema = jobIdParamSchema;

