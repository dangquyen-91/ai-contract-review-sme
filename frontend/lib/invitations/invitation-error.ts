import { isApiClientError } from "@/lib/api/client";

export function invitationError(error: unknown) {
  const status = isApiClientError(error) ? error.status : undefined;
  if (status === 400 || status === 404 || status === 410) {
    return {
      title: "Lời mời không còn khả dụng",
      message: "Liên kết không hợp lệ, đã hết hạn, bị thu hồi hoặc đã được sử dụng. Hãy liên hệ Owner để được mời lại.",
      retryable: false,
    };
  }
  if (status === 429) {
    return {
      title: "Bạn đã thử quá nhiều lần",
      message: "Vui lòng đợi một lúc rồi thử lại để kiểm tra lời mời.",
      retryable: true,
    };
  }
  return {
    title: "Chưa thể kiểm tra lời mời",
    message: "Không thể kết nối hoặc nhận phản hồi từ máy chủ. Vui lòng kiểm tra kết nối và thử lại; chưa thể xác định lời mời còn hiệu lực hay không.",
    retryable: true,
  };
}
