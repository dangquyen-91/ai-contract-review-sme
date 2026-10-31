"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContractTrackingList } from "@/hooks/contracts/use-contract-tracking-list";
import { ContractTrackingCard } from "./contract-tracking-card";
import { ContractTrackingFilters } from "./contract-tracking-filters";
import { ContractTrackingPagination } from "./contract-tracking-pagination";
import { ContractTrackingSkeleton } from "./contract-tracking-skeleton";
import { useContractListReturn } from "@/hooks/contracts/use-contract-list-return";
import { contractListReturnScope } from "@/lib/contracts/contract-list-return";
import type { DashboardContract } from "@/types/contracts";
import type { DashboardWorkspaceContext } from "@/components/layouts/dashboard/dashboard-shell";

type ContractContentProps = DashboardWorkspaceContext & {
  onReview?: (contract: DashboardContract, rerun?: boolean) => void;
  isReviewing?: boolean;
};

export function ContractContent({ data, access, onReview, isReviewing = false }: ContractContentProps) {
  const router = useRouter();
  const scopeId = data.contractScopeId ?? data.organization.id;
  const controller = useContractTrackingList(`${data.role}:${scopeId}`, Boolean(scopeId));
  const { query, highlightId, filtered, dismissUpload } = controller;
  const rememberPosition = useContractListReturn(contractListReturnScope(data), Boolean(query.data && !query.isFetching && data.user?.email), JSON.stringify(controller.state));
  const canDraft = data.role === "user" || Boolean(scopeId) && ["owner", "staff"].includes(data.role);
  const canDelete = ["administrator", "owner", "manager", "staff", "user"].includes(data.role);

  function openReview(contract: DashboardContract, rerun = false) {
    const id = contract.id ?? contract._id;
    if (id && data.user?.email) rememberPosition(id);
    if (onReview) return onReview(contract, rerun);
    if (id) router.push(`/contract/${encodeURIComponent(id)}${rerun ? "?rerun=1" : ""}`);
  }

  return (
    <div className="space-y-6 text-card-foreground">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="m-0 text-ui-caption font-semibold uppercase tracking-wide text-primary">Kho tài liệu</p>
          <h1 className="mb-0 mt-2 text-ui-title font-bold">{data.role === "user" ? "Hợp đồng của tôi" : "Hợp đồng tổ chức"}</h1>
          <p className="mb-0 mt-2 text-ui text-muted-foreground">Theo dõi kết quả AI và trạng thái xác minh chuyên gia của các hợp đồng trong không gian này.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => { void query.refetch(); }}><RefreshCw aria-hidden="true" className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />Làm mới</Button>
          {canDraft && <Button asChild size="sm"><Link href="/contract-drafts"><FileText aria-hidden="true" />Tạo từ mẫu</Link></Button>}
        </div>
      </header>
      <section aria-label="Danh sách hợp đồng" className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
        <ContractTrackingFilters controller={controller} />
        {highlightId && <div role="status" className="m-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-ui text-emerald-950">
          <p className="m-0">Hợp đồng vừa tải lên đã được lưu. Bạn có thể bắt đầu rà soát từ danh sách.</p>
          <Button variant="ghost" size="sm" aria-label="Ẩn thông báo tải lên" onClick={dismissUpload}>Đóng</Button>
        </div>}
        {query.isError && <div role="alert" className="m-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-ui text-amber-950">
          Không thể cập nhật danh sách hợp đồng.{query.data && " Bên dưới là dữ liệu lần tải gần nhất."}
          <Button variant="link" size="sm" onClick={() => { void query.refetch(); }}>Thử lại</Button>
        </div>}
        <div key={`${scopeId}:${controller.state.page}:${controller.state.search}:${controller.state.status}:${controller.state.riskLevel}:${controller.state.verificationStatus}`}
          aria-busy={query.isFetching} className="space-y-4 p-4 sm:p-5">
          {!scopeId ? <p className="py-8 text-center text-ui text-muted-foreground">Chưa có không gian làm việc để tải danh sách hợp đồng.</p>
            : query.isPending ? <ContractTrackingSkeleton />
            : query.data?.items.length ? <div className="space-y-4 animate-in fade-in duration-200 motion-reduce:animate-none">{query.data.items.map((contract) => (
              <ContractTrackingCard key={contract.id ?? contract._id} contract={contract}
                highlighted={(contract.id ?? contract._id) === highlightId} canReview={access.review}
                canDelete={canDelete} isReviewing={isReviewing} onReview={openReview} />
            ))}</div> : !query.isError && <div className="py-8 text-center">
              <FileText aria-hidden="true" className="mx-auto size-9 text-primary" />
              <h2 className="mt-3 text-ui-section font-semibold">{filtered ? "Không có hợp đồng phù hợp" : "Chưa có hợp đồng"}</h2>
              <p className="mt-2 text-ui text-muted-foreground">{filtered ? "Thử thay đổi từ khóa hoặc bộ lọc." : "Hợp đồng bạn tải lên sẽ xuất hiện tại đây."}</p>
              {filtered && <Button variant="outline" size="sm" onClick={() => { void controller.resetFilters(); }}>Xóa bộ lọc</Button>}
            </div>}
        </div>
        <ContractTrackingPagination controller={controller} />
      </section>
    </div>
  );
}
