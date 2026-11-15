"use client";

import Link from "next/link";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVerificationOverview } from "@/hooks/expert-verification/use-verification-overview";
import { verificationDate } from "@/lib/review/verification-display";
import { VerificationWorkList } from "./verification-work-list";
import { VerificationOverviewHero } from "./verification-overview-hero";
import { VerificationOverviewMetrics } from "./verification-overview-metrics";
import { VerificationDistributionChart } from "./verification-distribution-chart";
import { useRestoreVerificationList } from "@/hooks/expert-verification/use-verification-list-navigation";
import { filterVerificationQueue } from "@/lib/review/verification-queue-list";

export function VerificationOverview() {
  const { assigned, waiting, refreshing, updatedAt, refresh } =
    useVerificationOverview();
  useRestoreVerificationList(
    Boolean(assigned.data && waiting.data && !refreshing),
  );
  const [group, setGroup] = useState<"assigned" | "waiting">("assigned");
  const current = group === "assigned" ? assigned : waiting;
  const assignedItems = assigned.data
    ? filterVerificationQueue(assigned.data, "", "", "oldest")
    : undefined;
  const waitingItems = waiting.data
    ? filterVerificationQueue(waiting.data, "", "", "oldest")
    : undefined;
  return (
    <div className="grid gap-[22px] font-sans text-card-foreground max-[650px]:gap-[15px]">
      <VerificationOverviewHero />
      <VerificationOverviewMetrics
        assigned={assigned.data?.length}
        waiting={waiting.data?.length}
        assignedPending={assigned.isPending}
        waitingPending={waiting.isPending}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap gap-2"
          aria-label="Truy cập nhanh công việc"
        >
          <Button asChild variant="outline" size="sm">
            <Link href="/expert-verification?status=in_progress">
              Tôi đang xử lý · {assigned.data?.length ?? "—"}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/expert-verification?status=requested">
              Chờ tiếp nhận · {waiting.data?.length ?? "—"}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/expert-verification/my-work">Công việc của tôi</Link>
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={refreshing}
          onClick={() => {
            void refresh();
          }}
        >
          <RefreshCw
            className={
              refreshing ? "animate-spin motion-reduce:animate-none" : ""
            }
            aria-hidden="true"
          />
          Làm mới
        </Button>
      </div>
      <div className="grid items-start gap-5 min-[1101px]:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <VerificationWorkList
          kind={group}
          title="Tiếp tục công việc"
          description={
            group === "assigned"
              ? "Ưu tiên tiếp tục các yêu cầu bạn đã tiếp nhận."
              : "Xem trước bản đã che trước khi nhận thêm yêu cầu."
          }
          items={group === "assigned" ? assignedItems : waitingItems}
          pending={current.isPending}
          error={current.error}
          refreshing={current.isFetching}
          updatedAt={current.dataUpdatedAt}
          onRetry={() => {
            void current.refetch();
          }}
          controls={
            <div
              role="group"
              aria-label="Nhóm công việc cần xử lý"
              className="flex flex-wrap gap-2"
            >
              <Button
                variant={group === "assigned" ? "secondary" : "outline"}
                size="sm"
                aria-pressed={group === "assigned"}
                onClick={() => setGroup("assigned")}
              >
                Tôi đang xử lý
              </Button>
              <Button
                variant={group === "waiting" ? "secondary" : "outline"}
                size="sm"
                aria-pressed={group === "waiting"}
                onClick={() => setGroup("waiting")}
              >
                Chờ tiếp nhận
              </Button>
            </div>
          }
        />
        <VerificationDistributionChart
          assigned={assigned.data?.length}
          waiting={waiting.data?.length}
          pending={assigned.isPending || waiting.isPending}
          unavailable={assigned.isError || waiting.isError}
          onRetry={() => {
            void refresh();
          }}
        />
      </div>
      <VerificationWorkList
        kind="waiting"
        title="Yêu cầu chờ lâu nhất"
        description="Ưu tiên theo ngày gửi cũ nhất trong danh sách đã tải, tối đa 5 yêu cầu."
        items={waitingItems}
        pending={waiting.isPending}
        error={waiting.error}
        refreshing={waiting.isFetching}
        updatedAt={waiting.dataUpdatedAt}
        onRetry={() => {
          void waiting.refetch();
        }}
      />
      <p className="m-0 text-ui-meta leading-6 text-muted-foreground">
        Số liệu và biểu đồ theo danh sách đã tải, tối đa 100 yêu cầu mỗi nhóm;
        chưa bao gồm yêu cầu đã kết thúc. Tự cập nhật mỗi 15 giây.
        {updatedAt
          ? ` Cập nhật danh sách lúc ${verificationDate(new Date(updatedAt).toISOString())}.`
          : ""}
      </p>
    </div>
  );
}
