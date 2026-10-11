"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Brand } from "@/components/ui/brand";
import { ReviewResults } from "@/components/contract/review-results";
import { AnalysisFocusDialog } from "@/components/contract/analysis-focus-dialog";
import { ContractUploadForm } from "@/components/contract/contract-upload-form";
import { Icon } from "@/components/ui/icon";
import { useGetContractReviewMutation, useReviewContractMutation, useUploadContractMutation } from "@/hooks/use-contracts";
import { authApi } from "@/lib/api/auth";
import { isApiClientError } from "@/lib/api/client";
import { dashboardApi } from "@/lib/api/dashboard";
import type { ContractReviewResult, ContractRiskLevel, ContractStatus, DashboardContract } from "@/types/contracts";
import type { DashboardData } from "@/types/dashboard";

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

const statusClasses: Record<ContractStatus, string> = {
  uploaded: "text-[#53677f] bg-[#eef2f6]",
  processing: "text-[#1557ae] bg-[#e7f0ff]",
  reviewed: "text-[#206c59] bg-[#e8f5f1]",
  archived: "text-[#6a7280] bg-[#eff1f3]",
};

const riskClasses: Record<ContractRiskLevel, string> = {
  high: "text-[#a63045] bg-[#fff0f2]",
  medium: "text-[#875a00] bg-[#fff4dc]",
  low: "text-[#20705d] bg-[#e8f5f1]",
  none: "text-[#75808e] bg-[#f0f2f5]",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function reviewErrorMessage(error: unknown) {
  if (isApiClientError(error) && error.status === 409) {
    return "Hợp đồng đang được phân tích ở một phiên khác. Vui lòng thử lại sau khi quá trình đó hoàn tất.";
  }
  return isApiClientError(error) ? error.message : "Vui lòng thử lại sau.";
}

function initials(name?: string) {
  if (!name) return "LS";
  return name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase();
}

function DashboardSkeleton() {
  return <div className="min-h-dvh [background:#f6f7f9] px-[max(5vw,28px)] py-20" aria-label="Đang tải dashboard" aria-busy="true"><div className="block [background:linear-gradient(90deg,#e7ebf0_25%,#f3f5f7_50%,#e7ebf0_75%)] animate-[shimmer_1.3s_infinite] rounded-xl [background-size:200%_100%] w-[min(440px,70%)] h-[75px] motion-reduce:animate-none" /><div className="[&_i]:block [&_i]:[background:linear-gradient(90deg,#e7ebf0_25%,#f3f5f7_50%,#e7ebf0_75%)] [&_i]:animate-[shimmer_1.3s_infinite] [&_i]:rounded-xl [&_i]:[background-size:200%_100%] grid grid-cols-[repeat(4,1fr)] gap-2 mt-7 [&_i]:h-[90px] [&_i]:motion-reduce:animate-none">{Array.from({ length: 4 }, (_, index) => <i key={index} />)}</div><div className="[&_i]:block [&_i]:[background:linear-gradient(90deg,#e7ebf0_25%,#f3f5f7_50%,#e7ebf0_75%)] [&_i]:animate-[shimmer_1.3s_infinite] [&_i]:rounded-xl [&_i]:[background-size:200%_100%] grid grid-cols-[1.65fr_0.58fr] gap-5 mt-5 [&_i]:h-[420px] [&_i]:motion-reduce:animate-none"><i /><i /></div></div>;
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
  const [uploadedContract, setUploadedContract] = useState<{ id: string; title: string } | null>(null);
  const [workflowComplete, setWorkflowComplete] = useState(false);
  const [reviewResult, setReviewResult] = useState<ContractReviewResult | null>(null);
  const reviewResultRef = useRef<HTMLDivElement>(null);
  const [pendingReviewId, setPendingReviewId] = useState<string | null>(null);
  const [pendingReviewFocus, setPendingReviewFocus] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const uploadContractMutation = useUploadContractMutation();
  const reviewContractMutation = useReviewContractMutation();
  const getContractReviewMutation = useGetContractReviewMutation();
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
    setPendingReviewFocus("");
  }

  async function runReview(contractId: string, focus = "") {
    const result = await reviewContractMutation.mutateAsync({
      contractId,
      analysisFocus: focus.trim() || undefined,
    });
    setReviewResult(result);
    setPendingReviewId(null);
    setPendingReviewFocus("");
    setWorkflowComplete(true);
    toast.success("AI đã hoàn tất rà soát", { description: `Đã phát hiện ${result.findings.length} điểm cần lưu ý.` });
  }

  async function submitContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!access.upload || !file || title.trim().length < 2 || stage === "uploading" || stage === "reviewing") return;
    setReviewResult(null); setWorkflowComplete(false);
    const formData = new FormData();
    formData.set("file", file); formData.set("title", title.trim()); formData.set("type", contractType);
    try {
      const contract = await uploadContractMutation.mutateAsync(formData);
      const contractId = contract.id ?? contract._id;
      setFile(null);
      setTitle("");
      if (access.review && contractId) setUploadedContract({ id: contractId, title: contract.title });
      else { toast.success("Đã tải hợp đồng lên"); }
    } catch (requestError) {
      toast.error("Chưa thể tải hợp đồng lên", { description: reviewErrorMessage(requestError) });
    }
  }

  function skipUploadedReview() {
    setUploadedContract(null);
    toast.success("Đã tải hợp đồng lên");
  }

  async function reviewUploadedContract(focus: string) {
    if (!uploadedContract) return;
    const contractId = uploadedContract.id;
    setUploadedContract(null);
    try { await runReview(contractId, focus); }
    catch (requestError) {
      setPendingReviewId(contractId);
      setPendingReviewFocus(focus);
      toast.error("Đã tải lên, nhưng AI chưa hoàn tất", { description: reviewErrorMessage(requestError) });
    }
  }

  async function reviewExisting(contract: DashboardContract, rerun = false) {
    const contractId = contract.id ?? contract._id;
    if (!contractId || stage === "reviewing" || getContractReviewMutation.isPending) return;
    selectTab("upload"); setTitle(contract.title); setReviewResult(null); setWorkflowComplete(false);
    try {
      if (contract.status === "reviewed" && !rerun) {
        const result = await getContractReviewMutation.mutateAsync(contractId);
        setReviewResult(result);
        setWorkflowComplete(true);
      } else if (access.review) {
        await runReview(contractId, "");
      }
    }
    catch (requestError) {
      setPendingReviewId(contractId);
      toast.error("Chưa thể rà soát hợp đồng", { description: reviewErrorMessage(requestError) });
    }
  }

  async function retryReview() {
    if (!pendingReviewId || stage === "reviewing") return;
    setWorkflowComplete(false);
    try { await runReview(pendingReviewId, pendingReviewFocus); }
    catch (requestError) {
      toast.error("AI chưa thể hoàn tất rà soát", { description: reviewErrorMessage(requestError) });
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
    return <section className="min-h-dvh flex flex-col items-center justify-center text-[color:var(--ink)] [background:#f6f7f9] text-center p-7 [&>_span]:w-14 [&>_span]:h-14 [&>_span]:grid [&>_span]:place-items-center [&>_span]:text-[color:var(--accent)] [&>_span]:[background:#e8f0ff] [&>_span]:rounded-[15px] [&_h1]:text-[length:27px] [&_h1]:mt-[18px] [&_h1]:mb-0 [&_h1]:mx-0 [&_p]:max-w-[470px] [&_p]:text-[color:var(--muted)] [&_p]:text-[length:12px] [&_p]:leading-[1.6] [&_p]:mt-2 [&_p]:mb-0 [&_p]:mx-0 [&_:is(a,_button)]:min-h-[43px] [&_:is(a,_button)]:inline-flex [&_:is(a,_button)]:items-center [&_:is(a,_button)]:gap-3 [&_:is(a,_button)]:text-[white] [&_:is(a,_button)]:[background:var(--accent)] [&_:is(a,_button)]:[font:inherit] [&_:is(a,_button)]:cursor-pointer [&_:is(a,_button)]:mt-5 [&_:is(a,_button)]:px-[15px] [&_:is(a,_button)]:py-0 [&_:is(a,_button)]:rounded-[9px] [&_:is(a,_button)]:border-0 [&_:is(a,_button)]:border-none [&_:is(a,_button)]:border-current [&_:is(a,_button)]:[font-size:10px] [&_:is(a,_button)]:[font-weight:700] [&_svg]:w-4"><span><Icon name="document" /></span><h1>Chưa thể mở không gian làm việc</h1><p>{isApiClientError(error) ? error.message : "Không thể tải dữ liệu. Vui lòng thử lại."}</p>{needsOrganization ? <Link href="/chon-to-chuc">Thiết lập tổ chức <Icon name="arrow" /></Link> : <button type="button" onClick={() => refetch()}>Tải lại <Icon name="arrow" /></button>}</section>;
  }

  const roleLabel = roleLabels[data.role] ?? data.role;
  return (
    <div className="[--ink:#14213d] [--muted:#6b778c] [--line:#e4e8ef] [--accent:#2864dc] [--accent-dark:#1f4fb2] [--soft:#f4f7fb] min-h-dvh flex text-[color:var(--ink)] [background:#f6f7f9] [font-family:var(--font-geist-sans),Arial,sans-serif] [&_*]:box-border [&_:is(a,_button)]:[text-decoration:none] [&_:is(a,_button,_input,_select,_textarea)]:focus-visible:[outline:3px_solid_#9bbcf8] [&_:is(a,_button,_input,_select,_textarea)]:focus-visible:outline-offset-2 [@media_(max-width:_820px)]:block [&_*]:motion-reduce:!transition-none [&_*::before]:motion-reduce:!transition-none [&_*::after]:motion-reduce:!transition-none">
      <a className="fixed top-[-60px] z-20 text-[color:var(--ink)] [background:white] px-3.5 py-2.5 rounded-lg left-4 focus:top-3" href="#dashboard-content">Đến nội dung chính</a>
      <aside className="sticky w-[252px] h-dvh flex flex-none flex-col [border-right:1px_solid_var(--line)] [background:#fff] pt-[22px] pb-[18px] px-4 top-0 [@media_(max-width:_1100px)]:w-[218px] [@media_(max-width:_820px)]:hidden">
        <Link className="w-fit pl-2 [&_.brand-image]:w-[150px] [&_.brand-image]:h-[52px] [&_.brand-image_img]:top-[-18px] [&_.brand-image_img]:w-[154px] [&_.brand-image_img]:h-[84px]" href={data.role === "user" || data.role === "staff" || data.role === "reviewer" ? "/dashboard/user" : "/dashboard/owner"} aria-label="LawScan dashboard"><Brand /></Link>
        <div className="grid grid-cols-[38px_minmax(0,1fr)] items-center gap-2.5 border [background:#f8fafc] mt-[22px] p-[11px] rounded-[11px] border-solid border-[#dbe3ed] [&>_span]:w-[38px] [&>_span]:h-[38px] [&>_span]:grid [&>_span]:place-items-center [&>_span]:text-[color:var(--accent)] [&>_span]:[background:#eaf1ff] [&>_span]:rounded-[9px] [&_svg]:w-[18px] [&_strong]:block [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_small]:block [&_small]:overflow-hidden [&_small]:text-ellipsis [&_small]:whitespace-nowrap [&_strong]:text-[length:12px] [&_small]:text-[color:var(--muted)] [&_small]:text-[length:9px] [&_small]:mt-0.5"><span><Icon name={data.role === "user" ? "user" : "building"} /></span><div><strong>{data.organization.name}</strong><small>{data.role === "user" ? "Không gian cá nhân" : "Không gian làm việc"}</small></div></div>
        <nav className="grid gap-1 mt-[22px] [&_p]:text-[#929baa] [&_p]:text-[length:9px] [&_p]:font-[750] [&_p]:tracking-[0.9px] [&_p]:uppercase [&_p]:mt-[18px] [&_p]:mb-1.5 [&_p]:mx-2.5 [&_p]:first:mt-0 [&_:is(a,_button)]:w-full [&_:is(a,_button)]:min-h-[42px] [&_:is(a,_button)]:flex [&_:is(a,_button)]:items-center [&_:is(a,_button)]:gap-[11px] [&_:is(a,_button)]:text-[#5f6d82] [&_:is(a,_button)]:[background:transparent] [&_:is(a,_button)]:[font-family:inherit] [&_:is(a,_button)]:text-left [&_:is(a,_button)]:cursor-pointer [&_:is(a,_button)]:transition-all [&_:is(a,_button)]:duration-[160ms] [&_:is(a,_button)]:ease-[ease] [&_:is(a,_button)]:delay-0 [&_:is(a,_button)]:px-3 [&_:is(a,_button)]:py-0 [&_:is(a,_button)]:rounded-[9px] [&_:is(a,_button)]:border-0 [&_:is(a,_button)]:border-none [&_:is(a,_button)]:border-current [&_:is(a,_button)]:hover:text-[color:var(--ink)] [&_:is(a,_button)]:hover:[background:#f3f5f8] [&_:is(a,_button)]:[font-size:12px] [&_:is(a,_button)]:[font-weight:580] [&_:is(a,_button)_svg]:w-[18px] [&_:is(a,_button)_svg]:flex-none [&_:is(a,_button)_small]:min-w-[22px] [&_:is(a,_button)_small]:[background:#e8edf4] [&_:is(a,_button)_small]:text-[length:9px] [&_:is(a,_button)_small]:text-center [&_:is(a,_button)_small]:ml-auto [&_:is(a,_button)_small]:px-1.5 [&_:is(a,_button)_small]:py-0.5 [&_:is(a,_button)_small]:rounded-[10px] [&_button[aria-current=page]]:text-[#1e53b8] [&_button[aria-current=page]]:[background:#eaf1ff] [&_button[aria-current=page]]:font-bold" aria-label="Điều hướng dashboard">
          <p>{hasOwnerWorkspace ? "Quản lý tổ chức" : "Không gian làm việc"}</p>
          {hasOwnerWorkspace && <button aria-current={activeTab === "overview" ? "page" : undefined} type="button" onClick={() => selectTab("overview")}><Icon name="building" />Tổng quan</button>}
          <button aria-current={activeTab === "upload" ? "page" : undefined} type="button" onClick={() => selectTab("upload")}><Icon name="upload" />Tải & rà soát</button>
          <button aria-current={activeTab === "contracts" ? "page" : undefined} type="button" onClick={() => selectTab("contracts")}><Icon name="document" />Hợp đồng<small>{data.totalContracts}</small></button>
          {access.administer && <button aria-current={activeTab === "administration" ? "page" : undefined} type="button" onClick={() => selectTab("administration")}><Icon name="team" />Quản trị</button>}
          <p>Hỗ trợ</p>
          {data.role === "user" && <Link href="/chon-to-chuc"><Icon name="building" />Tạo tổ chức</Link>}
          <Link href="/bao-cao-mau"><Icon name="search" />Báo cáo mẫu</Link><Link href="/goi-dich-vu"><Icon name="sparkle" />Gói dịch vụ</Link>
        </nav>
        <div className="grid grid-cols-[38px_minmax(0,1fr)] items-center gap-2.5 [border-top:1px_solid_var(--line)] mt-auto pt-[17px] pb-0 px-[7px] [&>_span]:w-9 [&>_span]:h-9 [&>_span]:grid [&>_span]:place-items-center [&>_span]:text-[white] [&>_span]:[background:#1b3154] [&>_span]:text-[length:10px] [&>_span]:font-extrabold [&>_span]:rounded-[9px] [&_strong]:block [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_small]:block [&_small]:overflow-hidden [&_small]:text-ellipsis [&_small]:whitespace-nowrap [&_strong]:text-[length:11px] [&_small]:text-[color:var(--muted)] [&_small]:text-[length:9px] [&_small]:mt-0.5"><span>{profileInitials}</span><div><strong>{data.user?.name ?? "Tài khoản LawScan"}</strong><small>{roleLabel}</small></div><button className="col-span-full min-h-[38px] flex items-center justify-center gap-2 text-[#627086] border border-[color:var(--line)] [background:white] [font-family:inherit] cursor-pointer mt-[7px] rounded-lg border-solid hover:text-[#a6374b] hover:[background:#fff8f8] hover:border-[#eac5cc] disabled:opacity-60 [font-size:10px] [font-weight:650] [&_svg]:w-[15px] [&_svg]:[transform:rotate(180deg)]" type="button" onClick={logout} disabled={isLoggingOut}><Icon name="arrow" />{isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</button></div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="min-h-[68px] flex items-center justify-between gap-5 [border-bottom:1px_solid_var(--line)] [background:rgb(255_255_255_/_0.94)] px-[clamp(24px,4vw,52px)] py-[13px] [&>_p]:flex [&>_p]:items-center [&>_p]:gap-2.5 [&>_p]:text-[color:var(--muted)] [&>_p]:text-[length:11px] [&>_p_i]:text-[#bdc5d0] [&>_p_i]:not-italic [&>_p_strong]:text-[color:var(--ink)] [@media_(max-width:_820px)]:min-h-[62px] [@media_(max-width:_820px)]:[padding-inline:18px] [&>_p]:[@media_(max-width:_820px)]:hidden"><div className="hidden [@media_(max-width:_820px)]:flex [@media_(max-width:_820px)]:items-center [@media_(max-width:_820px)]:gap-2 [&_.brand-image]:[@media_(max-width:_820px)]:w-[33px] [&_.brand-image]:[@media_(max-width:_820px)]:h-[33px] [&_strong]:[@media_(max-width:_820px)]:text-[length:15px]"><Brand markOnly /><strong>LawScan</strong></div><p><span>{data.organization.name}</span><i>/</i><strong>{activeTab === "overview" ? "Tổng quan" : activeTab === "upload" ? "Tải & rà soát" : activeTab === "contracts" ? "Hợp đồng" : "Quản trị"}</strong></p><div className="flex items-center gap-[13px]"><span className="min-h-[30px] inline-flex items-center gap-[7px] text-[#345981] border [background:#f6f9fc] text-[length:10px] font-[650] px-2.5 py-0 rounded-[20px] border-solid border-[#d9e4f0] [&_svg]:w-3.5 [@media_(max-width:_820px)]:hidden"><Icon name="shield" />{roleLabel}</span><span className="w-9 h-9 grid place-items-center text-[white] [background:#1b3154] text-[length:10px] font-extrabold rounded-[9px] w-[34px] h-[34px] [@media_(max-width:_820px)]:hidden">{profileInitials}</span><button className="hidden [@media_(max-width:_820px)]:w-[35px] [@media_(max-width:_820px)]:h-[35px] [@media_(max-width:_820px)]:grid [@media_(max-width:_820px)]:place-items-center [@media_(max-width:_820px)]:text-[#607087] [@media_(max-width:_820px)]:border [@media_(max-width:_820px)]:border-[color:var(--line)] [@media_(max-width:_820px)]:[background:white] [@media_(max-width:_820px)]:rounded-[9px] [@media_(max-width:_820px)]:border-solid [&_svg]:[@media_(max-width:_820px)]:w-[15px] [&_svg]:[@media_(max-width:_820px)]:[transform:rotate(180deg)]" type="button" onClick={logout} disabled={isLoggingOut} aria-label="Đăng xuất"><Icon name="arrow" /></button></div></header>
        <nav className="hidden [@media_(max-width:_820px)]:flex [@media_(max-width:_820px)]:gap-[5px] [@media_(max-width:_820px)]:overflow-x-auto [@media_(max-width:_820px)]:[border-bottom:1px_solid_var(--line)] [@media_(max-width:_820px)]:[background:white] [@media_(max-width:_820px)]:px-[18px] [@media_(max-width:_820px)]:py-2 [&_:is(a,_button)]:[@media_(max-width:_820px)]:min-h-[34px] [&_:is(a,_button)]:[@media_(max-width:_820px)]:inline-flex [&_:is(a,_button)]:[@media_(max-width:_820px)]:items-center [&_:is(a,_button)]:[@media_(max-width:_820px)]:gap-[7px] [&_:is(a,_button)]:[@media_(max-width:_820px)]:flex-none [&_:is(a,_button)]:[@media_(max-width:_820px)]:text-[#66758b] [&_:is(a,_button)]:[@media_(max-width:_820px)]:[background:transparent] [&_:is(a,_button)]:[@media_(max-width:_820px)]:[font:inherit] [&_:is(a,_button)]:[@media_(max-width:_820px)]:px-2.5 [&_:is(a,_button)]:[@media_(max-width:_820px)]:py-0 [&_:is(a,_button)]:[@media_(max-width:_820px)]:rounded-lg [&_:is(a,_button)]:[@media_(max-width:_820px)]:border-0 [&_:is(a,_button)]:[@media_(max-width:_820px)]:border-none [&_:is(a,_button)]:[@media_(max-width:_820px)]:border-current [&_:is(a,_button)]:[@media_(max-width:_820px)]:aria-[current=page]:text-[color:var(--accent)] [&_:is(a,_button)]:[@media_(max-width:_820px)]:aria-[current=page]:[background:#eaf1ff] [&_svg]:[@media_(max-width:_820px)]:w-[15px] [@media_(max-width:_820px)]:[&_:is(a,_button)]:[font-size:10px] [@media_(max-width:_820px)]:[&_:is(a,_button)]:[font-weight:650]" aria-label="Điều hướng dashboard trên điện thoại">{hasOwnerWorkspace && <button type="button" aria-current={activeTab === "overview" ? "page" : undefined} onClick={() => selectTab("overview")}><Icon name="building" />Tổng quan</button>}<button type="button" aria-current={activeTab === "upload" ? "page" : undefined} onClick={() => selectTab("upload")}><Icon name="upload" />Tải & rà soát</button><button type="button" aria-current={activeTab === "contracts" ? "page" : undefined} onClick={() => selectTab("contracts")}><Icon name="document" />Hợp đồng</button>{data.role === "user" && <Link href="/chon-to-chuc"><Icon name="building" />Tạo tổ chức</Link>}</nav>
        <main id="dashboard-content" className="w-[min(1420px,100%)] [margin-inline:auto] pt-[38px] pb-16 px-[clamp(24px,4vw,52px)] [@media_(max-width:_820px)]:pt-[30px] [@media_(max-width:_820px)]:pb-12 [@media_(max-width:_820px)]:px-[18px]">
          {activeTab === "overview" && hasOwnerWorkspace && <OwnerOverview data={data} onUpload={() => selectTab("upload")} onViewContracts={() => selectTab("contracts")} onReview={reviewExisting} isReviewing={stage === "reviewing" || getContractReviewMutation.isPending} />}
          {activeTab === "upload" && <>
            <section className="flex [align-items:end] justify-between gap-7 [&_h1]:text-[length:clamp(30px,3vw,42px)] [&_h1]:leading-[1.12] [&_h1]:tracking-[-1.5px] [&_h1]:mt-[7px] [&_h1]:mb-0 [&_h1]:mx-0 [&_div_>_p]:last:max-w-[660px] [&_div_>_p]:last:text-[color:var(--muted)] [&_div_>_p]:last:text-[length:13px] [&_div_>_p]:last:leading-[1.6] [&_div_>_p]:last:mt-[9px] [&_div_>_p]:last:mb-0 [&_div_>_p]:last:mx-0 [@media_(max-width:_580px)]:items-start [@media_(max-width:_580px)]:flex-col [&_h1]:[@media_(max-width:_580px)]:text-[length:31px]"><div><p className="text-[color:var(--accent)] text-[length:10px] font-[780] tracking-[1.1px] uppercase m-0">{data.role === "user" ? "Dashboard của tôi" : "AI Contract Review"}</p><h1>Rà soát hợp đồng mới</h1><p>Tải hợp đồng lên để AI tóm tắt, nhận diện điều khoản rủi ro và đề xuất hướng chỉnh sửa.</p></div><div className="flex items-center gap-2.5 flex-none text-[#2b5c51] border [background:#f3faf8] px-[13px] py-2.5 rounded-[10px] border-solid border-[#d7e9e4] [&>_svg]:w-5 [&_span_>_*]:block [&_strong]:text-[length:10px] [&_small]:text-[#6b817c] [&_small]:text-[length:9px] [&_small]:mt-0.5 [@media_(max-width:_580px)]:w-full"><Icon name="shield" /><span><strong>Dữ liệu riêng tư</strong><small>{data.role === "user" ? "Hợp đồng thuộc không gian cá nhân của bạn" : "Chỉ thành viên có quyền mới truy cập được"}</small></span></div></section>
            <section className="grid grid-cols-[minmax(0,1.65fr)_minmax(250px,0.58fr)] gap-5 [align-items:start] mt-7 [@media_(max-width:_1100px)]:grid-cols-[1fr] [@media_(max-width:_580px)]:mt-5">
              <div className="border border-[color:var(--line)] [background:white] shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)] rounded-[14px] border-solid">
                <header className="min-h-[74px] flex items-center justify-between gap-[18px] [border-bottom:1px_solid_var(--line)] px-5 py-4 [&>_div]:flex [&>_div]:items-center [&>_div]:gap-3 [&>_div_>_span]:w-8 [&>_div_>_span]:h-8 [&>_div_>_span]:grid [&>_div_>_span]:place-items-center [&>_div_>_span]:text-[color:var(--accent)] [&>_div_>_span]:[background:#eaf1ff] [&>_div_>_span]:text-[length:10px] [&>_div_>_span]:font-extrabold [&>_div_>_span]:rounded-[9px] [&_h2]:text-[length:14px] [&_h2]:m-0 [&_p]:text-[color:var(--muted)] [&_p]:text-[length:10px] [&_p]:mt-[3px] [&_p]:mb-0 [&_p]:mx-0 [@media_(max-width:_580px)]:items-start"><div><span>01</span><div><h2>Tải hợp đồng</h2><p>PDF, DOCX, PNG hoặc JPG · Tối đa 20 MB</p></div></div><span className="text-[#356556] [background:#eaf6f1] text-[length:9px] font-bold whitespace-nowrap px-2 py-[5px] rounded-md [@media_(max-width:_580px)]:hidden">{access.upload ? "Được phép tải lên" : "Chỉ xem"}</span></header>
                {access.upload ? <ContractUploadForm file={file} title={title} contractType={contractType} typeLabels={typeLabels} isUploading={stage === "uploading"} onFileChange={selectFile} onTitleChange={setTitle} onContractTypeChange={setContractType} onSubmit={submitContract} /> : <div className="min-h-[310px] flex items-center justify-center gap-3.5 text-left p-[30px] [&>_span]:w-12 [&>_span]:h-12 [&>_span]:grid [&>_span]:place-items-center [&>_span]:text-[#6b7890] [&>_span]:[background:#eff2f6] [&>_span]:rounded-xl [&_svg]:w-[22px] [&_h3]:text-[length:14px] [&_h3]:m-0 [&_p]:max-w-[420px] [&_p]:text-[color:var(--muted)] [&_p]:text-[length:11px] [&_p]:leading-normal [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:mx-0"><span><Icon name="lock" /></span><div><h3>Vai trò của bạn không có quyền tải lên</h3><p>{access.review ? "Bạn vẫn có thể rà soát các hợp đồng đã được đội ngũ tải lên." : "Liên hệ quản trị viên để được cấp quyền phù hợp."}</p></div></div>}
                {pendingReviewId && <div className="flex items-center justify-between gap-3 [border-top:1px_solid_#f3dcc7] [background:#fff9f1] px-5 py-3 [&_p]:text-[#815b2d] [&_p]:text-[length:10px] [&_p]:m-0 [&_button]:min-h-[30px] [&_button]:inline-flex [&_button]:items-center [&_button]:gap-1.5 [&_button]:text-[#8d5e24] [&_button]:border [&_button]:[background:white] [&_button]:[font:inherit] [&_button]:cursor-pointer [&_button]:whitespace-nowrap [&_button]:rounded-[7px] [&_button]:border-solid [&_button]:border-[#e8ca9f] [&_button]:[font-size:9px] [&_button]:[font-weight:700] [&_button_svg]:w-[13px]"><p>Hợp đồng đã được lưu. AI chưa hoàn tất lượt rà soát này.</p><button type="button" onClick={retryReview} disabled={stage === "reviewing"}>Thử rà soát lại <Icon name="arrow" /></button></div>}
              </div>
              <aside className="border border-[color:var(--line)] [background:white] shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)] rounded-[14px] border-solid p-[19px] [@media_(max-width:_1100px)]:grid [@media_(max-width:_1100px)]:grid-cols-[0.6fr_1fr_0.7fr] [@media_(max-width:_1100px)]:gap-5 [@media_(max-width:_1100px)]:[align-items:start] [@media_(max-width:_820px)]:grid-cols-[1fr]"><div className="[&_h2]:text-[length:14px] [&_h2]:m-0 [&_p]:text-[color:var(--muted)] [&_p]:text-[length:10px] [&_p]:mt-[3px] [&_p]:mb-0 [&_p]:mx-0 grid grid-cols-[40px_minmax(0,1fr)] items-center gap-[11px] [&>_span]:w-10 [&>_span]:h-10 [&>_span]:grid [&>_span]:place-items-center [&>_span]:text-[color:var(--accent)] [&>_span]:[background:#edf3ff] [&>_span]:rounded-[10px] [&_svg]:w-[19px]"><span><Icon name="sparkle" /></span><div><h2>Quy trình AI</h2><p>Khoảng 1–3 phút</p></div></div><ol className="grid gap-0 [list-style:none] mt-[23px] mb-0 mx-0 p-0 [&_li]:relative [&_li]:grid [&_li]:grid-cols-[30px_minmax(0,1fr)] [&_li]:gap-2.5 [&_li]:min-h-16 [&_li]:text-[#98a2b1] [&_li:not(:last-child)]:before:content-[''] [&_li:not(:last-child)]:before:absolute [&_li:not(:last-child)]:before:w-px [&_li:not(:last-child)]:before:[background:#e1e6ed] [&_li:not(:last-child)]:before:left-3.5 [&_li:not(:last-child)]:before:top-[29px] [&_li:not(:last-child)]:before:bottom-0 [&_li_>_span]:w-[30px] [&_li_>_span]:h-[30px] [&_li_>_span]:grid [&_li_>_span]:place-items-center [&_li_>_span]:border [&_li_>_span]:[background:white] [&_li_>_span]:rounded-[50%] [&_li_>_span]:border-solid [&_li_>_span]:border-[#dde3eb] [&_svg]:w-[13px] [&_strong]:block [&_small]:block [&_strong]:text-[length:10px] [&_strong]:mt-0.5 [&_small]:text-[length:9px] [&_small]:mt-[3px] [&_i]:w-3 [&_i]:h-3 [&_i]:[animation:spin_0.8s_linear_infinite] [&_i]:rounded-[50%] [&_i]:border-t-[#245abf] [&_i]:border-2 [&_i]:border-solid [&_i]:border-[#8faee9] [@media_(max-width:_1100px)]:mt-0 [&_i]:motion-reduce:animate-none"><li className={stage !== "idle" ? "text-[#245abf] [&>_span]:[background:#eaf1ff] [&>_span]:border-[#b9cef6]" : ""}><span>{stage === "uploading" ? <i /> : <Icon name="check" />}</span><div><strong>Đọc tài liệu</strong><small>Trích xuất nội dung hợp đồng</small></div></li><li className={stage === "reviewing" || stage === "done" ? "text-[#245abf] [&>_span]:[background:#eaf1ff] [&>_span]:border-[#b9cef6]" : ""}><span>{stage === "reviewing" ? <i /> : <Icon name="sparkle" />}</span><div><strong>Phân tích điều khoản</strong><small>Đối chiếu dữ liệu pháp lý</small></div></li><li className={stage === "done" ? "text-[#245abf] [&>_span]:[background:#eaf1ff] [&>_span]:border-[#b9cef6]" : ""}><span><Icon name="shield" /></span><div><strong>Tổng hợp rủi ro</strong><small>Giải thích và đề xuất chỉnh sửa</small></div></li></ol><div className="[background:#f6f8fb] mt-2 p-3.5 rounded-[10px] [&>_span]:text-[color:var(--muted)] [&>_span]:text-[length:9px] [&>_span]:uppercase [&>_span]:tracking-[0.6px] [&>_strong]:block [&>_strong]:text-[length:11px] [&>_strong]:mt-1 [&_ul]:grid [&_ul]:gap-1.5 [&_ul]:[list-style:none] [&_ul]:mt-[11px] [&_ul]:mb-0 [&_ul]:mx-0 [&_ul]:p-0 [&_li]:relative [&_li]:text-[#9aa3b0] [&_li]:text-[length:9px] [&_li]:pl-[17px] [&_li]:before:content-['×'] [&_li]:before:absolute [&_li]:before:font-extrabold [&_li]:before:left-0 [@media_(max-width:_1100px)]:mt-0"><span>Quyền hiện tại</span><strong>{roleLabel}</strong><ul><li className={access.upload ? "text-[#3e675d] before:content-['✓'] before:text-[#24806a]" : ""}>Tải hợp đồng</li><li className={access.review ? "text-[#3e675d] before:content-['✓'] before:text-[#24806a]" : ""}>Chạy AI review</li>{access.administer && <li className="text-[#3e675d] before:content-['✓'] before:text-[#24806a]">Quản trị tổ chức</li>}</ul></div></aside>
            </section>
            {reviewResult && <div ref={reviewResultRef}><ReviewResults result={reviewResult} canAsk={data.role !== "user"} /></div>}
            <RecentContracts contracts={data.contracts.slice(0, 5)} canReview={access.review} onReview={reviewExisting} isReviewing={stage === "reviewing" || getContractReviewMutation.isPending} onViewAll={() => selectTab("contracts")} />
          </>}
          {activeTab === "contracts" && <ContractsView contracts={data.contracts} canReview={access.review} onReview={reviewExisting} isReviewing={stage === "reviewing" || getContractReviewMutation.isPending} />}
          {activeTab === "administration" && access.administer && <AdministrationView organization={data.organization} roleLabel={roleLabel} />}
        </main>
      </div>
      {uploadedContract && <AnalysisFocusDialog key={uploadedContract.id} contractTitle={uploadedContract.title} isReviewing={stage === "reviewing"} onSkip={skipUploadedReview} onReview={reviewUploadedContract} />}
    </div>
  );
}

function OwnerOverview({ data, onUpload, onViewContracts, onReview, isReviewing }: { data: DashboardData; onUpload: () => void; onViewContracts: () => void; onReview: (contract: DashboardContract, rerun?: boolean) => void; isReviewing: boolean }) {
  return <>
    <section className="flex [align-items:end] justify-between gap-7 [&_h1]:text-[length:clamp(30px,3vw,42px)] [&_h1]:leading-[1.12] [&_h1]:tracking-[-1.5px] [&_h1]:mt-[7px] [&_h1]:mb-0 [&_h1]:mx-0 [&_div_>_p]:last:max-w-[660px] [&_div_>_p]:last:text-[color:var(--muted)] [&_div_>_p]:last:text-[length:13px] [&_div_>_p]:last:leading-[1.6] [&_div_>_p]:last:mt-[9px] [&_div_>_p]:last:mb-0 [&_div_>_p]:last:mx-0 [@media_(max-width:_580px)]:items-start [@media_(max-width:_580px)]:flex-col [&_h1]:[@media_(max-width:_580px)]:text-[length:31px]"><div><p className="text-[color:var(--accent)] text-[length:10px] font-[780] tracking-[1.1px] uppercase m-0">Dashboard owner</p><h1>Tổng quan tổ chức</h1><p>Theo dõi hợp đồng, tình trạng rà soát và những rủi ro cần ưu tiên xử lý.</p></div><button className="min-h-[42px] inline-flex items-center gap-3 flex-none text-[white] [background:var(--accent)] text-[length:10px] font-bold px-[15px] py-0 rounded-[9px] hover:[background:var(--accent-dark)] [&_svg]:w-[15px] [@media_(max-width:_580px)]:w-full [@media_(max-width:_580px)]:justify-between" type="button" onClick={onUpload}>Tải hợp đồng mới <Icon name="arrow" /></button></section>
    <section className="grid grid-cols-4 overflow-hidden border border-[color:var(--line)] [background:white] mt-7 rounded-[14px] border-solid [&_article]:[border-right:1px_solid_var(--line)] [&_article]:px-[21px] [&_article]:py-5 [&_article]:last:[border-right:0] [&:is(span,_small)]:block [&:is(span,_small)]:text-[color:var(--muted)] [&:is(span,_small)]:text-[length:10px] [&_strong]:block [&_strong]:text-[length:30px] [&_strong]:leading-none [&_strong]:[font-variant-numeric:tabular-nums] [&_strong]:mt-[7px] [&_strong]:mb-[5px] [&_strong]:mx-0 [&_article:nth-child(3)_strong]:text-[#aa3449] [@media_(max-width:_820px)]:grid-cols-[1fr_1fr] [&_article:nth-child(2)]:[@media_(max-width:_820px)]:[border-right:0] [&_article:nth-child(-n+2)]:[@media_(max-width:_820px)]:[border-bottom:1px_solid_var(--line)]" aria-label="Chỉ số hợp đồng"><article><span>Tổng hợp đồng</span><strong>{data.totalContracts}</strong><small>Trong tổ chức</small></article><article><span>Đang xử lý</span><strong>{data.stats.processing}</strong><small>Cần theo dõi</small></article><article><span>Rủi ro cao</span><strong>{data.stats.highRisk}</strong><small>Cần ưu tiên xem</small></article><article><span>Đã rà soát</span><strong>{data.stats.reviewed}</strong><small>Sẵn sàng quyết định</small></article></section>
    <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(260px,0.7fr)] gap-5 [align-items:start] [@media_(max-width:_1100px)]:grid-cols-[1fr]">
      <section className="border border-[color:var(--line)] [background:white] shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)] rounded-[14px] border-solid min-w-0 overflow-hidden mt-5"><header className="flex items-center justify-between gap-5 [border-bottom:1px_solid_var(--line)] px-[21px] py-[18px] [&_h2]:text-[length:14px] [&_h2]:m-0 [&_p]:text-[color:var(--muted)] [&_p]:text-[length:10px] [&_p]:mt-[3px] [&_p]:mb-0 [&_p]:mx-0 [&>_button]:inline-flex [&>_button]:items-center [&>_button]:gap-[9px] [&>_button]:text-[color:var(--accent)] [&>_button]:[background:transparent] [&>_button]:[font:inherit] [&>_button]:cursor-pointer [&>_button]:border-0 [&>_button]:border-none [&>_button]:border-current [&>_button]:[font-size:10px] [&>_button]:[font-weight:700] [&>_button_svg]:w-3.5 [@media_(max-width:_580px)]:[padding-inline:16px]"><div><h2>Hợp đồng gần đây</h2><p>Cập nhật mới nhất của tổ chức.</p></div>{data.contracts.length > 0 && <button type="button" onClick={onViewContracts}>Xem tất cả <Icon name="arrow" /></button>}</header><ContractTable contracts={data.contracts.slice(0, 5)} canReview onReview={onReview} isReviewing={isReviewing} /></section>
      <aside className="grid gap-4 mt-5 [&_section]:border [&_section]:border-[color:var(--line)] [&_section]:[background:white] [&_section]:p-5 [&_section]:rounded-[14px] [&_section]:border-solid [&_section_>_span]:w-[38px] [&_section_>_span]:h-[38px] [&_section_>_span]:grid [&_section_>_span]:place-items-center [&_section_>_span]:text-[color:var(--accent)] [&_section_>_span]:[background:#eaf1ff] [&_section_>_span]:rounded-[9px] [&_section_>_span_svg]:w-[18px] [&_h2]:text-[length:14px] [&_h2]:mt-3.5 [&_h2]:mb-0 [&_h2]:mx-0 [&_p]:text-[color:var(--muted)] [&_p]:text-[length:10px] [&_p]:leading-normal [&_p]:mt-1 [&_p]:mb-0 [&_p]:mx-0 [&_dl]:grid [&_dl]:gap-2.5 [&_dl]:[border-top:1px_solid_var(--line)] [&_dl]:mt-4 [&_dl]:mb-0 [&_dl]:mx-0 [&_dl]:pt-3.5 [&_dl_>_div]:grid [&_dl_>_div]:grid-cols-[88px_minmax(0,1fr)] [&_dl_>_div]:gap-2 [&_dl_>_div]:text-[length:9px] [&_dt]:text-[color:var(--muted)] [&_dd]:font-[650] [&_dd]:[overflow-wrap:anywhere] [&_dd]:m-0 [&_a]:inline-flex [&_a]:items-center [&_a]:gap-2 [&_a]:text-[color:var(--accent)] [&_a]:text-[length:10px] [&_a]:font-bold [&_a]:mt-3.5 [&_a_svg]:w-3.5 [@media_(max-width:_1100px)]:grid-cols-[1fr_1fr] [@media_(max-width:_1100px)]:mt-0 [@media_(max-width:_820px)]:grid-cols-[1fr]"><section><span><Icon name="building" /></span><h2>{data.organization.name}</h2><p>Thông tin tổ chức</p><dl><div><dt>Mã số thuế</dt><dd>{data.organization.taxCode ?? "Chưa cập nhật"}</dd></div><div><dt>Địa chỉ</dt><dd>{data.organization.address ?? "Chưa cập nhật"}</dd></div><div><dt>Vai trò</dt><dd>{roleLabels[data.role] ?? data.role}</dd></div></dl></section><section><span><Icon name="team" /></span><h2>Quản trị thành viên</h2><p>Quản lý thông tin và quyền truy cập của tổ chức trong cùng không gian làm việc.</p><button type="button" onClick={() => undefined} disabled>Sắp ra mắt</button></section></aside>
    </div>
  </>;
}


function RecentContracts({ contracts, canReview, onReview, isReviewing, onViewAll }: { contracts: DashboardContract[]; canReview: boolean; onReview: (contract: DashboardContract, rerun?: boolean) => void; isReviewing: boolean; onViewAll: () => void }) {
  return <section className="border border-[color:var(--line)] [background:white] shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)] rounded-[14px] border-solid min-w-0 overflow-hidden mt-5"><header className="flex items-center justify-between gap-5 [border-bottom:1px_solid_var(--line)] px-[21px] py-[18px] [&_h2]:text-[length:14px] [&_h2]:m-0 [&_p]:text-[color:var(--muted)] [&_p]:text-[length:10px] [&_p]:mt-[3px] [&_p]:mb-0 [&_p]:mx-0 [&>_button]:inline-flex [&>_button]:items-center [&>_button]:gap-[9px] [&>_button]:text-[color:var(--accent)] [&>_button]:[background:transparent] [&>_button]:[font:inherit] [&>_button]:cursor-pointer [&>_button]:border-0 [&>_button]:border-none [&>_button]:border-current [&>_button]:[font-size:10px] [&>_button]:[font-weight:700] [&>_button_svg]:w-3.5 [@media_(max-width:_580px)]:[padding-inline:16px]"><div><h2>Hợp đồng gần đây</h2><p>Tiếp tục công việc đang dở hoặc xem lại kết quả.</p></div><button type="button" onClick={onViewAll}>Xem tất cả <Icon name="arrow" /></button></header><ContractTable contracts={contracts} canReview={canReview} onReview={onReview} isReviewing={isReviewing} /></section>;
}

function ContractsView({ contracts, canReview, onReview, isReviewing }: { contracts: DashboardContract[]; canReview: boolean; onReview: (contract: DashboardContract, rerun?: boolean) => void; isReviewing: boolean }) {
  return <><section className="flex [align-items:end] justify-between gap-7 [&_h1]:text-[length:clamp(30px,3vw,42px)] [&_h1]:leading-[1.12] [&_h1]:tracking-[-1.5px] [&_h1]:mt-[7px] [&_h1]:mb-0 [&_h1]:mx-0 [&_div_>_p]:last:max-w-[660px] [&_div_>_p]:last:text-[color:var(--muted)] [&_div_>_p]:last:text-[length:13px] [&_div_>_p]:last:leading-[1.6] [&_div_>_p]:last:mt-[9px] [&_div_>_p]:last:mb-0 [&_div_>_p]:last:mx-0 [@media_(max-width:_580px)]:items-start [@media_(max-width:_580px)]:flex-col [&_h1]:[@media_(max-width:_580px)]:text-[length:31px]"><div><p className="text-[color:var(--accent)] text-[length:10px] font-[780] tracking-[1.1px] uppercase m-0">Kho tài liệu</p><h1>Hợp đồng gần đây</h1><p>Theo dõi trạng thái xử lý và mức rủi ro của những hợp đồng mới nhất.</p></div></section><section className={`${"border border-[color:var(--line)] [background:white] shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)] rounded-[14px] border-solid min-w-0 overflow-hidden mt-5"} ${"mt-7"}`}><header className="flex items-center justify-between gap-5 [border-bottom:1px_solid_var(--line)] px-[21px] py-[18px] [&_h2]:text-[length:14px] [&_h2]:m-0 [&_p]:text-[color:var(--muted)] [&_p]:text-[length:10px] [&_p]:mt-[3px] [&_p]:mb-0 [&_p]:mx-0 [&>_button]:inline-flex [&>_button]:items-center [&>_button]:gap-[9px] [&>_button]:text-[color:var(--accent)] [&>_button]:[background:transparent] [&>_button]:[font:inherit] [&>_button]:cursor-pointer [&>_button]:border-0 [&>_button]:border-none [&>_button]:border-current [&>_button]:[font-size:10px] [&>_button]:[font-weight:700] [&>_button_svg]:w-3.5 [@media_(max-width:_580px)]:[padding-inline:16px]"><div><h2>Danh sách hợp đồng</h2><p>{contracts.length} tài liệu gần nhất</p></div></header><ContractTable contracts={contracts} canReview={canReview} onReview={onReview} isReviewing={isReviewing} /></section></>;
}

function ContractTable({ contracts, canReview, onReview, isReviewing }: { contracts: DashboardContract[]; canReview: boolean; onReview: (contract: DashboardContract, rerun?: boolean) => void; isReviewing: boolean }) {
  if (!contracts.length) return <div className="[&_a]:inline-flex [&_a]:items-center [&_a]:gap-2 [&_a]:text-[color:var(--accent)] [&_a]:text-[length:10px] [&_a]:font-bold [&_a]:mt-3.5 [&_a_svg]:w-3.5 min-h-[220px] flex flex-col items-center justify-center text-center p-[35px] [&>_span]:w-12 [&>_span]:h-12 [&>_span]:grid [&>_span]:place-items-center [&>_span]:text-[color:var(--accent)] [&>_span]:[background:#eaf1ff] [&>_span]:rounded-xl [&_svg]:w-[22px] [&_h3]:text-[length:14px] [&_h3]:mt-[13px] [&_h3]:mb-0 [&_h3]:mx-0 [&_p]:text-[color:var(--muted)] [&_p]:text-[length:10px] [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:mx-0"><span><Icon name="document" /></span><h3>Chưa có hợp đồng</h3><p>Hợp đồng đầu tiên bạn tải lên sẽ xuất hiện tại đây.</p></div>;
  return <div className="overflow-x-auto [&_table]:w-full [&_table]:min-w-[760px] [&_table]:border-collapse [&_th]:text-[#8490a2] [&_th]:[background:#f8f9fb] [&_th]:text-[length:8px] [&_th]:font-[750] [&_th]:tracking-[0.5px] [&_th]:text-left [&_th]:uppercase [&_th]:px-4 [&_th]:py-2.5 [&_td]:text-[#5e6d82] [&_td]:[border-top:1px_solid_#edf0f4] [&_td]:text-[length:10px] [&_td]:px-4 [&_td]:py-3.5 [&_td]:first:min-w-[230px] [&_td]:first:flex [&_td]:first:items-center [&_td]:first:gap-2.5 [&_tbody_tr]:hover:[background:#fbfcfe] [&_td_strong]:block [&_td_small]:block [&_td_strong]:max-w-[280px] [&_td_strong]:overflow-hidden [&_td_strong]:text-[#263750] [&_td_strong]:text-[length:10px] [&_td_strong]:text-ellipsis [&_td_strong]:whitespace-nowrap [&_td_small]:text-[#8b96a6] [&_td_small]:text-[length:8px] [&_td_small]:mt-[3px] [&_table]:[@media_(max-width:_580px)]:min-w-[720px]"><table><thead><tr><th>Hợp đồng</th><th>Trạng thái</th><th>Rủi ro</th><th>Cập nhật</th><th aria-label="Hành động" /></tr></thead><tbody>{contracts.map((contract) => <tr key={contract.id ?? contract._id ?? contract.title}><td><span className="w-[34px] h-[34px] grid place-items-center flex-none text-[color:var(--accent)] [background:#eaf1ff] rounded-lg [&_svg]:w-4"><Icon name="document" /></span><div><strong>{contract.title}</strong><small>{typeLabels[contract.type]}</small></div></td><td><span className={`${"inline-flex min-h-[23px] items-center text-[length:8px] font-bold whitespace-nowrap px-[7px] py-0 rounded-[5px]"} ${statusClasses[contract.status]}`}>{statusLabels[contract.status]}</span></td><td><span className={`${"inline-flex min-h-[23px] items-center text-[length:8px] font-bold whitespace-nowrap px-[7px] py-0 rounded-[5px]"} ${riskClasses[contract.overallRiskLevel]}`}>{riskLabels[contract.overallRiskLevel]}</span></td><td><time dateTime={contract.updatedAt}>{formatDate(contract.updatedAt)}</time></td><td>{canReview && <><button className="min-h-[30px] inline-flex items-center gap-1.5 text-[#2256b6] border [background:#f4f8ff] [font:inherit] cursor-pointer whitespace-nowrap px-[9px] py-0 rounded-[7px] border-solid border-[#d1def5] hover:[background:#e9f1ff] disabled:opacity-50 [font-size:9px] [font-weight:700] [&_svg]:w-[13px]" type="button" onClick={() => onReview(contract)} disabled={isReviewing}><Icon name={contract.status === "reviewed" ? "document" : "sparkle"} />{contract.status === "reviewed" ? "Xem kết quả" : "AI review"}</button>{contract.status === "reviewed" && <button className="min-h-[30px] inline-flex items-center gap-1.5 text-[#2256b6] border [background:#f4f8ff] [font:inherit] cursor-pointer whitespace-nowrap px-[9px] py-0 rounded-[7px] border-solid border-[#d1def5] hover:[background:#e9f1ff] disabled:opacity-50 [font-size:9px] [font-weight:700] [&_svg]:w-[13px]" type="button" onClick={() => onReview(contract, true)} disabled={isReviewing}><Icon name="sparkle" />Rà soát lại</button>}</>}</td></tr>)}</tbody></table></div>;
}

function AdministrationView({ organization, roleLabel }: { organization: { name: string; taxCode: string | null; address: string | null }; roleLabel: string }) {
  return <><section className="flex [align-items:end] justify-between gap-7 [&_h1]:text-[length:clamp(30px,3vw,42px)] [&_h1]:leading-[1.12] [&_h1]:tracking-[-1.5px] [&_h1]:mt-[7px] [&_h1]:mb-0 [&_h1]:mx-0 [&_div_>_p]:last:max-w-[660px] [&_div_>_p]:last:text-[color:var(--muted)] [&_div_>_p]:last:text-[length:13px] [&_div_>_p]:last:leading-[1.6] [&_div_>_p]:last:mt-[9px] [&_div_>_p]:last:mb-0 [&_div_>_p]:last:mx-0 [@media_(max-width:_580px)]:items-start [@media_(max-width:_580px)]:flex-col [&_h1]:[@media_(max-width:_580px)]:text-[length:31px]"><div><p className="text-[color:var(--accent)] text-[length:10px] font-[780] tracking-[1.1px] uppercase m-0">Role-based access</p><h1>Quản trị tổ chức</h1><p>Thông tin và công cụ quản trị chỉ hiển thị cho vai trò có quyền.</p></div></section><div className="[&>_section]:border [&>_section]:border-[color:var(--line)] [&>_section]:[background:white] [&>_section]:shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)] [&>_section]:rounded-[14px] [&>_section]:border-solid grid grid-cols-[repeat(3,1fr)] gap-[18px] mt-7 [&>_section]:p-[22px] [&>_section_>_span]:w-[42px] [&>_section_>_span]:h-[42px] [&>_section_>_span]:grid [&>_section_>_span]:place-items-center [&>_section_>_span]:text-[color:var(--accent)] [&>_section_>_span]:[background:#eaf1ff] [&>_section_>_span]:rounded-[10px] [&_svg]:w-5 [&_h2]:text-[length:14px] [&_h2]:mt-[15px] [&_h2]:mb-0 [&_h2]:mx-0 [&_p]:min-h-12 [&_p]:text-[color:var(--muted)] [&_p]:text-[length:10px] [&_p]:leading-[1.55] [&_p]:mt-[7px] [&_p]:mb-0 [&_p]:mx-0 [&_dl]:grid [&_dl]:gap-[9px] [&_dl]:[border-top:1px_solid_var(--line)] [&_dl]:mt-[17px] [&_dl]:mb-0 [&_dl]:mx-0 [&_dl]:pt-3.5 [&_dl_div]:grid [&_dl_div]:grid-cols-[85px_minmax(0,1fr)] [&_dl_div]:gap-2 [&_dl_div]:text-[length:9px] [&_dt]:text-[color:var(--muted)] [&_dd]:font-[650] [&_dd]:[overflow-wrap:anywhere] [&_dd]:m-0 [&_:is(a,_button)]:min-h-[35px] [&_:is(a,_button)]:inline-flex [&_:is(a,_button)]:items-center [&_:is(a,_button)]:gap-[9px] [&_:is(a,_button)]:text-[color:var(--accent)] [&_:is(a,_button)]:border [&_:is(a,_button)]:[background:#f4f8ff] [&_:is(a,_button)]:[font:inherit] [&_:is(a,_button)]:mt-[17px] [&_:is(a,_button)]:px-[11px] [&_:is(a,_button)]:py-0 [&_:is(a,_button)]:rounded-lg [&_:is(a,_button)]:border-solid [&_:is(a,_button)]:border-[#d6e1f4] [&_:is(a,_button)]:[font-size:9px] [&_:is(a,_button)]:[font-weight:700] [&_button]:disabled:text-[#8b94a1] [&_button]:disabled:border-[color:var(--line)] [&_button]:disabled:[background:#f4f5f7] [&_a_svg]:w-3.5 [@media_(max-width:_1100px)]:grid-cols-[1fr_1fr] [@media_(max-width:_820px)]:grid-cols-[1fr]"><section><span><Icon name="building" /></span><h2>{organization.name}</h2><dl><div><dt>Mã số thuế</dt><dd>{organization.taxCode ?? "Chưa cập nhật"}</dd></div><div><dt>Địa chỉ</dt><dd>{organization.address ?? "Chưa cập nhật"}</dd></div><div><dt>Vai trò của bạn</dt><dd>{roleLabel}</dd></div></dl></section><section><span><Icon name="team" /></span><h2>Thành viên & phân quyền</h2><p>Mời thành viên, gán vai trò và kiểm soát phạm vi truy cập của đội ngũ.</p><button type="button" disabled>Sắp ra mắt</button></section><section><span><Icon name="sparkle" /></span><h2>Gói dịch vụ</h2><p>Xem hạn mức AI review và quyền lợi hiện tại của tổ chức.</p><Link href="/goi-dich-vu">Quản lý gói <Icon name="arrow" /></Link></section></div></>;
}
