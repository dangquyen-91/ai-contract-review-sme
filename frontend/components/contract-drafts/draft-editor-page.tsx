"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContractDraft, useDraftCatalog } from "@/hooks/use-contract-drafts";
import { useDraftEditor } from "@/hooks/use-draft-editor";
import type { AuthUser } from "@/types/auth";
import type { ContractDraft, ContractTemplate } from "@/types/contract-drafts";
import { DraftShell } from "./draft-shell";
import { DraftFields } from "./draft-fields";
import { DraftStatusBadge } from "./draft-status";
import { DraftPreview } from "./draft-preview";
import { DraftAiAssistant } from "./draft-ai-assistant";
import { draftSaveStatus } from "@/lib/draft-save-status";
import { DraftApprovalActions } from "./draft-approval-actions";
import { DraftApprovalDialog } from "./draft-approval-dialog";

export function DraftEditorPage({ id, user }: { id: string; user: AuthUser }) {
  const query = useContractDraft(id);
  const catalog = useDraftCatalog();
  const template =
    query.data?.template ??
    catalog.data?.templates.find(
      (item) => item.code === query.data?.templateCode,
    );
  if (!query.data || !template)
    return (
      <DraftShell
        user={user}
        organizationName={catalog.data?.organization.name}
      >
        {query.error || catalog.error ? (
          <div role="alert" className="rounded-2xl border bg-white p-8">
            <p className="text-sm text-red-600">
              {query.error?.message ??
                catalog.error?.message ??
                "Không tìm thấy mẫu hợp đồng."}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                void query.refetch();
                void catalog.refetch();
              }}
            >
              Thử lại
            </Button>
            <Link
              href="/contract-drafts"
              className="ml-4 text-sm text-blue-600"
            >
              Về danh sách
            </Link>
          </div>
        ) : (
          <p role="status" className="py-12 text-sm text-slate-500">
            Đang tải bản nháp…
          </p>
        )}
      </DraftShell>
    );
  return (
    <DraftEditor
      key={id}
      initial={query.data}
      template={template}
      latestVersion={
        catalog.data?.templates.find((item) => item.code === template.code)
          ?.version ?? template.version
      }
      user={user}
    />
  );
}

function DraftEditor({
  initial,
  template,
  latestVersion,
  user,
}: {
  initial: ContractDraft;
  template: ContractTemplate;
  latestVersion: number;
  user: AuthUser;
}) {
  const editor = useDraftEditor(initial);
  const { draft, values, busy, error, dirty } = editor;
  const [step, setStep] = useState<"parties" | "terms" | "preview">(
    initial.content ? "preview" : "parties",
  );
  const [approve, setApprove] = useState(false);
  const canEdit = draft.status === "draft" && (!busy || busy === "save");
  const owner = user.role === "owner";
  const saveStatus = draftSaveStatus(editor);
  return (
    <DraftShell
      user={user}
      organizationName={draft.organization.name}
      blockNavigation={dirty || Boolean(busy)}
    >
      <Link
        href="/contract-drafts"
        className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} />
        Mẫu & bản nháp
      </Link>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="break-words text-2xl font-bold tracking-tight">
              {values.title}
            </h1>
            <DraftStatusBadge status={draft.status} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {template.name} · Khung mẫu v{draft.templateVersion} ·{" "}
            {draft.organization.name}
          </p>
          <p className="mt-2 text-xs text-slate-400" role="status">
            {saveStatus.header}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={Boolean(busy)}
          onClick={() => void editor.reload()}
        >
          <RefreshCw size={15} />
          Tải lại
        </Button>
      </header>
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
        >
          {error}
          <span className="block text-xs">
            Nếu bản nháp đã thay đổi ở nơi khác, chọn Tải lại để lấy phiên bản
            mới nhất.
          </span>
        </div>
      )}
      {latestVersion > draft.templateVersion && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm leading-6 text-blue-900">
            Đã có mẫu v{latestVersion} với form và bố cục mới. Sao chép dữ liệu
            sang bản nháp mới để sử dụng; bản hiện tại được giữ lại.
          </p>
          <Button
            variant="outline"
            disabled={Boolean(busy)}
            loading={busy === "upgrade"}
            onClick={() => void editor.run("upgrade")}
          >
            Dùng mẫu mới
          </Button>
        </div>
      )}
      {draft.decisionNote && (
        <div className="mb-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          <strong>Ghi chú của Owner:</strong> {draft.decisionNote}
        </div>
      )}
      {draft.status === "pending_approval" && !owner && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-700"
        >
          Bản nháp đã được gửi Owner. Bạn có thể xem nội dung; chỉnh sửa sẽ mở
          lại khi Owner yêu cầu.
        </p>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <nav
            aria-label="Các bước soạn hợp đồng"
            className="flex overflow-x-auto border-b border-slate-100 px-3 sm:px-6"
          >
            {(
              [
                { key: "parties", label: "Các bên" },
                { key: "terms", label: "Nội dung chính" },
                { key: "preview", label: "Xem trước" },
              ] as const
            ).map((item, index) => (
              <button
                type="button"
                key={item.key}
                aria-pressed={step === item.key}
                onClick={() => setStep(item.key)}
                className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-4 text-sm font-medium ${step === item.key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                <span
                  className={`grid size-5 place-items-center rounded-full text-xs ${step === item.key ? "bg-blue-50" : "bg-slate-100"}`}
                >
                  {index + 1}
                </span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="p-5 sm:p-7">
            {step === "preview" ? (
              <DraftPreview
                content={values.content}
                canEdit={canEdit}
                onChange={(content) => editor.change({ content })}
              />
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="font-semibold">
                    {step === "parties"
                      ? "Thông tin các bên giao kết"
                      : "Thông tin riêng của hợp đồng"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {step === "parties"
                      ? "Thông tin doanh nghiệp được điền sẵn. Kiểm tra người đại diện và bên đối tác trước khi tiếp tục."
                      : "Điền rõ phạm vi, số tiền và thời hạn. AI sẽ dùng thông tin này để bổ sung các điều khoản trong khung mẫu."}
                  </p>
                </div>
                <DraftFields
                  template={template}
                  group={step}
                  values={values}
                  companyName={draft.organization.name}
                  disabled={!canEdit}
                  onChange={editor.change}
                />
                <div className="mt-7 flex justify-end border-t border-slate-100 pt-5">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setStep(step === "parties" ? "terms" : "preview")
                    }
                  >
                    Tiếp tục →
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>
        <aside className="grid gap-5">
          <DraftAiAssistant
            editor={editor}
            template={template}
            orgId={user.orgId ?? undefined}
            onGenerated={() => setStep("preview")}
          />
          <DraftApprovalActions
            editor={editor}
            user={user}
            onApprove={() => {
              setStep("preview");
              setApprove(true);
            }}
          />
          {draft.notes.length > 0 && (
            <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
              <h2 className="text-sm font-semibold text-amber-900">
                Điểm cần kiểm tra
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-5 text-amber-800">
                {draft.notes.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>
          )}
          <p className="px-1 text-xs leading-5 text-slate-400">
            Khung tham khảo: {template.legalBasis}
          </p>
        </aside>
      </div>
      {approve && (
        <DraftApprovalDialog
          title={values.title}
          busy={busy === "approve"}
          onClose={() => setApprove(false)}
          onConfirm={() => {
            void editor.run("approve").then(() => setApprove(false));
          }}
        />
      )}
    </DraftShell>
  );
}
