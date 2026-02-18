import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { logger } from "../config/logger";
import { ENV } from "../config/env";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err;

  // If not an operational error, convert it
  if (!(error instanceof AppError)) {
    logger.error("Unexpected error", { message: error.message, stack: error.stack });

    error = new AppError("Internal Server Error", 500);
  }

  const response = {
    success: false,
    message: error.message,
  };

  // Hide stack trace in production
  if (ENV.NODE_ENV === "development") {
    Object.assign(response, { stack: err.stack });
  }

  res.status(error.statusCode).json(response);
};
