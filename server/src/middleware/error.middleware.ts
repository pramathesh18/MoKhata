import { Request, Response, NextFunction } from 'express';
import { env } from '../utils/env';

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.url} - Status ${statusCode}: ${message}`);

  res.status(statusCode).json({
    success: false,
    error: {
      message: statusCode === 500 && env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : message,
      ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
};
