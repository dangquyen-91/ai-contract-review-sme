import { SubscriptionPlanPicker } from "./subscription-plan-picker";

const faqs = [
  ["Gói cá nhân và tổ chức khác nhau thế nào?", "Gói cá nhân dành cho một tài khoản. Gói tổ chức chia sẻ hạn mức phân tích và chat cho các thành viên; số thành viên tối đa đã bao gồm Owner."],
  ["Gói miễn phí có những hạn mức nào?", "Chọn mục Cá nhân để xem giá và hạn mức Personal Free hiện tại. Hạn mức miễn phí được cấp theo tháng, không phải bản mẫu hợp đồng."],
  ["Hạn mức phân tích và chat được tính thế nào?", "Phân tích hợp đồng và chat là hai hạn mức riêng. Hạn mức áp dụng trong mỗi kỳ gói; chi tiết số lượt được hiển thị trên từng thẻ gói."],
  ["Tổ chức chưa mua gói có được mời thành viên không?", "Tổ chức chưa mua gói có thể có tối đa 3 thành viên, bao gồm Owner. Đây là giới hạn thành viên mặc định, không phải gói phân tích miễn phí cho tổ chức."],
  ["Chọn gói ở đây có bị thu tiền không?", "Trang này cung cấp thông tin gói và hạn mức. Thanh toán và kích hoạt gói trả phí chưa được kết nối trên giao diện này."],
];

export function SubscriptionCatalog() {
  return <>
    <div className="mx-auto mb-8 max-w-2xl text-center text-[#080e2f]"><p className="mb-3 text-[10px] font-bold uppercase tracking-[1.5px] text-[#2864dc]">GÓI DỊCH VỤ LAWSCAN</p><h1 className="text-[clamp(30px,3.4vw,46px)] font-semibold leading-[1.2] tracking-[-1.7px]">Chọn gói phù hợp với bạn</h1><p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[#61708b]">Từ hợp đồng cá nhân đến công việc của cả đội ngũ.<br className="hidden sm:block" /> Chủ động lựa chọn với giá và hạn mức rõ ràng.</p></div>
    <SubscriptionPlanPicker variant="catalog" showComparison />
    <section className="mt-[60px] grid gap-8 text-[#080e2f] md:grid-cols-[1fr_1.7fr]" aria-labelledby="subscription-faq-heading"><div><p className="mb-3 text-[10px] font-bold tracking-[1.5px] text-[#0066ff]">TRƯỚC KHI BẠN CHỌN</p><h2 id="subscription-faq-heading" className="text-[26px] font-semibold tracking-[-0.8px]">Một vài điều<br />cần làm rõ.</h2><p className="mt-1.5 text-[13px] text-[#61708b]">Để bạn biết mình sẽ nhận được gì.</p></div><div>{faqs.map(([question, answer]) => <details key={question} className="group border-b border-[#dce4ef]"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-[18px] text-[13px] font-semibold [&::-webkit-details-marker]:hidden">{question}<span aria-hidden="true" className="text-[20px] text-[#0066ff] group-open:rotate-45">+</span></summary><p className="pb-5 text-[13px] leading-relaxed text-[#61708b]">{answer}</p></details>)}</div></section>
  </>;
}
