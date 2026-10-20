import type { DashboardContractFilter, DashboardData } from "@/types/dashboard";

export function ContractStatusChart({ data, reviewerMode, onFilter }: {
  data: DashboardData;
  reviewerMode: boolean;
  onFilter: (filter?: DashboardContractFilter) => void;
}) {
  const distribution = data.distribution;
  const titleId = reviewerMode ? "member-risk-chart-title" : "member-status-chart-title";
  const items = reviewerMode ? [
    { label: "Rủi ro cao", value: distribution?.risks.high ?? 0, color: "#d65a70", filter: { riskLevel: "high" } as DashboardContractFilter },
    { label: "Trung bình", value: distribution?.risks.medium ?? 0, color: "#d69a32", filter: { riskLevel: "medium" } as DashboardContractFilter },
    { label: "Rủi ro thấp", value: distribution?.risks.low ?? 0, color: "#20a078", filter: { riskLevel: "low" } as DashboardContractFilter },
    { label: "Chưa đánh giá", value: distribution?.risks.none ?? 0, color: "#9aa8bc", filter: { riskLevel: "none" } as DashboardContractFilter },
  ] : [
    { label: "Chờ rà soát", value: distribution?.statuses.uploaded ?? 0, color: "#d69a32", filter: { status: "uploaded" } as DashboardContractFilter },
    { label: "AI đang xử lý", value: distribution?.statuses.processing ?? 0, color: "#3775df", filter: { status: "processing" } as DashboardContractFilter },
    { label: "Đã rà soát", value: distribution?.statuses.reviewed ?? 0, color: "#20a078", filter: { status: "reviewed" } as DashboardContractFilter },
    { label: "Lưu trữ", value: distribution?.statuses.archived ?? 0, color: "#9aa8bc", filter: { status: "archived" } as DashboardContractFilter },
  ];
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;
  const gradient = items.map((item) => {
    const start = offset;
    offset += total ? item.value / total * 100 : 0;
    return `${item.color} ${start}% ${offset}%`;
  }).join(", ");

  return <section className={"min-w-[0] [border:1px_solid_#e1e8f2] rounded-[18px] [background:#fff] p-[24px] shadow-[0_18px_35px_-34px_#4b668b] [&_h2]:m-[0] [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:tracking-[-.02em] max-[650px]:p-[20px]"} aria-labelledby={titleId}>
    <h2 id={titleId}>{reviewerMode ? "Phân bố mức rủi ro" : "Trạng thái hợp đồng"}</h2>
    <p className={"mt-[7px]! text-[#708099] text-[12px] leading-[1.6]"}>Toàn tổ chức · số hợp đồng</p>
    {!distribution ? <p className={"grid min-h-[220px] content-center text-[#708099] text-[13px] leading-[1.7] text-center"}>Chưa tải được thống kê biểu đồ.</p> : !total ? <p className={"grid min-h-[220px] content-center text-[#708099] text-[13px] leading-[1.7] text-center"}>Chưa có hợp đồng để thống kê. Biểu đồ sẽ xuất hiện khi có dữ liệu.</p> : <>
      {!reviewerMode && <div className={"grid w-[168px] h-[168px] place-items-center rounded-[50%] m-[24px_auto] [animation:reveal_.5s_ease_both] [&_>_div]:grid [&_>_div]:w-[123px] [&_>_div]:h-[123px] [&_>_div]:place-content-center [&_>_div]:gap-[4px] [&_>_div]:rounded-[50%] [&_>_div]:[background:white] [&_>_div]:text-center [&_strong]:text-[#203754] [&_strong]:text-[30px] [&_strong]:font-bold [&_strong]:tracking-[-.04em] [&_span]:text-[#708099] [&_span]:text-[12px] motion-reduce:[animation:none]"} style={{ background: `conic-gradient(${gradient})` }} aria-hidden="true"><div><strong>{total.toLocaleString("vi-VN")}</strong><span>hợp đồng</span></div></div>}
      <ul className={"list-none m-[22px_0_0] p-[0] grid gap-[8px] [&_button]:block [&_button]:w-[100%] [&_button]:[border:0] [&_button]:rounded-[8px] [&_button]:p-[8px] [&_button]:[background:transparent] [&_button]:text-[#3b4d68] [&_button]:text-left [&_button]:cursor-pointer [&_button:hover]:[background:#f4f7fc]"}>
        {items.map((item) => <li key={item.label}><button type="button" onClick={() => onFilter(item.filter)} aria-label={`${item.label}: ${item.value} hợp đồng. Xem danh sách`}>
          <span className={"flex justify-between gap-[16px] text-[13px] [&_>_span]:inline-flex [&_>_span]:items-center [&_>_span]:gap-[8px] [&_i]:w-[9px] [&_i]:h-[9px] [&_i]:rounded-[3px] [&_i]:flex-none"}><span><i style={{ background: item.color }} />{item.label}</span><strong>{item.value.toLocaleString("vi-VN")}</strong></span>
          {reviewerMode && <span className={"block h-[9px] mt-[10px] rounded-[6px] overflow-hidden [background:#eef2f7] [&_>_span]:block [&_>_span]:h-[100%] [&_>_span]:rounded-[inherit] [&_>_span]:[animation:reveal_.5s_ease_both] motion-reduce:[&_>_span]:[animation:none]"} aria-hidden="true"><span style={{ width: `${item.value / total * 100}%`, background: item.color }} /></span>}
          {reviewerMode && <span className={"block mt-[6px] text-[#7c8a9e] text-[11px]"}>{Math.round(item.value / total * 100)}% tổng hợp đồng</span>}
        </button></li>)}
      </ul>
      <p className={"mt-[18px]! text-[#708099] text-[12px] leading-[1.6] pt-[15px] [border-top:1px_solid_#edf1f7]"}>Chọn một nhóm để xem hợp đồng tương ứng.</p>
      {reviewerMode && <p className={"mt-[7px]! text-[#708099] text-[12px] leading-[1.6]"}>Mức rủi ro do AI đánh giá, chưa thể hiện phê duyệt của chuyên viên.</p>}
    </>}
  </section>;
}
