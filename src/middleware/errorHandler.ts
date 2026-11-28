import type { NextFunction, Request, Response } from "express";
import { env } from "../../env.ts";

export class APIError extends Error {
  constructor(
    // bu kodni public bilan refactor qildim
    public message: string,
    public name: string,
    public status: number,
  ) {
    super(message)
  }
}

export const errorHandler = (
  err: APIError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.log(err.stack);

  let status = err.status || 500;
  let message = err.message || "Internal Server Error";

  if (err.name === "ValidationError") {
    status = 400;
    message = "Validation Error";
  }

  if (err.name === "UnauthorizedError") {
    status = 401;
    message = "Unauthorized";
  }

  return res.status(status).json({
    error: message,
    ...(env.APP_STAGE === "dev" && {
      stack: err.stack,
      details: err.message,
    }),
  });
};
