import { Request, Response, NextFunction } from 'express';

/**
 * Wrapper function for async route handlers
 * Automatically catches errors and passes them to the error handling middleware
 * 
 * Usage:
 * router.get('/path', asyncHandler(async (req, res) => {
 *   // async code here
 * }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

