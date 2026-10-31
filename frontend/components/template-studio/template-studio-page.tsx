"use client";
import { useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  FileText,
  List,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useContractDraft } from "@/hooks/contract-drafts/use-contract-drafts";
import { useTemplateStudio } from "@/hooks/contract-drafts/use-template-studio";
import type { AuthUser } from "@/types/auth";
import type { ContractDraft } from "@/types/contract-drafts";
import type { StudioSelection } from "@/types/template-studio";
import { StudioEditor } from "./studio-editor";
import { StudioChat } from "./studio-chat";
import { StudioTemplateUpdate } from "./studio-template-update";
import { StudioShell } from "./studio-shell";
import { StudioHeader } from "./studio-header";
import { StudioInspector } from "./studio-inspector";
import { StudioDecisionDialogs } from "./studio-decision-dialogs";
import { StudioLoadingState, StudioLegacyEntry } from "./studio-entry-state";
import { getStudioPresentation } from "./studio-presentation";
import styles from "@/styles/template-studio.module.css";

export function TemplateStudioPage({
  id,
  user,
}: {
  id: string;
  user: AuthUser;
}) {
  const query = useContractDraft(id);
  if (!query.data)
    return (
      <StudioLoadingState
        user={user}
        error={query.error?.message}
        onRetry={() => void query.refetch()}
      />
    );
  if (!query.data.document)
    return <StudioLegacyEntry user={user} draft={query.data} />;
  return <Studio key={id} initial={query.data} user={user} />;
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
  const view = getStudioPresentation(studio, user);
  const { editable, missing, status, characterCount } = view;
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
        <StudioHeader
          studio={studio}
          view={view}
          onApprove={() => setApprove(true)}
          onReturn={() => setReturning(true)}
        />

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
        <StudioInspector
          mode={inspector}
          template={draft.template}
          input={values.input}
          view={view}
          onClose={() => setInspector(null)}
          onJump={jump}
          onChooseField={chooseField}
        />
        <StudioDecisionDialogs
          studio={studio}
          approvalOpen={approve}
          returnOpen={returning}
          onCloseApproval={() => setApprove(false)}
          onCloseReturn={() => setReturning(false)}
        />
      </section>
    </StudioShell>
  );
}
