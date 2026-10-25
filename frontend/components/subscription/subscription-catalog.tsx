import { SubscriptionPlanPicker } from "./subscription-plan-picker";

const faqs = [
  ["Gói cá nhân và tổ chức khác nhau thế nào?", "Gói cá nhân dành cho một tài khoản. Gói tổ chức chia sẻ hạn mức phân tích và chat cho các thành viên; số thành viên tối đa đã bao gồm Owner."],
  ["Gói miễn phí có những hạn mức nào?", "Chọn mục Cá nhân để xem giá và hạn mức Personal Free hiện tại. Hạn mức miễn phí được cấp theo tháng, không phải bản mẫu hợp đồng."],
  ["Lượt rà soát được tính thế nào?", "Mỗi lượt rà soát tối đa 5 trang, làm tròn lên theo từng tài liệu: 1–5 trang dùng 1 lượt, 6–10 trang dùng 2 lượt. Áp dụng cho cả cá nhân và doanh nghiệp. Số lượt được thông báo trước khi chạy; lỗi hoặc hủy trước khi hoàn tất sẽ hoàn lại lượt đã giữ."],
  ["Tạo hợp đồng theo mẫu có tốn lượt không?", "Điền mẫu, lưu nháp, sửa thủ công, duyệt và tải Word/PDF không trừ lượt. Mỗi lần AI soạn hoặc tạo lại thành công dùng 1 lượt soạn riêng của tổ chức. Soạn xong rồi chạy rà soát sẽ tính thêm lượt rà soát theo số trang."],
  ["Tổ chức chưa mua gói có được mời thành viên không?", "Tổ chức chưa mua gói có thể có tối đa 3 thành viên, bao gồm Owner. Đây là giới hạn thành viên mặc định, không phải gói phân tích miễn phí cho tổ chức."],
  ["Chọn gói ở đây có bị thu tiền không?", "Bạn có thể xem và xác nhận gói trước khi chuyển sang payOS. Chỉ giao dịch được hệ thống xác nhận mới cấp quyền lợi. Gia hạn nối tiếp kỳ hiện tại; nâng cấp thu đủ giá và bắt đầu kỳ mới, không bảo lưu quyền lợi gói cũ."],
];

export function SubscriptionCatalog() {
  return <>
    <div className="mx-auto mb-8 max-w-2xl text-center text-[#080e2f]"><p className="mb-3 text-[10px] font-bold uppercase tracking-[1.5px] text-[#2864dc]">GÓI DỊCH VỤ LAWSCAN</p><h1 className="text-[clamp(30px,3.4vw,46px)] font-semibold leading-[1.2] tracking-[-1.7px]">Chọn gói phù hợp với bạn</h1><p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[#61708b]">Từ hợp đồng cá nhân đến công việc của cả đội ngũ.<br className="hidden sm:block" /> Chủ động lựa chọn với giá và hạn mức rõ ràng.</p></div>
    <SubscriptionPlanPicker variant="catalog" showComparison />
    <section className="mt-[60px] grid gap-8 text-[#080e2f] md:grid-cols-[1fr_1.7fr]" aria-labelledby="subscription-faq-heading"><div><p className="mb-3 text-[10px] font-bold tracking-[1.5px] text-[#0066ff]">TRƯỚC KHI BẠN CHỌN</p><h2 id="subscription-faq-heading" className="text-[26px] font-semibold tracking-[-0.8px]">Một vài điều<br />cần làm rõ.</h2><p className="mt-1.5 text-[13px] text-[#61708b]">Để bạn biết mình sẽ nhận được gì.</p></div><div>{faqs.map(([question, answer]) => <details key={question} className="group border-b border-[#dce4ef]"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-[18px] text-[13px] font-semibold [&::-webkit-details-marker]:hidden">{question}<span aria-hidden="true" className="text-[20px] text-[#0066ff] group-open:rotate-45">+</span></summary><p className="pb-5 text-[13px] leading-relaxed text-[#61708b]">{answer}</p></details>)}</div></section>
  </>;
}
