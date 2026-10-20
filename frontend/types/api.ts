export type ApiFieldErrors = Record<string, string[]>;

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    message: string;
    details?: ApiFieldErrors;
  };
};
