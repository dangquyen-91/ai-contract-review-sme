"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Brand } from "@/components/ui/brand";
import { ReviewResults } from "@/components/dashboard/review-results";
import { Icon } from "@/components/ui/icon";
import { useReviewContractMutation, useUploadContractMutation } from "@/hooks/use-contracts";
import { authApi } from "@/lib/api/auth";
import { isApiClientError } from "@/lib/api/client";
import { dashboardApi } from "@/lib/api/dashboard";
import type { ContractReviewResult, ContractRiskLevel, ContractStatus, DashboardContract, DashboardData } from "@/types/dashboard";
import styles from "@/styles/dashboard.module.css";

type DashboardTab = "overview" | "upload" | "contracts" | "administration";
type ReviewStage = "idle" | "uploading" | "reviewing" | "done";

const roleAccess: Record<string, { upload: boolean; review: boolean; administer: boolean }> = {
  administrator: { upload: true, review: true, administer: true },
  owner: { upload: true, review: true, administer: true },
  manager: { upload: true, review: true, administer: false },
  staff: { upload: true, review: true, administer: false },
  reviewer: { upload: false, review: true, administer: false },
  user: { upload: true, review: true, administer: false },
};

const roleLabels: Record<string, string> = {
  administrator: "Quản trị viên", owner: "Chủ tổ chức", manager: "Quản lý",
  staff: "Nhân viên", reviewer: "Chuyên viên rà soát", user: "Người dùng",
};

const typeLabels: Record<DashboardContract["type"], string> = {
  sales: "Mua bán hàng hóa", service: "Cung ứng dịch vụ",
  labor: "Hợp đồng lao động", saas: "SaaS / Công nghệ",
};

const statusLabels: Record<ContractStatus, string> = {
  uploaded: "Đã tải lên", processing: "AI đang xử lý", reviewed: "Đã rà soát", archived: "Lưu trữ",
};

const riskLabels: Record<ContractRiskLevel, string> = {
  high: "Rủi ro cao", medium: "Trung bình", low: "Rủi ro thấp", none: "Chưa đánh giá",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function initials(name?: string) {
  if (!name) return "LS";
  return name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase();
}

function DashboardSkeleton() {
  return <div className={styles.skeleton} aria-label="Đang tải dashboard" aria-busy="true"><div className={styles.skeletonHeading} /><div className={styles.skeletonMetrics}>{Array.from({ length: 4 }, (_, index) => <i key={index} />)}</div><div className={styles.skeletonBody}><i /><i /></div></div>;
}

export function UserDashboard({ ownerMode = false }: { ownerMode?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const requestedView = searchParams.get("view");
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => {
    if (!ownerMode) return "upload";
    return requestedView === "upload" || requestedView === "contracts" || requestedView === "administration" ? requestedView : "overview";
  });
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [contractType, setContractType] = useState<DashboardContract["type"]>("service");
  const [analysisFocus, setAnalysisFocus] = useState("");
  const [runAi, setRunAi] = useState(true);
  const [workflowComplete, setWorkflowComplete] = useState(false);
  const [reviewResult, setReviewResult] = useState<ContractReviewResult | null>(null);
  const reviewResultRef = useRef<HTMLDivElement>(null);
  const [pendingReviewId, setPendingReviewId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const uploadContractMutation = useUploadContractMutation();
  const reviewContractMutation = useReviewContractMutation();
  const stage: ReviewStage = uploadContractMutation.isPending
    ? "uploading"
    : reviewContractMutation.isPending
      ? "reviewing"
      : workflowComplete
        ? "done"
        : "idle";
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      try { return await dashboardApi.getOverview(); }
      catch (requestError) {
        if (isApiClientError(requestError) && requestError.status === 403) {
          await authApi.refreshToken();
          return dashboardApi.getOverview();
        }
        throw requestError;
      }
    },
    retry: false,
  });
  const access = roleAccess[data?.role ?? "user"] ?? roleAccess.user;
  const hasOwnerWorkspace = ["owner", "administrator", "manager"].includes(data?.role ?? "");
  const profileInitials = useMemo(() => initials(data?.user?.name), [data?.user?.name]);

  useEffect(() => {
    if (reviewResult) reviewResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [reviewResult]);

  function selectTab(tab: DashboardTab) {
    setActiveTab(tab);
    if (ownerMode) router.replace(tab === "overview" ? "/dashboard/owner" : `/dashboard/owner?view=${tab}`, { scroll: false });
  }

  function selectFile(nextFile?: File) {
    if (!nextFile) return;
    const validTypes = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg"]);
    if (!validTypes.has(nextFile.type)) {
      toast.error("Định dạng chưa được hỗ trợ", { description: "Vui lòng chọn PDF, DOCX, PNG hoặc JPG." });
      return;
    }
    if (nextFile.size > 20 * 1024 * 1024) { toast.error("Tệp vượt quá 20 MB"); return; }
    setFile(nextFile);
    setTitle((current) => current || nextFile.name.replace(/\.[^.]+$/, ""));
    setReviewResult(null);
    setPendingReviewId(null);
  }

  function onFileInput(event: ChangeEvent<HTMLInputElement>) { selectFile(event.target.files?.[0]); }
  function onDrop(event: DragEvent<HTMLLabelElement>) { event.preventDefault(); setIsDragging(false); selectFile(event.dataTransfer.files?.[0]); }

  async function runReview(contractId: string, focus = analysisFocus) {
    const result = await reviewContractMutation.mutateAsync({
      contractId,
      analysisFocus: focus.trim() || undefined,
    });
    setReviewResult(result);
    setPendingReviewId(null);
    setWorkflowComplete(true);
    toast.success("AI đã hoàn tất rà soát", { description: `Đã phát hiện ${result.findings.length} điểm cần lưu ý.` });
  }

  async function submitContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!access.upload || !file || title.trim().length < 2 || stage === "uploading" || stage === "reviewing") return;
    setReviewResult(null); setWorkflowComplete(false);
    const formData = new FormData();
    formData.set("file", file); formData.set("title", title.trim()); formData.set("type", contractType);
    let uploadedId: string | null = null;
    try {
      const contract = await uploadContractMutation.mutateAsync(formData);
      const contractId = contract.id ?? contract._id;
      uploadedId = contractId ?? null;
      setFile(null);
      setTitle("");
      if (runAi && access.review && contractId) await runReview(contractId);
      else { setWorkflowComplete(true); toast.success("Đã tải hợp đồng lên"); }
    } catch (requestError) {
      if (uploadedId) setPendingReviewId(uploadedId);
      toast.error(uploadedId ? "Đã tải lên, nhưng AI chưa hoàn tất" : "Chưa thể tải hợp đồng lên", { description: isApiClientError(requestError) ? requestError.message : "Vui lòng thử lại sau." });
    }
  }

  async function reviewExisting(contract: DashboardContract) {
    const contractId = contract.id ?? contract._id;
    if (!contractId || !access.review || stage === "reviewing") return;
    selectTab("upload"); setTitle(contract.title); setReviewResult(null); setWorkflowComplete(false);
    try { await runReview(contractId, ""); }
    catch (requestError) {
      setPendingReviewId(contractId);
      toast.error("Chưa thể rà soát hợp đồng", { description: isApiClientError(requestError) ? requestError.message : "Vui lòng thử lại sau." });
    }
  }

  async function retryReview() {
    if (!pendingReviewId || stage === "reviewing") return;
    setWorkflowComplete(false);
    try { await runReview(pendingReviewId); }
    catch (requestError) {
      toast.error("AI chưa thể hoàn tất rà soát", { description: isApiClientError(requestError) ? requestError.message : "Vui lòng thử lại sau." });
    }
  }

  async function logout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try { await authApi.logout(); queryClient.clear(); router.replace("/dang-nhap"); router.refresh(); }
    catch { setIsLoggingOut(false); toast.error("Không thể đăng xuất. Vui lòng thử lại."); }
  }

  if (isLoading) return <DashboardSkeleton />;
  if (error || !data) {
    const needsOrganization = isApiClientError(error) && error.status === 403;
    return <section className={styles.errorState}><span><Icon name="document" /></span><h1>Chưa thể mở không gian làm việc</h1><p>{isApiClientError(error) ? error.message : "Không thể tải dữ liệu. Vui lòng thử lại."}</p>{needsOrganization ? <Link href="/chon-to-chuc">Thiết lập tổ chức <Icon name="arrow" /></Link> : <button type="button" onClick={() => refetch()}>Tải lại <Icon name="arrow" /></button>}</section>;
  }

  const roleLabel = roleLabels[data.role] ?? data.role;
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#dashboard-content">Đến nội dung chính</a>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href={data.role === "user" || data.role === "staff" || data.role === "reviewer" ? "/dashboard/user" : "/dashboard/owner"} aria-label="LawScan dashboard"><Brand /></Link>
        <div className={styles.organizationCard}><span><Icon name={data.role === "user" ? "user" : "building"} /></span><div><strong>{data.organization.name}</strong><small>{data.role === "user" ? "Không gian cá nhân" : "Không gian làm việc"}</small></div></div>
        <nav className={styles.navigation} aria-label="Điều hướng dashboard">
          <p>{hasOwnerWorkspace ? "Quản lý tổ chức" : "Không gian làm việc"}</p>
          {hasOwnerWorkspace && <button className={activeTab === "overview" ? styles.activeNav : ""} type="button" onClick={() => selectTab("overview")}><Icon name="building" />Tổng quan</button>}
          <button className={activeTab === "upload" ? styles.activeNav : ""} type="button" onClick={() => selectTab("upload")}><Icon name="upload" />Tải & rà soát</button>
          <button className={activeTab === "contracts" ? styles.activeNav : ""} type="button" onClick={() => selectTab("contracts")}><Icon name="document" />Hợp đồng<small>{data.totalContracts}</small></button>
          {access.administer && <button className={activeTab === "administration" ? styles.activeNav : ""} type="button" onClick={() => selectTab("administration")}><Icon name="team" />Quản trị</button>}
          <p>Hỗ trợ</p>
          {data.role === "user" && <Link href="/chon-to-chuc"><Icon name="building" />Tạo tổ chức</Link>}
          <Link href="/bao-cao-mau"><Icon name="search" />Báo cáo mẫu</Link><Link href="/goi-dich-vu"><Icon name="sparkle" />Gói dịch vụ</Link>
        </nav>
        <div className={styles.ownerProfile}><span>{profileInitials}</span><div><strong>{data.user?.name ?? "Tài khoản LawScan"}</strong><small>{roleLabel}</small></div><button className={styles.logoutButton} type="button" onClick={logout} disabled={isLoggingOut}><Icon name="arrow" />{isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</button></div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}><div className={styles.mobileBrand}><Brand markOnly /><strong>LawScan</strong></div><p><span>{data.organization.name}</span><i>/</i><strong>{activeTab === "overview" ? "Tổng quan" : activeTab === "upload" ? "Tải & rà soát" : activeTab === "contracts" ? "Hợp đồng" : "Quản trị"}</strong></p><div className={styles.topbarActions}><span className={styles.roleBadge}><Icon name="shield" />{roleLabel}</span><span className={styles.ownerMark}>{profileInitials}</span><button className={styles.mobileLogout} type="button" onClick={logout} disabled={isLoggingOut} aria-label="Đăng xuất"><Icon name="arrow" /></button></div></header>
        <nav className={styles.mobileDashboardNav} aria-label="Điều hướng dashboard trên điện thoại">{hasOwnerWorkspace && <button type="button" aria-current={activeTab === "overview" ? "page" : undefined} onClick={() => selectTab("overview")}><Icon name="building" />Tổng quan</button>}<button type="button" aria-current={activeTab === "upload" ? "page" : undefined} onClick={() => selectTab("upload")}><Icon name="upload" />Tải & rà soát</button><button type="button" aria-current={activeTab === "contracts" ? "page" : undefined} onClick={() => selectTab("contracts")}><Icon name="document" />Hợp đồng</button>{data.role === "user" && <Link href="/chon-to-chuc"><Icon name="building" />Tạo tổ chức</Link>}</nav>
        <main id="dashboard-content" className={styles.main}>
          {activeTab === "overview" && hasOwnerWorkspace && <OwnerOverview data={data} onUpload={() => selectTab("upload")} onViewContracts={() => selectTab("contracts")} />}
          {activeTab === "upload" && <>
            <section className={styles.welcome}><div><p className={styles.contextLabel}>{data.role === "user" ? "Dashboard của tôi" : "AI Contract Review"}</p><h1>Rà soát hợp đồng mới</h1><p>Tải hợp đồng lên để AI tóm tắt, nhận diện điều khoản rủi ro và đề xuất hướng chỉnh sửa.</p></div><div className={styles.securityNote}><Icon name="shield" /><span><strong>Dữ liệu riêng tư</strong><small>{data.role === "user" ? "Hợp đồng thuộc không gian cá nhân của bạn" : "Chỉ thành viên có quyền mới truy cập được"}</small></span></div></section>
            <section className={styles.workflowGrid}>
              <div className={styles.uploadPanel}>
                <header className={styles.panelHeader}><div><span>01</span><div><h2>Tải hợp đồng</h2><p>PDF, DOCX, PNG hoặc JPG · Tối đa 20 MB</p></div></div><span className={styles.permissionPill}>{access.upload ? "Được phép tải lên" : "Chỉ xem"}</span></header>
                {access.upload ? <form className={styles.uploadForm} onSubmit={submitContract}>
                  <label className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""} ${file ? styles.dropzoneReady : ""}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={onDrop}>
                    <input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={onFileInput} /><span className={styles.dropIcon}><Icon name={file ? "check" : "upload"} /></span>{file ? <span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(1)} MB · Nhấn để chọn tệp khác</small></span> : <span><strong>Thả hợp đồng vào đây</strong><small>hoặc nhấn để chọn tệp từ máy tính</small></span>}
                  </label>
                  <div className={styles.formGrid}><label><span>Tên hợp đồng</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Hợp đồng dịch vụ ABC" maxLength={300} /></label><label><span>Loại hợp đồng</span><select value={contractType} onChange={(event) => setContractType(event.target.value as DashboardContract["type"])}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
                  <label className={styles.focusField}><span>AI cần tập trung vào <small>Không bắt buộc</small></span><textarea value={analysisFocus} onChange={(event) => setAnalysisFocus(event.target.value)} placeholder="Ví dụ: ưu tiên điều khoản thanh toán, phạt vi phạm và chấm dứt hợp đồng..." maxLength={1000} /></label>
                  <div className={styles.formFooter}><label className={styles.aiToggle}><input type="checkbox" checked={runAi} onChange={(event) => setRunAi(event.target.checked)} disabled={!access.review} /><span aria-hidden="true" /><div><strong>Rà soát bằng AI ngay</strong><small>Tự động tóm tắt và phát hiện rủi ro</small></div></label><button className={styles.primaryButton} type="submit" disabled={!file || title.trim().length < 2 || stage === "uploading" || stage === "reviewing"}>{stage === "uploading" ? "Đang tải lên..." : stage === "reviewing" ? "AI đang rà soát..." : runAi ? "Bắt đầu rà soát" : "Tải hợp đồng lên"}<Icon name="arrow" /></button></div>
                </form> : <div className={styles.restrictedState}><span><Icon name="lock" /></span><div><h3>Vai trò của bạn không có quyền tải lên</h3><p>{access.review ? "Bạn vẫn có thể rà soát các hợp đồng đã được đội ngũ tải lên." : "Liên hệ quản trị viên để được cấp quyền phù hợp."}</p></div></div>}
                {pendingReviewId && <div className={styles.retryReview}><p>Hợp đồng đã được lưu. AI chưa hoàn tất lượt rà soát này.</p><button type="button" onClick={retryReview} disabled={stage === "reviewing"}>Thử rà soát lại <Icon name="arrow" /></button></div>}
              </div>
              <aside className={styles.progressPanel}><div className={styles.progressHeading}><span><Icon name="sparkle" /></span><div><h2>Quy trình AI</h2><p>Khoảng 1–3 phút</p></div></div><ol className={styles.progressList}><li className={stage !== "idle" ? styles.stepActive : ""}><span>{stage === "uploading" ? <i /> : <Icon name="check" />}</span><div><strong>Đọc tài liệu</strong><small>Trích xuất nội dung hợp đồng</small></div></li><li className={stage === "reviewing" || stage === "done" ? styles.stepActive : ""}><span>{stage === "reviewing" ? <i /> : <Icon name="sparkle" />}</span><div><strong>Phân tích điều khoản</strong><small>Đối chiếu dữ liệu pháp lý</small></div></li><li className={stage === "done" ? styles.stepActive : ""}><span><Icon name="shield" /></span><div><strong>Tổng hợp rủi ro</strong><small>Giải thích và đề xuất chỉnh sửa</small></div></li></ol><div className={styles.accessCard}><span>Quyền hiện tại</span><strong>{roleLabel}</strong><ul><li className={access.upload ? styles.allowed : ""}>Tải hợp đồng</li><li className={access.review ? styles.allowed : ""}>Chạy AI review</li>{access.administer && <li className={styles.allowed}>Quản trị tổ chức</li>}</ul></div></aside>
            </section>
            {reviewResult && <div ref={reviewResultRef}><ReviewResults result={reviewResult} /></div>}
            <RecentContracts contracts={data.contracts.slice(0, 5)} canReview={access.review} onReview={reviewExisting} isReviewing={stage === "reviewing"} onViewAll={() => selectTab("contracts")} />
          </>}
          {activeTab === "contracts" && <ContractsView contracts={data.contracts} canReview={access.review} onReview={reviewExisting} isReviewing={stage === "reviewing"} />}
          {activeTab === "administration" && access.administer && <AdministrationView organization={data.organization} roleLabel={roleLabel} />}
        </main>
      </div>
    </div>
  );
}

function OwnerOverview({ data, onUpload, onViewContracts }: { data: DashboardData; onUpload: () => void; onViewContracts: () => void }) {
  return <>
    <section className={styles.welcome}><div><p className={styles.contextLabel}>Dashboard owner</p><h1>Tổng quan tổ chức</h1><p>Theo dõi hợp đồng, tình trạng rà soát và những rủi ro cần ưu tiên xử lý.</p></div><button className={styles.ownerPrimaryLink} type="button" onClick={onUpload}>Tải hợp đồng mới <Icon name="arrow" /></button></section>
    <section className={styles.ownerMetrics} aria-label="Chỉ số hợp đồng"><article><span>Tổng hợp đồng</span><strong>{data.totalContracts}</strong><small>Trong tổ chức</small></article><article><span>Đang xử lý</span><strong>{data.stats.processing}</strong><small>Cần theo dõi</small></article><article><span>Rủi ro cao</span><strong>{data.stats.highRisk}</strong><small>Cần ưu tiên xem</small></article><article><span>Đã rà soát</span><strong>{data.stats.reviewed}</strong><small>Sẵn sàng quyết định</small></article></section>
    <div className={styles.ownerOverviewGrid}>
      <section className={styles.contractPanel}><header className={styles.sectionHeading}><div><h2>Hợp đồng gần đây</h2><p>Cập nhật mới nhất của tổ chức.</p></div>{data.contracts.length > 0 && <button type="button" onClick={onViewContracts}>Xem tất cả <Icon name="arrow" /></button>}</header><ContractTable contracts={data.contracts.slice(0, 5)} canReview={false} onReview={() => undefined} isReviewing={false} /></section>
      <aside className={styles.ownerInfo}><section><span><Icon name="building" /></span><h2>{data.organization.name}</h2><p>Thông tin tổ chức</p><dl><div><dt>Mã số thuế</dt><dd>{data.organization.taxCode ?? "Chưa cập nhật"}</dd></div><div><dt>Địa chỉ</dt><dd>{data.organization.address ?? "Chưa cập nhật"}</dd></div><div><dt>Vai trò</dt><dd>{roleLabels[data.role] ?? data.role}</dd></div></dl></section><section><span><Icon name="team" /></span><h2>Quản trị thành viên</h2><p>Quản lý thông tin và quyền truy cập của tổ chức trong cùng không gian làm việc.</p><button type="button" onClick={() => undefined} disabled>Sắp ra mắt</button></section></aside>
    </div>
  </>;
}


function RecentContracts({ contracts, canReview, onReview, isReviewing, onViewAll }: { contracts: DashboardContract[]; canReview: boolean; onReview: (contract: DashboardContract) => void; isReviewing: boolean; onViewAll: () => void }) {
  return <section className={styles.contractPanel}><header className={styles.sectionHeading}><div><h2>Hợp đồng gần đây</h2><p>Tiếp tục công việc đang dở hoặc xem lại kết quả.</p></div><button type="button" onClick={onViewAll}>Xem tất cả <Icon name="arrow" /></button></header><ContractTable contracts={contracts} canReview={canReview} onReview={onReview} isReviewing={isReviewing} /></section>;
}

function ContractsView({ contracts, canReview, onReview, isReviewing }: { contracts: DashboardContract[]; canReview: boolean; onReview: (contract: DashboardContract) => void; isReviewing: boolean }) {
  return <><section className={styles.welcome}><div><p className={styles.contextLabel}>Kho tài liệu</p><h1>Hợp đồng gần đây</h1><p>Theo dõi trạng thái xử lý và mức rủi ro của những hợp đồng mới nhất.</p></div></section><section className={`${styles.contractPanel} ${styles.fullContractPanel}`}><header className={styles.sectionHeading}><div><h2>Danh sách hợp đồng</h2><p>{contracts.length} tài liệu gần nhất</p></div></header><ContractTable contracts={contracts} canReview={canReview} onReview={onReview} isReviewing={isReviewing} /></section></>;
}

function ContractTable({ contracts, canReview, onReview, isReviewing }: { contracts: DashboardContract[]; canReview: boolean; onReview: (contract: DashboardContract) => void; isReviewing: boolean }) {
  if (!contracts.length) return <div className={styles.emptyState}><span><Icon name="document" /></span><h3>Chưa có hợp đồng</h3><p>Hợp đồng đầu tiên bạn tải lên sẽ xuất hiện tại đây.</p></div>;
  return <div className={styles.tableWrap}><table><thead><tr><th>Hợp đồng</th><th>Trạng thái</th><th>Rủi ro</th><th>Cập nhật</th><th aria-label="Hành động" /></tr></thead><tbody>{contracts.map((contract) => <tr key={contract.id ?? contract._id ?? contract.title}><td><span className={styles.contractIcon}><Icon name="document" /></span><div><strong>{contract.title}</strong><small>{typeLabels[contract.type]}</small></div></td><td><span className={`${styles.status} ${styles[`status_${contract.status}`]}`}>{statusLabels[contract.status]}</span></td><td><span className={`${styles.risk} ${styles[`risk_${contract.overallRiskLevel}`]}`}>{riskLabels[contract.overallRiskLevel]}</span></td><td><time dateTime={contract.updatedAt}>{formatDate(contract.updatedAt)}</time></td><td>{canReview && <button className={styles.reviewAction} type="button" onClick={() => onReview(contract)} disabled={isReviewing}><Icon name="sparkle" />{contract.status === "reviewed" ? "Rà soát lại" : "AI review"}</button>}</td></tr>)}</tbody></table></div>;
}

function AdministrationView({ organization, roleLabel }: { organization: { name: string; taxCode: string | null; address: string | null }; roleLabel: string }) {
  return <><section className={styles.welcome}><div><p className={styles.contextLabel}>Role-based access</p><h1>Quản trị tổ chức</h1><p>Thông tin và công cụ quản trị chỉ hiển thị cho vai trò có quyền.</p></div></section><div className={styles.adminGrid}><section><span><Icon name="building" /></span><h2>{organization.name}</h2><dl><div><dt>Mã số thuế</dt><dd>{organization.taxCode ?? "Chưa cập nhật"}</dd></div><div><dt>Địa chỉ</dt><dd>{organization.address ?? "Chưa cập nhật"}</dd></div><div><dt>Vai trò của bạn</dt><dd>{roleLabel}</dd></div></dl></section><section><span><Icon name="team" /></span><h2>Thành viên & phân quyền</h2><p>Mời thành viên, gán vai trò và kiểm soát phạm vi truy cập của đội ngũ.</p><button type="button" disabled>Sắp ra mắt</button></section><section><span><Icon name="sparkle" /></span><h2>Gói dịch vụ</h2><p>Xem hạn mức AI review và quyền lợi hiện tại của tổ chức.</p><Link href="/goi-dich-vu">Quản lý gói <Icon name="arrow" /></Link></section></div></>;
}
