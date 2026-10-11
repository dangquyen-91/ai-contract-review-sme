import type { DashboardContractFilter, DashboardData } from "@/types/dashboard";
import styles from "./member-insights.module.css";

export function MemberContractChart({ data, reviewerMode, onFilter }: {
  data: DashboardData;
  reviewerMode: boolean;
  onFilter: (filter?: DashboardContractFilter) => void;
}) {
  const distribution = data.distribution;
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

  return <section className={styles.chartCard} aria-labelledby="member-chart-title">
    <h2 id="member-chart-title">{reviewerMode ? "Phân bố mức rủi ro" : "Trạng thái hợp đồng"}</h2>
    <p className={styles.subtitle}>Toàn tổ chức · số hợp đồng</p>
    {!distribution ? <p className={styles.empty}>Chưa tải được thống kê biểu đồ.</p> : !total ? <p className={styles.empty}>Chưa có hợp đồng để thống kê. Biểu đồ sẽ xuất hiện khi có dữ liệu.</p> : <>
      {!reviewerMode && <div className={styles.donut} style={{ background: `conic-gradient(${gradient})` }} aria-hidden="true"><div><strong>{total.toLocaleString("vi-VN")}</strong><span>hợp đồng</span></div></div>}
      <ul className={styles.legend}>
        {items.map((item) => <li key={item.label}><button type="button" onClick={() => onFilter(item.filter)} aria-label={`${item.label}: ${item.value} hợp đồng. Xem danh sách`}>
          <span className={styles.legendHeading}><span><i style={{ background: item.color }} />{item.label}</span><strong>{item.value.toLocaleString("vi-VN")}</strong></span>
          {reviewerMode && <span className={styles.barTrack} aria-hidden="true"><span style={{ width: `${item.value / total * 100}%`, background: item.color }} /></span>}
          {reviewerMode && <span className={styles.percent}>{Math.round(item.value / total * 100)}% tổng hợp đồng</span>}
        </button></li>)}
      </ul>
      <p className={styles.hint}>Chọn một nhóm để xem hợp đồng tương ứng.</p>
      {reviewerMode && <p className={styles.subtitle}>Mức rủi ro do AI đánh giá, chưa thể hiện phê duyệt của chuyên viên.</p>}
    </>}
  </section>;
}
