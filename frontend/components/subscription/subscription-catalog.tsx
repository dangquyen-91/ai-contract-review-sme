import { SubscriptionPlanPicker } from "./subscription-plan-picker";
import type { PlanAudience } from "@/types/subscription";

const faqs = [
  [
    "Gói cá nhân và tổ chức khác nhau thế nào?",
    "Gói cá nhân dành cho một tài khoản. Gói tổ chức chia sẻ hạn mức phân tích và chat cho các thành viên; số thành viên tối đa đã bao gồm Owner.",
  ],
  [
    "Gói miễn phí có những hạn mức nào?",
    "Chọn mục Cá nhân để xem giá và hạn mức Personal Free hiện tại. Hạn mức miễn phí được cấp theo tháng, không phải bản mẫu hợp đồng.",
  ],
  [
    "Lượt rà soát được tính thế nào?",
    "Mỗi lượt rà soát tối đa 5 trang, làm tròn lên theo từng tài liệu: 1–5 trang dùng 1 lượt, 6–10 trang dùng 2 lượt. Áp dụng cho cả cá nhân và doanh nghiệp. Số lượt được thông báo trước khi chạy; lỗi hoặc hủy trước khi hoàn tất sẽ hoàn lại lượt đã giữ.",
  ],
  [
    "Tạo hợp đồng theo mẫu có tốn lượt không?",
    "Điền mẫu, lưu nháp, sửa thủ công, duyệt và tải Word/PDF không trừ lượt. Mỗi lần AI soạn hoặc tạo lại thành công dùng 1 lượt soạn riêng của tổ chức. Soạn xong rồi chạy rà soát sẽ tính thêm lượt rà soát theo số trang.",
  ],
  [
    "Tổ chức chưa mua gói có được mời thành viên không?",
    "Tổ chức chưa mua gói có thể có tối đa 3 thành viên, bao gồm Owner. Đây là giới hạn thành viên mặc định, không phải gói phân tích miễn phí cho tổ chức.",
  ],
  [
    "Chọn gói ở đây có bị thu tiền không?",
    "Bạn có thể xem và xác nhận gói trước khi chuyển sang payOS. Chỉ giao dịch được hệ thống xác nhận mới cấp quyền lợi. Gia hạn nối tiếp kỳ hiện tại; nâng cấp thu đủ giá và bắt đầu kỳ mới, không bảo lưu quyền lợi gói cũ.",
  ],
];

export function SubscriptionCatalog({
  audience = "business",
  accountId,
}: {
  audience?: PlanAudience;
  accountId?: string | null;
}) {
  return (
    <>
      <div className="mx-auto mb-8 max-w-3xl text-center">
        <p className="mb-5 flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[1.8px] text-[#52688b] before:h-0.5 before:w-5 before:bg-[#0066ff] before:content-['']">
          Gói dịch vụ LawScan
        </p>
        <h1 className="text-[clamp(32px,3.4vw,49px)] font-semibold leading-[1.16] tracking-[-1.2px] sm:tracking-[-1.8px]">
          Chọn gói phù hợp.
          <br />
          <span className="text-slate-500">Chủ động mỗi lần ký.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-[#61708b] sm:text-base">
          Từ hợp đồng cá nhân đến công việc của cả đội ngũ.
          <br className="hidden sm:block" /> Chủ động lựa chọn với giá và hạn
          mức rõ ràng.
        </p>
      </div>
      <SubscriptionPlanPicker
        key={audience}
        variant="catalog"
        showComparison
        initialAudience={audience}
        accountId={accountId}
      />
      <section
        className="mt-16 grid gap-8 border-t border-[#dce4ef] pt-12 md:grid-cols-[1fr_1.7fr] md:gap-12 lg:mt-20 lg:pt-16"
        aria-labelledby="subscription-faq-heading"
      >
        <div>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[1.8px] text-[#52688b]">
            Trước khi bạn chọn
          </p>
          <h2
            id="subscription-faq-heading"
            className="text-[clamp(28px,3vw,38px)] font-semibold leading-[1.2] tracking-[-1.2px]"
          >
            Một vài điều
            <br />
            cần làm rõ.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[#61708b]">
            Để bạn biết mình sẽ nhận được gì.
          </p>
        </div>
        <div>
          {faqs.map(([question, answer]) => (
            <details key={question} className="group border-b border-[#dce4ef]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-semibold focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2864dc] [&::-webkit-details-marker]:hidden">
                {question}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-xl text-[#0066ff] transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-5 text-sm leading-7 text-[#61708b]">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
