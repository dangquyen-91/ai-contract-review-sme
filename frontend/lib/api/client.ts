import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import type { ApiErrorResponse, ApiFieldErrors, ApiSuccessResponse } from "@/types/api";
import type { RefreshTokenResult } from "@/types/auth";

export class ApiClientError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly serverCode?: string;
  readonly details?: ApiFieldErrors;

  constructor(
    message: string,
    options: { status?: number; code?: string; serverCode?: string; details?: ApiFieldErrors } = {},
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status;
    this.code = options.code;
    this.serverCode = options.serverCode;
    this.details = options.details;
  }
}

export const apiClient = axios.create({
  baseURL: "/api",
  timeout: 15_000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<RefreshTokenResult> | null = null;

function isAuthRequest(url?: string) {
  if (url?.endsWith("/auth/google")) return true;
  return ["/auth/login", "/auth/register", "/auth/verify-email", "/auth/resend-verification", "/auth/refresh", "/auth/logout", "/auth/onboarding", "/invitations/accept", "/invitations/preview"].some((path) => url?.endsWith(path));
}

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = apiClient.post<ApiSuccessResponse<RefreshTokenResult>>("/auth/refresh").then((response) => response.data.data).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function normalizeApiError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error;

  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return new ApiClientError("Đã xảy ra lỗi không xác định. Vui lòng thử lại.");
  }

  const responseError = error.response?.data?.error;
  let message = responseError?.message ?? "Không thể xử lý yêu cầu. Vui lòng thử lại.";

  if (error.code === AxiosError.ERR_CANCELED) {
    message = "Yêu cầu đã bị hủy.";
  } else if (error.code === AxiosError.ETIMEDOUT || error.code === AxiosError.ECONNABORTED) {
    message = "Máy chủ phản hồi quá lâu. Vui lòng thử lại.";
  } else if (!error.response) {
    message = "Không thể kết nối máy chủ LawScan. Vui lòng thử lại.";
  }

  return new ApiClientError(message, {
    status: error.response?.status,
    code: error.code,
    serverCode: responseError?.code,
    details: responseError?.details,
  });
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && error.config) {
      const config = error.config as RetryableRequestConfig;
      if (!config._retry && !isAuthRequest(config.url)) {
        config._retry = true;
        try {
          await refreshSession();
          return await apiClient(config);
        } catch {
        }
      }
    }

    return Promise.reject(normalizeApiError(error));
  },
);

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<ApiSuccessResponse<T>>(config);
  return response.data.data;
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}
