"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";
import { authApi } from "@/lib/api/auth";
import { dashboardApi } from "@/lib/api/dashboard";
import type { ContractRiskLevel, ContractStatus, DashboardContract } from "@/types/contracts";
import styles from "@/styles/dashboard.module.css";

const statusLabels: Record<ContractStatus, string> = {
  uploaded: "Đã tải lên", processing: "Đang xử lý", reviewed: "Đã rà soát", archived: "Lưu trữ",
};
const riskLabels: Record<ContractRiskLevel, string> = {
  high: "Cao", medium: "Trung bình", low: "Thấp", none: "Chưa đánh giá",
};
const typeLabels: Record<DashboardContract["type"], string> = {
  sales: "Mua bán", service: "Dịch vụ", labor: "Lao động", saas: "SaaS",
};

export function OwnerDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loggingOut, setLoggingOut] = useState(false);
  const { data, error, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: dashboardApi.getOverview, retry: false });

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authApi.logout();
      queryClient.clear();
      router.replace("/dang-nhap");
      router.refresh();
    } catch {
      setLoggingOut(false);
      toast.error("Không thể đăng xuất. Vui lòng thử lại.");
    }
  }

  if (isLoading) return <div className={styles.skeleton} aria-busy="true" aria-label="Đang tải dashboard"><div className={styles.skeletonHeading} /><div className={styles.skeletonMetrics}>{Array.from({ length: 4 }, (_, i) => <i key={i} />)}</div><div className={styles.skeletonBody}><i /><i /></div></div>;
  if (error) throw error;
  if (!data) throw new Error("Không nhận được dữ liệu dashboard.");

  const initials = data.user?.name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase() || "OW";
  return <div className={styles.shell}>
    <a className={styles.skipLink} href="#dashboard-content">Đến nội dung chính</a>
    <aside className={styles.sidebar}>
      <Link className={styles.brand} href="/dashboard/owner" aria-label="LawScan dashboard owner"><Brand /></Link>
      <div className={styles.organizationCard}><span><Icon name="building" /></span><div><strong>{data.organization.name}</strong><small>Không gian tổ chức</small></div></div>
      <nav className={styles.navigation} aria-label="Điều hướng owner"><p>Quản lý tổ chức</p><Link className={styles.activeNav} href="/dashboard/owner" aria-current="page"><Icon name="document" />Tổng quan</Link><Link href="/dashboard/owner/review"><Icon name="upload" />Tải & rà soát</Link><p>Tài khoản</p><Link href="/goi-dich-vu"><Icon name="sparkle" />Gói dịch vụ</Link><Link href="/bao-cao-mau"><Icon name="search" />Báo cáo mẫu</Link></nav>
      <div className={styles.ownerProfile}><span>{initials}</span><div><strong>{data.user?.name ?? "Owner"}</strong><small>Quản trị tổ chức</small></div><button className={styles.logoutButton} type="button" onClick={logout} disabled={loggingOut}><Icon name="arrow" />Đăng xuất</button></div>
    </aside>
    <div className={styles.workspace}>
      <header className={styles.topbar}><div className={styles.mobileBrand}><Brand markOnly /><strong>LawScan</strong></div><p><span>{data.organization.name}</span><i>/</i><strong>Tổng quan owner</strong></p><div className={styles.topbarActions}><span className={styles.roleBadge}><Icon name="shield" />Owner</span><span className={styles.ownerMark}>{initials}</span><button className={styles.mobileLogout} type="button" onClick={logout} aria-label="Đăng xuất"><Icon name="arrow" /></button></div></header>
      <nav className={styles.mobileDashboardNav} aria-label="Điều hướng owner trên điện thoại"><Link href="/dashboard/owner" aria-current="page"><Icon name="document" />Tổng quan</Link><Link href="/dashboard/owner/review"><Icon name="upload" />Tải & rà soát</Link></nav>
      <main id="dashboard-content" className={styles.main}>
        <section className={styles.welcome}><div><p className={styles.contextLabel}>Dashboard owner</p><h1>Tổng quan tổ chức</h1><p>Theo dõi hợp đồng, tình trạng rà soát và những rủi ro cần ưu tiên xử lý.</p></div><Link className={styles.ownerPrimaryLink} href="/dashboard/owner/review">Tải hợp đồng mới <Icon name="arrow" /></Link></section>
        <section className={styles.ownerMetrics} aria-label="Chỉ số hợp đồng"><article><span>Tổng hợp đồng</span><strong>{data.totalContracts}</strong><small>Trong tổ chức</small></article><article><span>Đang xử lý</span><strong>{data.stats.processing}</strong><small>Cần theo dõi</small></article><article><span>Rủi ro cao</span><strong>{data.stats.highRisk}</strong><small>Cần ưu tiên xem</small></article><article><span>Đã rà soát</span><strong>{data.stats.reviewed}</strong><small>Sẵn sàng quyết định</small></article></section>
        <div className={styles.ownerOverviewGrid}>
          <section className={styles.contractPanel}><header className={styles.sectionHeading}><div><h2>Hợp đồng gần đây</h2><p>Cập nhật mới nhất của tổ chức.</p></div></header>{data.contracts.length ? <div className={styles.tableWrap}><table><thead><tr><th>Hợp đồng</th><th>Trạng thái</th><th>Rủi ro</th><th>Cập nhật</th></tr></thead><tbody>{data.contracts.map((contract) => <tr key={contract.id ?? contract._id}><td><span className={styles.contractIcon}><Icon name="document" /></span><div><strong>{contract.title}</strong><small>{typeLabels[contract.type]}</small></div></td><td><span className={`${styles.status} ${styles[`status_${contract.status}`]}`}>{statusLabels[contract.status]}</span></td><td><span className={`${styles.risk} ${styles[`risk_${contract.overallRiskLevel}`]}`}>{riskLabels[contract.overallRiskLevel]}</span></td><td><time dateTime={contract.updatedAt}>{new Intl.DateTimeFormat("vi-VN").format(new Date(contract.updatedAt))}</time></td></tr>)}</tbody></table></div> : <div className={styles.emptyState}><span><Icon name="upload" /></span><h3>Chưa có hợp đồng nào</h3><p>Tải hợp đồng đầu tiên để bắt đầu theo dõi tiến độ và rủi ro.</p><Link href="/dashboard/owner/review">Tải hợp đồng <Icon name="arrow" /></Link></div>}</section>
          <aside className={styles.ownerInfo}><section><span><Icon name="building" /></span><h2>{data.organization.name}</h2><p>Thông tin tổ chức</p><dl><div><dt>Mã số thuế</dt><dd>{data.organization.taxCode ?? "Chưa cập nhật"}</dd></div><div><dt>Địa chỉ</dt><dd>{data.organization.address ?? "Chưa cập nhật"}</dd></div><div><dt>Vai trò</dt><dd>Owner</dd></div></dl></section><section><span><Icon name="team" /></span><h2>Quản trị thành viên</h2><p>Tính năng quản lý thành viên đang được hoàn thiện.</p><Link href="/goi-dich-vu">Xem gói dịch vụ <Icon name="arrow" /></Link></section></aside>
        </div>
      </main>
    </div>
  </div>;
}
