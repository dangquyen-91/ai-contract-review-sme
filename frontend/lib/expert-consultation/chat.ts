import { isApiClientError } from "@/lib/api/client";
import type { ExpertChatPage } from "@/types/expert-consultation";

export function conversationMessages(pages: ExpertChatPage[]) {
  const seen = new Set<string>();
  return [...pages].reverse().flatMap((page) => page.items).filter((message) => {
    if (seen.has(message.id)) return false;
    seen.add(message.id);
    return true;
  });
}

export function expertChatError(error: unknown) {
  if (isApiClientError(error)) {
    if ([403, 404].includes(error.status ?? 0)) return "Cuộc trao đổi chỉ dành cho người gửi yêu cầu và chuyên gia đã tiếp nhận. Bạn có thể không còn quyền truy cập.";
    if (error.serverCode === "EXPERT_CHAT_CLOSED") return "Cuộc trao đổi đã chuyển sang chỉ đọc. Hãy cập nhật trạng thái yêu cầu.";
    if (error.serverCode === "MESSAGE_ID_CONFLICT") return "Mã tin nhắn đã được sử dụng. Hãy đóng và mở lại cuộc trao đổi trước khi gửi nội dung mới.";
    if (error.status === 429) return "Bạn gửi tin quá nhanh. Vui lòng chờ một chút rồi thử lại.";
  }
  return "Chưa kết nối được cuộc trao đổi. Vui lòng thử lại; nội dung chưa gửi vẫn được giữ trong ô soạn.";
}
