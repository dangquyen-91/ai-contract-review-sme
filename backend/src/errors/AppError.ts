export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode: number, isOperational = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code?: string) {
    return new AppError(message, 400, true, code);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Forbidden', code?: string) {
    return new AppError(message, 403, true, code);
  }

  static notFound(message = 'Resource not found', code?: string) {
    return new AppError(message, 404, true, code);
  }

  static conflict(message: string, code?: string) {
    return new AppError(message, 409, true, code);
  }

  static internal(message = 'Internal server error') {
    return new AppError(message, 500);
  }
}
