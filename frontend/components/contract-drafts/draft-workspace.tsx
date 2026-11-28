"use client";

import { useState, type ReactNode } from "react";
import { CircleHelp, Clock3, FileText, Plus } from "lucide-react";
import { Popover } from "radix-ui";
import { useDraftCatalog } from "@/hooks/contract-drafts/use-contract-drafts";
import { useCreateContractDraft } from "@/hooks/contract-drafts/use-create-contract-draft";
import type { AuthUser } from "@/types/auth";
import { QuotaScopePicker } from "@/components/workspace/quota-scope-picker";
import { DraftShell } from "./draft-shell";
import { DraftHistoryDialog } from "./draft-history-dialog";
import { DraftImportDialog } from "./draft-import-dialog";
import { DraftLibraryDialog } from "./draft-library-dialog";

type Panel = "library" | "import" | "history" | null;

export function DraftWorkspace({ user }: { user: AuthUser }) {
  const catalog = useDraftCatalog();
  const create = useCreateContractDraft();
  const [panel, setPanel] = useState<Panel>(null);
  const templates = catalog.data?.templates ?? [];
  const toggle = (name: Exclude<Panel, null>) => (open: boolean) => setPanel(open ? name : null);

  return (
    <DraftShell
      user={user}
      organizationName={catalog.data?.organization.name}
      blockNavigation={create.isPending}
    >
      <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
        <div className="flex items-center justify-end gap-2">
          <HelpButton />
          <button
            type="button"
            onClick={() => setPanel("history")}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-slate-100/80 px-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200/70 hover:text-slate-900"
          >
            <Clock3 size={16} aria-hidden="true" />
            Lịch sử
          </button>
        </div>
        <h1 className="sr-only">Soạn thảo hợp đồng</h1>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10">
          <div className="w-full max-w-[880px]">
            <QuotaScopePicker kind="drafting" disabled={create.isPending} />
          </div>
          <div className="grid w-full max-w-[880px] gap-6 sm:grid-cols-2">
            <StartCard
              icon={<Plus size={26} strokeWidth={1.6} aria-hidden="true" />}
              title="Tạo mới"
              description="Tạo Hợp đồng, văn bản bằng cách mô tả yêu cầu hoặc tải lên file tham khảo của bạn"
              onClick={() => setPanel("library")}
              footer={
                <button
                  type="button"
                  onClick={() => setPanel("library")}
                  className="relative z-10 mt-4 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline focus-visible:underline focus-visible:outline-none"
                >
                  Kho hợp đồng, văn bản mẫu
                </button>
              }
            />
            <StartCard
              icon={<FileText size={24} strokeWidth={1.6} aria-hidden="true" />}
              title="Chỉnh sửa"
              description="Tải file tài liệu để chỉnh sửa trực tiếp trên hợp đồng mẫu sẵn của bạn."
              onClick={() => setPanel("import")}
            />
          </div>
        </div>
      </div>
      <DraftLibraryDialog
        organizationWide={user.role === "owner"}
        open={panel === "library"}
        onOpenChange={toggle("library")}
        templates={templates}
        loading={catalog.isLoading}
        error={catalog.error}
        onRetry={() => void catalog.refetch()}
        pending={create.isPending}
        createError={create.error}
        onOpenTemplate={(template, party) => void create.start(template, party)}
      />
      <DraftImportDialog open={panel === "import"} onOpenChange={toggle("import")} templates={templates} />
      {panel === "history" && (
        <DraftHistoryDialog open onOpenChange={toggle("history")} user={user} templates={templates} />
      )}
    </DraftShell>
  );
}

function StartCard({
  icon,
  title,
  description,
  footer,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  footer?: ReactNode;
  onClick: () => void;
}) {
  return (
    <div className="group relative flex min-h-[266px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-8 text-center shadow-[0_2px_10px_rgba(15,23,42,0.08)] transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-[0_6px_20px_rgba(15,23,42,0.12)] has-[>button:first-child:focus-visible]:ring-2 has-[>button:first-child:focus-visible]:ring-blue-300">
      <button
        type="button"
        onClick={onClick}
        aria-label={`${title}: ${description}`}
        className="absolute inset-0 rounded-2xl focus-visible:outline-none"
      />
      <span className="grid size-16 place-items-center rounded-full bg-slate-100 text-slate-700 transition-colors group-hover:bg-slate-200/70">
        {icon}
      </span>
      <h2 className="mt-5 text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-3 max-w-[340px] text-sm leading-6 text-slate-600">{description}</p>
      {footer}
    </div>
  );
}

function HelpButton() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Hướng dẫn soạn thảo"
          className="grid size-9 place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <CircleHelp size={19} aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-[90] w-[min(340px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-xl"
        >
          <p className="font-semibold text-slate-900">Bắt đầu soạn thảo</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong className="font-medium text-slate-800">Tạo mới:</strong> chọn một mẫu trong kho, sau đó chỉnh trực tiếp hoặc nhờ trợ lý AI.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Chỉnh sửa:</strong> tải lên hợp đồng Word, PDF có chữ hoặc TXT để chỉnh ngay trên trình soạn thảo.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Lịch sử:</strong> mở lại, ghim hoặc xóa các bản nháp đã tạo.
            </li>
          </ul>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            Các mẫu là tài liệu tham khảo cho giao dịch thông thường tại Việt Nam. Nội dung AI cần được người có trách nhiệm kiểm tra trước khi sử dụng.
          </p>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
