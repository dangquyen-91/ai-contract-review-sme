import { ApiError } from '@google/genai';
import { AppError } from '../../errors/AppError';

export function draftingError(error: unknown): unknown {
  if (error instanceof AppError) return error;
  const apiError =
    error instanceof ApiError || (error instanceof Error && error.name === 'ApiError');
  if (apiError) {
    const status = (error as ApiError).status;
    if (status === 429)
      return new AppError(
        'Dịch vụ AI đang đạt giới hạn yêu cầu. Vui lòng thử lại sau ít phút. Yêu cầu này không bị trừ lượt.',
        503,
        true,
        'AI_RATE_LIMITED',
      );
    if (status >= 500)
      return new AppError(
        'Dịch vụ AI đang quá tải hoặc tạm gián đoạn. Vui lòng thử lại sau ít phút. Yêu cầu này không bị trừ lượt.',
        503,
        true,
        'AI_UNAVAILABLE',
      );
    if ([401, 403, 404].includes(status))
      return new AppError(
        'Dịch vụ AI chưa sẵn sàng do cấu hình truy cập. Vui lòng liên hệ quản trị viên. Yêu cầu này không bị trừ lượt.',
        503,
        true,
        'AI_CONFIGURATION_ERROR',
      );
    return new AppError(
      'Dịch vụ AI chưa xử lý được yêu cầu. Vui lòng thử lại hoặc liên hệ quản trị viên. Yêu cầu này không bị trừ lượt.',
      502,
      true,
      'AI_REQUEST_REJECTED',
    );
  }
  if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name))
    return new AppError(
      'AI phản hồi quá thời gian chờ. Vui lòng thử lại. Yêu cầu này không bị trừ lượt.',
      504,
      true,
      'AI_TIMEOUT',
    );
  return error;
}
