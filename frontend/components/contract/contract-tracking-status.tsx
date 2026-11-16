export const trackingPresentation = {
  requested: { label: "Chờ chuyên gia tiếp nhận", tone: "border-blue-200 bg-blue-50 text-blue-900", detail: "Yêu cầu đã được gửi. Chuyên gia chưa tiếp nhận." },
  in_progress: { label: "Chuyên gia đang kiểm tra", tone: "border-blue-200 bg-blue-50 text-blue-900", detail: "Chuyên gia đã tiếp nhận và đang kiểm tra hợp đồng." },
  approved: { label: "Đã được chuyên gia kiểm tra", tone: "border-emerald-200 bg-emerald-50 text-emerald-900", detail: "Chuyên gia đã hoàn tất kiểm tra. Mở kết quả để xem các điểm cần lưu ý." },
  returned: { label: "Chuyên gia đã trả lại", tone: "border-amber-300 bg-amber-50 text-amber-950", detail: "Yêu cầu đã được trả lại. Xem lý do trước khi gửi lại." },
};
