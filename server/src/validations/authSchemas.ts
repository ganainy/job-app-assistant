import { z } from 'zod';

/**
 * Registration body schema
 * Validates email format, password strength, and username
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
  username: z
    .string({
      required_error: 'Username is required',
    })
    .min(3, 'Username must be at least 3 characters long')
    .max(30, 'Username must be at most 30 characters long')
    .regex(
      /^[a-z0-9_-]+$/,
      'Username can only contain lowercase letters, numbers, hyphens, and underscores'
    )
    .toLowerCase()
    .trim(),
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

