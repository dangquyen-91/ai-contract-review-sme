import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { RecentContractList } from "@/components/contract/recent-contract-list";
import type { DashboardData } from "@/types/dashboard";
import { RoleInsights } from "./role-insights";
import { AccountAllowance } from "./account-allowance";

export function OwnerOverview({
  data,
  onUpload,
  onMembers,
}: {
  data: DashboardData;
  onUpload: () => void;
  onMembers: () => void;
}) {
  const currentMetrics = [
    { label: "Tổng hợp đồng", value: data.totalContracts },
    { label: "Đang xử lý", value: data.stats.processing },
    { label: "Rủi ro cao", value: data.stats.highRisk },
    { label: "Đã rà soát", value: data.stats.reviewed },
  ];
  return (
    <div className="grid min-w-0 gap-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-primary">
            {data.organization.name}
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Tổng quan tổ chức
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Theo dõi hợp đồng, tình trạng rà soát và những rủi ro cần ưu tiên xử
            lý.
          </p>
        </div>
        <Button onClick={onUpload}>
          Tải hợp đồng mới <Icon name="arrow" />
        </Button>
      </header>
      <dl
        className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4"
        aria-label="Chỉ số hợp đồng hiện tại"
      >
        {currentMetrics.map((metric) => (
          <div key={metric.label} className="bg-card px-5 py-5">
            <dt className="text-xs font-medium text-muted-foreground">
              {metric.label}
            </dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
              {metric.value.toLocaleString("vi-VN")}
            </dd>
            <dd className="mt-2 text-xs text-muted-foreground">
              Toàn tổ chức · Hiện tại
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,0.8fr)]">
        <RecentContractList contracts={data.contracts.slice(0, 5)} />
        <aside className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold">Thông tin tổ chức</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Tên tổ chức</dt>
              <dd className="mt-1 break-words font-medium">
                {data.organization.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Mã số thuế</dt>
              <dd className="mt-1 break-words">
                {data.organization.taxCode ?? "Chưa cập nhật"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Địa chỉ</dt>
              <dd className="mt-1 break-words leading-6">
                {data.organization.address ?? "Chưa cập nhật"}
              </dd>
            </div>
          </dl>
          <Button className="mt-5 w-full" variant="outline" onClick={onMembers}>
            Thành viên & lời mời <Icon name="team" />
          </Button>
        </aside>
      </div>
      <RoleInsights role="owner" scopeId={data.organization.id} />
      <AccountAllowance accountId={data.organization.id} />
    </div>
  );
}
