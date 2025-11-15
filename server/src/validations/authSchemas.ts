import { z } from 'zod';

/**
 * Registration body schema
 * Validates email format and password strength
 */
export const registerBodySchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email('Invalid email format')
    .toLowerCase(),
  password: z
    .string({
      required_error: 'Password is required',
    })
    .min(6, 'Password must be at least 6 characters long'),
});

/**
 * Login body schema
 * Validates email and password presence
 */
export const loginBodySchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email('Invalid email format')
    .toLowerCase(),
  password: z.string({
    required_error: 'Password is required',
  }),
});

