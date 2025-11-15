import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors/AppError';

/**
 * Extended Express Request with validated data
 */
export interface ValidatedRequest extends Request {
  validated?: {
    body?: any;
    params?: any;
    query?: any;
  };
}

/**
 * Validation options for request validation
 */
interface ValidationOptions {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

/**
 * Middleware to validate request body, params, and query using Zod schemas
 * Validated data is attached to req.validated
 * Throws ValidationError (AppError) on validation failure
 */
export const validateRequest = (schemas: ValidationOptions) => {
  return async (req: ValidatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated: ValidatedRequest['validated'] = {};

      // Validate body if schema provided
      if (schemas.body) {
        validated.body = await schemas.body.parseAsync(req.body);
      }

      // Validate params if schema provided
      if (schemas.params) {
        validated.params = await schemas.params.parseAsync(req.params);
      }

      // Validate query if schema provided
      if (schemas.query) {
        validated.query = await schemas.query.parseAsync(req.query);
      }

      // Attach validated data to request
      req.validated = validated;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into a more readable structure
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        // Create a ValidationError with detailed information
        const validationError = new ValidationError('Validation failed');
        (validationError as any).details = formattedErrors;
        (validationError as any).zodError = error;

        return next(validationError);
      }

      // If it's not a ZodError, pass it to the error handler
      next(error);
    }
  };
};

