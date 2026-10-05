"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";
import { authApi } from "@/lib/api/auth";
import { isApiClientError } from "@/lib/api/client";
import { dashboardApi } from "@/lib/api/dashboard";
import type { ContractRiskLevel, ContractStatus, DashboardContract } from "@/types/dashboard";
import styles from "@/styles/dashboard.module.css";

const typeLabels: Record<DashboardContract["type"], string> = {
  sales: "Mua bán",
  service: "Dịch vụ",
  labor: "Lao động",
  saas: "SaaS",
};

const statusLabels: Record<ContractStatus, string> = {
  uploaded: "Đã tải lên",
  processing: "Đang xử lý",
  reviewed: "Đã rà soát",
  archived: "Lưu trữ",
};

const riskLabels: Record<ContractRiskLevel, string> = {
  high: "Cao",
  medium: "Trung bình",
  low: "Thấp",
  none: "Chưa xác định",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function DashboardSkeleton() {
  return (
    <div className={styles.skeleton} aria-label="Đang tải dashboard" aria-busy="true">
      <div className={styles.skeletonHeading} />
      <div className={styles.skeletonMetrics}>{Array.from({ length: 4 }, (_, index) => <i key={index} />)}</div>
      <div className={styles.skeletonBody}><i /><i /></div>
    </div>
  );
}

export function OwnerDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["dashboard", "owner"],
    queryFn: dashboardApi.getOverview,
    retry: false,
  });

  async function logout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await authApi.logout();
      queryClient.clear();
      toast.success("Đăng xuất thành công", {
        description: "Phiên làm việc của bạn đã được kết thúc an toàn.",
      });
      router.replace("/dang-nhap");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
      toast.error("Không thể đăng xuất. Vui lòng thử lại.");
    }
  }

  if (isLoading) return <DashboardSkeleton />;

  if (error || !data) {
    const needsOrganization = isApiClientError(error) && error.status === 403;
    return (
      <section className={styles.errorState}>
        <span><Icon name="document" /></span>
        <h1>Chưa thể mở dashboard</h1>
        <p>{isApiClientError(error) ? error.message : "Không thể tải dữ liệu. Vui lòng thử lại."}</p>
        {needsOrganization ? (
          <Link href="/chon-to-chuc">Thiết lập tổ chức <Icon name="arrow" /></Link>
        ) : (
          <button type="button" onClick={() => refetch()}>Tải lại <Icon name="arrow" /></button>
        )}
      </section>
    );
  }

  const processingCount = data.stats.processing;
  const reviewedCount = data.stats.reviewed;
  const highRiskCount = data.stats.highRisk;

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#dashboard-content">Đến nội dung chính</a>

      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/dashboard" aria-label="LawScan dashboard"><Brand /></Link>

        <div className={styles.organizationCard}>
          <span><Icon name="building" /></span>
          <div><strong>{data.organization.name}</strong><small>Không gian tổ chức</small></div>
        </div>

        <nav className={styles.navigation} aria-label="Điều hướng dashboard">
          <p>Quản lý</p>
          <Link className={styles.activeNav} href="/dashboard" aria-current="page"><Icon name="document" />Tổng quan</Link>
          <a href="#hop-dong"><Icon name="briefcase" />Hợp đồng</a>
          <a href="#quan-tri"><Icon name="team" />Thành viên</a>
          <p>Tài khoản</p>
          <Link href="/goi-dich-vu"><Icon name="sparkle" />Gói dịch vụ</Link>
          <Link href="/bao-cao-mau"><Icon name="search" />Báo cáo mẫu</Link>
        </nav>

        <div className={styles.ownerProfile}>
          <span>OW</span>
          <div><strong>Organization Owner</strong><small>Toàn quyền quản trị</small></div>
          <button className={styles.logoutButton} type="button" onClick={logout} disabled={isLoggingOut}>
            <Icon name="arrow" />{isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.mobileBrand}><Brand markOnly /><strong>LawScan</strong></div>
          <p><span>Tổ chức</span><i>/</i><strong>Tổng quan</strong></p>
          <div className={styles.topbarActions}>
            <Link href="/bao-cao-mau">Xem báo cáo mẫu</Link>
            <span className={styles.ownerMark}>OW</span>
            <button className={styles.mobileLogout} type="button" onClick={logout} disabled={isLoggingOut} aria-label="Đăng xuất">
              <Icon name="arrow" />
            </button>
          </div>
        </header>

        <main id="dashboard-content" className={styles.main}>
          <section className={styles.welcome}>
            <div>
              <p className={styles.contextLabel}>Dashboard owner</p>
              <h1>Tổng quan tổ chức</h1>
              <p>Theo dõi hợp đồng, mức độ rủi ro và những việc cần xử lý trong một nơi.</p>
            </div>
            <Link className={styles.planLink} href="/goi-dich-vu">Quản lý gói <Icon name="arrow" /></Link>
          </section>

          <section className={styles.metrics} aria-label="Chỉ số hợp đồng">
            <article>
              <span>Tổng hợp đồng</span>
              <strong>{data.totalContracts}</strong>
              <small>Trong tổ chức</small>
            </article>
            <article>
              <span>Đang xử lý</span>
              <strong>{processingCount}</strong>
              <small>Cần theo dõi</small>
            </article>
            <article className={highRiskCount ? styles.metricAttention : ""}>
              <span>Rủi ro cao</span>
              <strong>{highRiskCount}</strong>
              <small>{highRiskCount ? "Cần ưu tiên xem" : "Chưa có cảnh báo"}</small>
            </article>
            <article>
              <span>Đã rà soát</span>
              <strong>{reviewedCount}</strong>
              <small>Sẵn sàng quyết định</small>
            </article>
          </section>

          <div className={styles.contentGrid}>
            <section id="hop-dong" className={styles.contractPanel}>
              <header className={styles.sectionHeading}>
                <div><h2>Hợp đồng gần đây</h2><p>Cập nhật mới nhất trong tổ chức.</p></div>
                {data.contracts.length > 0 && <span>{data.totalContracts} hợp đồng</span>}
              </header>

              {data.contracts.length === 0 ? (
                <div className={styles.emptyState}>
                  <span><Icon name="upload" /></span>
                  <h3>Chưa có hợp đồng nào</h3>
                  <p>Khi đội ngũ tải hợp đồng đầu tiên, tiến độ và rủi ro sẽ xuất hiện tại đây.</p>
                  <Link href="/bao-cao-mau">Khám phá báo cáo mẫu <Icon name="arrow" /></Link>
                </div>
              ) : (
                <div className={styles.tableWrap}>
                  <table>
                    <thead><tr><th>Hợp đồng</th><th>Trạng thái</th><th>Rủi ro</th><th>Cập nhật</th></tr></thead>
                    <tbody>
                      {data.contracts.map((contract) => (
                        <tr key={contract.id ?? contract._id ?? contract.title}>
                          <td><span className={styles.contractIcon}><Icon name="document" /></span><div><strong>{contract.title}</strong><small>{typeLabels[contract.type]}</small></div></td>
                          <td><span className={`${styles.status} ${styles[`status_${contract.status}`]}`}>{statusLabels[contract.status]}</span></td>
                          <td><span className={`${styles.risk} ${styles[`risk_${contract.overallRiskLevel}`]}`}>{riskLabels[contract.overallRiskLevel]}</span></td>
                          <td><time dateTime={contract.updatedAt}>{formatDate(contract.updatedAt)}</time></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <aside id="quan-tri" className={styles.ownerRail}>
              <section className={styles.orgSummary}>
                <header><span><Icon name="building" /></span><div><h2>{data.organization.name}</h2><p>Thông tin tổ chức</p></div></header>
                <dl>
                  <div><dt>Mã số thuế</dt><dd>{data.organization.taxCode ?? "Chưa cập nhật"}</dd></div>
                  <div><dt>Địa chỉ</dt><dd>{data.organization.address ?? "Chưa cập nhật"}</dd></div>
                  <div><dt>Vai trò</dt><dd>Owner</dd></div>
                </dl>
              </section>

              <section className={styles.ownerTools}>
                <div><h2>Quản trị tổ chức</h2><p>Các công cụ dành riêng cho owner.</p></div>
                <Link href="/goi-dich-vu"><span><Icon name="sparkle" /></span><div><strong>Gói dịch vụ</strong><small>Xem hạn mức và quyền lợi</small></div><Icon name="arrow" /></Link>
                <div className={styles.disabledTool} aria-disabled="true"><span><Icon name="team" /></span><div><strong>Quản lý thành viên</strong><small>Tính năng đang được hoàn thiện</small></div></div>
              </section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
