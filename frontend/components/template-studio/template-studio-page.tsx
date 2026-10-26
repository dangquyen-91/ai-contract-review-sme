"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  FileText,
  List,
  LoaderCircle,
  LockKeyhole,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Printer,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useContractDraft,
  useSaveDraftCache,
} from "@/hooks/use-contract-drafts";
import { useTemplateStudio } from "@/hooks/use-template-studio";
import { contractDraftsApi } from "@/lib/api/contract-drafts";
import { readLineItems, totalLineItems } from "@/lib/draft-line-items";
import { studioCharacterCount } from "@/lib/studio-document";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DraftApprovalDialog } from "@/components/contract-drafts/draft-approval-dialog";
import { StudioEditor } from "./studio-editor";
import { StudioDownloadMenu } from "./studio-download-menu";
import { StudioChat } from "./studio-chat";
import { StudioTemplateUpdate } from "./studio-template-update";
import { StudioShell } from "./studio-shell";
import type { AuthUser } from "@/types/auth";
import type { ContractDraft } from "@/types/contract-drafts";
import type { StudioSelection } from "@/types/template-studio";
import styles from "@/styles/template-studio.module.css";

export function TemplateStudioPage({
  id,
  user,
}: {
  id: string;
  user: AuthUser;
}) {
  const query = useContractDraft(id);
  const cache = useSaveDraftCache();
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState("");
  if (!query.data)
    return (
      <StudioShell user={user}>
        <div className="grid h-full place-items-center bg-slate-50 p-8">
          <div className="text-center">
            <FileText className="mx-auto mb-4 text-blue-500" size={32} />
            <p className="text-sm text-slate-500">
              {query.error?.message ?? "Đang mở không gian soạn thảo…"}
            </p>
            {query.error && (
              <Button className="mt-4" onClick={() => void query.refetch()}>
                Thử lại
              </Button>
            )}
          </div>
        </div>
      </StudioShell>
    );
  const draft = query.data;
  if (!draft.document)
    return (
      <StudioShell
        user={user}
        organizationName={draft.organization.name}
        blockNavigation={opening}
      >
        <div className="grid h-full place-items-center bg-[#f6f8fb] p-6">
          <div className="max-w-md rounded-3xl border border-white bg-white p-8 shadow-sm">
            <Sparkles className="mb-5 text-blue-600" size={28} />
            <h1 className="text-2xl font-semibold tracking-tight">
              Mở trong không gian soạn mới
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Bản nháp cũ của bạn được giữ nội dung. Chuyển sang trình soạn để
              chỉnh trực tiếp trên văn bản và dùng trợ lý AI.
            </p>
            {openError && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {openError}
              </p>
            )}
            <Button
              className="mt-6"
              loading={opening}
              disabled={opening}
              onClick={() => {
                setOpening(true);
                setOpenError("");
                void contractDraftsApi
                  .openStudio(id, draft.revision)
                  .then(cache)
                  .catch((error) => setOpenError(error.message))
                  .finally(() => setOpening(false));
              }}
            >
              Mở trình soạn mới
            </Button>
            <Link
              href="/contract-drafts"
              className="mt-4 block text-xs text-slate-500"
            >
              ← Về các mẫu hợp đồng
            </Link>
          </div>
        </div>
      </StudioShell>
    );
  return <Studio key={id} initial={draft} user={user} />;
}

function Studio({ initial, user }: { initial: ContractDraft; user: AuthUser }) {
  const studio = useTemplateStudio(initial);
  const { draft, values, busy, dirty, error } = studio;
  const [selection, setSelection] = useState<StudioSelection>({
    blockIds: [],
    text: "",
  });
  const [chatOpen, setChatOpen] = useState(true);
  const [mobilePane, setMobilePane] = useState<"document" | "chat">("document");
  const [inspector, setInspector] = useState<"fields" | "outline" | null>(null);
  const [requestedField, setRequestedField] = useState<string | null>(null);
  const [approve, setApprove] = useState(false);
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState("");
  const owner = user.role === "owner";
  const readOnly = draft.status !== "draft";
  const editable = !readOnly && (!busy || busy === "save");
  const canExport =
    draft.status === "approved" && (owner || draft.createdBy === user.id);
  const missing = draft.template.fields.filter((field) => {
    const required =
      field.required ||
      (field.key === "endDate" &&
        (draft.templateCode !== "labor" || values.input.termType === "fixed"));
    if (!required) return false;
    const value = values.input[field.key] ?? "";
    return field.kind === "items"
      ? !totalLineItems(readLineItems(value))
      : !value.trim();
  });
  const outline = values.document.content
    .filter((node) => node.type === "heading")
    .map((node) => ({
      id: String(node.attrs?.blockId),
      text: node.content?.map((item) => item.text ?? "").join("") ?? "",
    }));
  let status = "Đã lưu";
  if (dirty) status = "Chưa lưu";
  if (busy === "save") status = "Đang lưu…";
  if (dirty && error) status = "Chưa lưu được";
  const characterCount = studioCharacterCount(values.document, draft.template);
  function jump(id: string) {
    document
      .querySelector(`[data-block-id="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    setInspector(null);
    setMobilePane("document");
  }
  function chooseField(key: string) {
    if (key === "lineItems")
      document
        .querySelector("[data-template-items]")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    else setRequestedField(key);
    setInspector(null);
    setMobilePane("document");
  }
  return (
    <StudioShell
      user={user}
      organizationName={draft.organization.name}
      blockNavigation={dirty || Boolean(busy)}
    >
      <section aria-label="Không gian soạn hợp đồng" className={styles.studio}>
        <header className="z-20 flex min-h-16 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white px-3 sm:px-5">
          <Link
            href="/contract-drafts"
            aria-label="Về danh sách mẫu"
            title="Về danh sách mẫu"
            onClick={(event) => {
              if (dirty || busy) {
                event.preventDefault();
                toast.info(
                  "Hãy lưu văn bản hoặc chờ thao tác hoàn tất trước khi rời trang.",
                );
              }
            }}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="hidden h-7 w-px bg-slate-200 sm:block" />
          <div className="min-w-0 flex-1">
            <input
              aria-label="Tên hợp đồng"
              maxLength={200}
              value={values.title}
              onChange={(event) => studio.changeTitle(event.target.value)}
              disabled={!editable}
              className="block w-full max-w-xl truncate border-0 bg-transparent text-sm font-semibold tracking-tight text-slate-800 outline-none disabled:text-slate-800"
            />
            <p className="mt-1 hidden h-3.5 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[10px] text-slate-400 sm:flex">
              <span className="hidden sm:inline">
                {draft.organization.name} ·{" "}
              </span>
              {readOnly ? (
                <>
                  <LockKeyhole size={10} />
                  {draft.status === "approved"
                    ? "Đã duyệt · Chỉ đọc"
                    : "Đang chờ duyệt"}
                </>
              ) : (
                <>
                  Mẫu {draft.template.name.toLocaleLowerCase("vi-VN")}
                  <span className="hidden sm:inline"> · Tự động lưu</span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={!dirty || Boolean(busy) || readOnly}
            onClick={() => void studio.save(true)}
            className={`hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs sm:inline-flex ${dirty && error ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}
            title="Lưu hợp đồng"
          >
            {busy === "save" ? (
              <LoaderCircle size={13} className="animate-spin" />
            ) : (
              <Check size={13} />
            )}
            {status}
          </button>
          {!readOnly && (
            <Button
              size="sm"
              aria-label={owner ? "Duyệt hợp đồng" : "Gửi duyệt"}
              title={owner ? "Duyệt hợp đồng" : "Gửi duyệt"}
              disabled={Boolean(busy) || missing.length > 0}
              loading={busy === "submit" || busy === "approve"}
              onClick={() => {
                if (owner) setApprove(true);
                else void studio.run("submit");
              }}
            >
              {owner ? <CheckCircle2 size={14} /> : <Send size={14} />}
              <span className="hidden sm:inline">{owner ? "Duyệt hợp đồng" : "Gửi duyệt"}</span>
            </Button>
          )}
          {owner && draft.status === "pending_approval" && (
            <Button
              size="sm"
              aria-label="Duyệt hợp đồng"
              title="Duyệt hợp đồng"
              disabled={Boolean(busy)}
              onClick={() => setApprove(true)}
            >
              <CheckCircle2 size={14} /><span className="hidden sm:inline">Duyệt hợp đồng</span>
            </Button>
          )}
          <StudioDownloadMenu
            ready={canExport}
            busy={Boolean(busy)}
            onWord={() => void studio.run("download")}
            onPrint={() =>
              window.open(
                `/contract-drafts/${draft.id}/print`,
                "_blank",
                "noopener,noreferrer",
              )
            }
          />
          <details className="relative">
            <summary
              aria-label="Thao tác hợp đồng"
              className="grid size-8 cursor-pointer list-none place-items-center rounded-lg text-slate-500 hover:bg-slate-100 [&::-webkit-details-marker]:hidden"
            >
              <MoreHorizontal size={20} />
            </summary>
            <div className="absolute right-0 top-10 z-40 w-60 rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl shadow-slate-200/60">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void studio.reload()}
                className={styles.menuItem}
              >
                <RefreshCw size={14} />
                Tải lại bản đã lưu
              </button>
              {dirty && !readOnly && (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void studio.save(true)}
                  className={styles.menuItem}
                >
                  <Check size={14} />
                  Lưu thay đổi
                </button>
              )}
              {canExport && (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    window.open(
                      `/contract-drafts/${draft.id}/print`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  className={styles.menuItem}
                >
                  <Printer size={14} />
                  In / lưu PDF
                </button>
              )}
              {owner && draft.status === "pending_approval" && (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => setReturning(true)}
                  className={styles.menuItem}
                >
                  Yêu cầu chỉnh sửa
                </button>
              )}
              {owner &&
                draft.status === "approved" &&
                (draft.contractId ? (
                  <Link
                    href={`/contract/${draft.contractId}`}
                    className={styles.menuItem}
                  >
                    Mở hợp đồng trong kho
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void studio.run("publish")}
                    className={styles.menuItem}
                  >
                    <FileText size={14} />
                    Chuyển sang rà soát
                  </button>
                ))}
            </div>
          </details>
        </header>
        {error && (
          <div
            role="alert"
            className="flex shrink-0 flex-wrap items-center gap-2 border-b border-red-100 bg-red-50 px-5 py-2 text-xs leading-5 text-red-700"
          >
            <CircleAlert size={14} />
            <span className="min-w-0 flex-1">{error}</span>
            <button
              type="button"
              onClick={() => void studio.reload()}
              disabled={Boolean(busy)}
              className="font-semibold underline"
            >
              Tải lại
            </button>
            {dirty && (
              <button
                type="button"
                onClick={() => void studio.save(true)}
                disabled={Boolean(busy)}
                className="font-semibold underline"
              >
                Thử lưu lại
              </button>
            )}
          </div>
        )}
        <StudioTemplateUpdate draft={draft} disabled={dirty || Boolean(busy)} />
        {draft.decisionNote && (
          <p className="shrink-0 bg-amber-50 px-5 py-2 text-xs leading-5 text-amber-800">
            Yêu cầu từ chủ tổ chức: {draft.decisionNote}
          </p>
        )}
        <nav
          className="grid shrink-0 grid-cols-2 border-b border-slate-200 bg-white md:hidden"
          aria-label="Không gian soạn trên điện thoại"
        >
          {(
            [
              { key: "document", label: "Văn bản", icon: FileText },
              { key: "chat", label: "Trợ lý AI", icon: MessageSquare },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={mobilePane === item.key}
              onClick={() => setMobilePane(item.key)}
              className={`flex items-center justify-center gap-2 py-3 text-xs font-semibold ${mobilePane === item.key ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500"}`}
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </nav>
        <div
          className={`grid min-h-0 flex-1 ${chatOpen ? "md:grid-cols-[310px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[350px_minmax(0,1fr)]" : "grid-cols-1"}`}
        >
          <div
            className={`min-h-0 border-r border-slate-200 ${mobilePane === "chat" ? "flex flex-col" : "hidden"} ${chatOpen ? "md:flex md:flex-col" : "md:hidden"}`}
          >
            <StudioChat
              studio={studio}
              orgId={user.orgId ?? undefined}
              selection={selection}
              onClearSelection={() => setSelection({ blockIds: [], text: "" })}
            />
          </div>
          <section
            className={`min-h-0 min-w-0 flex-col bg-[#f4f6f9] ${mobilePane === "document" ? "flex" : "hidden"} md:flex`}
            aria-label="Trang hợp đồng"
          >
            <div className="flex min-h-12 shrink-0 items-center gap-2 border-b border-slate-200/80 bg-white px-3 text-xs">
              <button
                type="button"
                aria-label={chatOpen ? "Ẩn trợ lý" : "Mở trợ lý"}
                title={chatOpen ? "Ẩn trợ lý" : "Mở trợ lý"}
                onClick={() => setChatOpen((current) => !current)}
                className="hidden size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 md:grid"
              >
                {chatOpen ? (
                  <PanelLeftClose size={17} />
                ) : (
                  <PanelLeftOpen size={17} />
                )}
              </button>
              <span className="hidden text-[11px] text-slate-400 lg:inline">
                Nhấp ô để điền · Bôi đen để nhờ AI sửa
              </span>
              <button
                type="button"
                onClick={() => setInspector("outline")}
                className="ml-auto flex items-center gap-1.5 rounded-lg px-2 py-2 text-slate-500 hover:bg-slate-100"
              >
                <List size={14} />
                Mục lục
              </button>
              <button
                type="button"
                onClick={() => setInspector("fields")}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-2 ${missing.length ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
              >
                {missing.length ? (
                  <CircleAlert size={13} />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                {missing.length ? `Còn ${missing.length} mục` : "Đủ thông tin"}
              </button>
            </div>
            <StudioEditor
              document={values.document}
              epoch={studio.documentEpoch}
              template={draft.template}
              disabled={!editable}
              onChange={studio.changeDocument}
              onSelection={setSelection}
              requestedField={requestedField}
              onFieldHandled={() => setRequestedField(null)}
            />
            <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-2 text-[10px] text-slate-400">
              <span>
                Times New Roman · Khổ A4 ·{" "}
                {characterCount.toLocaleString("vi-VN")} ký tự
              </span>
              <span>
                {busy === "assistant" ? "AI đang chuẩn bị đề xuất" : status}
              </span>
            </footer>
          </section>
        </div>
        {inspector && (
          <div className="absolute inset-y-16 right-0 z-30 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
            <header className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-sm font-semibold">
                  {inspector === "fields"
                    ? "Thông tin trên mẫu"
                    : "Mục lục hợp đồng"}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {inspector === "fields"
                    ? "Nhấp để điền trực tiếp vào vị trí tương ứng."
                    : "Di chuyển nhanh giữa các điều khoản."}
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng bảng thông tin"
                onClick={() => setInspector(null)}
              >
                <X size={17} className="text-slate-400" />
              </button>
            </header>
            <div className="flex-1 space-y-1 overflow-y-auto p-3">
              {inspector === "outline"
                ? outline.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => jump(item.id)}
                      className="block w-full rounded-lg px-3 py-3 text-left text-xs leading-5 text-slate-600 hover:bg-slate-50"
                    >
                      {item.text}
                    </button>
                  ))
                : draft.template.fields.map((field) => (
                    <button
                      type="button"
                      key={field.key}
                      disabled={!editable}
                      onClick={() => chooseField(field.key)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-50 disabled:opacity-60"
                    >
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-full ${missing.some((item) => item.key === field.key) ? "bg-amber-50 text-amber-500" : "bg-emerald-50 text-emerald-600"}`}
                      >
                        {missing.some((item) => item.key === field.key) ? (
                          <CircleAlert size={12} />
                        ) : (
                          <Check size={12} />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-medium text-slate-600">
                          {field.label}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-slate-400">
                          {values.input[field.key]?.slice(0, 80) ||
                            (field.required ? "Cần bổ sung" : "Không bắt buộc")}
                        </span>
                      </span>
                      <ChevronDown
                        size={12}
                        className="ml-auto -rotate-90 text-slate-300"
                      />
                    </button>
                  ))}
            </div>
          </div>
        )}
        {approve && (
          <DraftApprovalDialog
            title={values.title}
            busy={busy === "approve"}
            onClose={() => setApprove(false)}
            onConfirm={() => {
              void studio.run("approve").then((success) => {
                if (success) setApprove(false);
              });
            }}
          />
        )}
        {returning && (
          <Dialog
            open
            onOpenChange={(open) => {
              if (!open && !busy) setReturning(false);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yêu cầu chỉnh sửa</DialogTitle>
                <DialogDescription>
                  Gửi ghi chú để người soạn hoàn thiện lại văn bản.
                </DialogDescription>
              </DialogHeader>
              <textarea
                aria-label="Lý do yêu cầu chỉnh sửa"
                className="min-h-28 rounded-xl border border-slate-200 p-3 text-sm"
                value={note}
                maxLength={1000}
                onChange={(event) => setNote(event.target.value)}
              />
              <Button
                disabled={!note.trim() || Boolean(busy)}
                loading={busy === "return"}
                onClick={() => {
                  void studio.run("return", note).then((success) => {
                    if (success) setReturning(false);
                  });
                }}
              >
                Gửi yêu cầu chỉnh sửa
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </section>
    </StudioShell>
  );
}
