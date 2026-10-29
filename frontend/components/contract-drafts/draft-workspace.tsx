"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { contractDraftsApi } from "@/lib/api/contract-drafts";
import {
  draftKeys,
  useDraftCatalog,
  useDraftList,
} from "@/hooks/contract-drafts/use-contract-drafts";
import type { AuthUser } from "@/types/auth";
import type { ContractTemplate } from "@/types/contract-drafts";
import { DraftShell } from "./draft-shell";
import { DraftListRow } from "./draft-list-row";
import { DraftTemplateCard } from "./draft-template-card";

export function DraftWorkspace({ user }: { user: AuthUser }) {
  const router = useRouter();
  const client = useQueryClient();
  const catalog = useDraftCatalog();
  const [page, setPage] = useState(1);
  const [parties, setParties] = useState<Record<string, string>>({});
  const drafts = useDraftList(page);
  const create = useMutation({ mutationFn: contractDraftsApi.create });
  const lock = useRef(false);
  async function start(template: ContractTemplate) {
    if (lock.current) return;
    lock.current = true;
    try {
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
      });
      const draft = await create.mutateAsync({
        templateCode: template.code,
        title: `${template.name} - ${new Date().toLocaleDateString("vi-VN")}`,
        ourParty: parties[template.code] ?? template.parties[0].code,
        editorMode: "studio",
        input: {
          signingDate: today,
          startDate: today,
          ...(template.code === "labor" ? { termType: "fixed" } : {}),
        },
      });
      client.setQueryData(draftKeys.detail(draft.id), draft);
      await client.invalidateQueries({ queryKey: draftKeys.lists });
      router.push(`/contract-drafts/${draft.id}`);
    } catch {
      lock.current = false;
    }
  }
  return (
    <DraftShell
      user={user}
      organizationName={catalog.data?.organization.name}
      blockNavigation={create.isPending}
    >
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            {user.role === "user"
              ? "Soạn thảo cá nhân"
              : "Soạn thảo cho doanh nghiệp"}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Bắt đầu từ mẫu. Hoàn thiện theo cách của bạn.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Mở mẫu và chỉnh ngay trên trang hợp đồng. Trợ lý AI giúp bạn thay
            đổi từng điều khoản bằng chat hoặc giọng nói; bạn quyết định nội
            dung được áp dụng.
          </p>
        </div>
        <Link className="text-sm font-medium text-blue-600" href="/contract">
          Hợp đồng đã lưu →
        </Link>
      </header>
      <div className="mb-8 flex flex-wrap gap-x-8 gap-y-3 rounded-xl border border-blue-100 bg-blue-50/70 px-5 py-4 text-sm text-blue-800">
        {[
          "Mở mẫu có sẵn",
          "Chỉnh trực tiếp hoặc nhờ AI",
          "Hoàn tất & xuất hợp đồng",
        ].map((label, index) => (
          <span key={label} className="inline-flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-white text-xs font-bold">
              {index + 1}
            </span>
            {label}
          </span>
        ))}
      </div>
      <h2 className="mb-4 text-lg font-semibold">Bắt đầu với một mẫu</h2>
      {catalog.isLoading ? (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tải mẫu hợp đồng…
        </p>
      ) : catalog.error ? (
        <div role="alert">
          <p>{catalog.error.message}</p>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => void catalog.refetch()}
          >
            Thử lại
          </Button>
        </div>
      ) : (
        <div className="@container/templates">
          <div
            className={
              catalog.data?.templates.length === 3
                ? "grid gap-4 @min-[640px]/templates:grid-cols-2 @min-[1000px]/templates:grid-cols-3"
                : "grid gap-4 @min-[640px]/templates:grid-cols-2"
            }
          >
            {catalog.data?.templates.map((template) => (
              <DraftTemplateCard
                key={template.code}
                template={template}
                party={parties[template.code] ?? template.parties[0].code}
                pending={create.isPending}
                onPartyChange={(value) =>
                  setParties((current) => ({
                    ...current,
                    [template.code]: value,
                  }))
                }
                onOpen={() => void start(template)}
              />
            ))}
          </div>
        </div>
      )}
      {create.error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {create.error.message}
        </p>
      )}
      <section className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="font-semibold">
              {user.role === "owner"
                ? "Bản nháp trong tổ chức"
                : "Bản nháp của bạn"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {drafts.data?.total ?? 0} bản nháp · tự cập nhật mỗi phút
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void drafts.refetch()}
          >
            Làm mới
          </Button>
        </header>
        {drafts.isLoading ? (
          <p role="status" className="p-8 text-sm text-slate-500">
            Đang tải bản nháp…
          </p>
        ) : drafts.error ? (
          <p role="alert" className="p-8 text-sm text-red-600">
            {drafts.error.message}
          </p>
        ) : !drafts.data?.items.length ? (
          <div className="px-6 py-12 text-center">
            <FileText className="mx-auto mb-3 text-slate-300" size={32} />
            <h3 className="font-medium">Chưa có bản nháp</h3>
            <p className="mt-2 text-sm text-slate-500">
              Chọn một mẫu phía trên để tạo hợp đồng đầu tiên.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {drafts.data.items.map((draft) => (
              <DraftListRow
                key={draft.id}
                draft={draft}
                templateName={
                  catalog.data?.templates.find(
                    (template) => template.code === draft.templateCode,
                  )?.name
                }
                userId={user.id}
                onPinned={() => setPage(1)}
                onDeleted={() => {
                  if (drafts.data?.items.length === 1 && page > 1)
                    setPage(page - 1);
                }}
              />
            ))}
          </ul>
        )}
        {drafts.data && drafts.data.pages > 1 && (
          <footer className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-sm">
            <span>
              Trang {page}/{drafts.data.pages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Trước
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= drafts.data.pages}
                onClick={() => setPage(page + 1)}
              >
                Sau
              </Button>
            </div>
          </footer>
        )}
      </section>
      <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-400">
        <Sparkles size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        Các khung là tài liệu tham khảo cho giao dịch thông thường tại Việt Nam.
        Nội dung AI cần được người có trách nhiệm kiểm tra trước khi sử dụng.
      </p>
    </DraftShell>
  );
}
