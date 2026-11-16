"use client";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  FileText,
  LoaderCircle,
  LockKeyhole,
  MoreHorizontal,
  Printer,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { TemplateStudioState } from "@/hooks/contract-drafts/use-template-studio";
import type { StudioPresentation } from "./studio-presentation";
import { StudioDownloadMenu } from "./studio-download-menu";
import styles from "@/styles/template-studio.module.css";

export function StudioHeader({
  studio,
  view,
  onApprove,
  onReturn,
}: {
  studio: TemplateStudioState;
  view: StudioPresentation;
  onApprove: () => void;
  onReturn: () => void;
}) {
  const { draft, values, busy, dirty, error } = studio;
  const {
    owner,
    canFinalize,
    readOnly,
    editable,
    canExport,
    canPublish,
    status,
    missing,
  } = view;
  return (
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
          <span className="hidden sm:inline">{draft.organization.name} · </span>
          {readOnly ? (
            <>
              <LockKeyhole size={10} />
              {draft.status === "approved"
                ? "Đã hoàn tất · Chỉ đọc"
                : "Cần hoàn tất hợp đồng"}
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
      {canFinalize && draft.status !== "approved" && (
        <Button
          size="sm"
          aria-label="Hoàn tất hợp đồng"
          title="Hoàn tất hợp đồng"
          disabled={Boolean(busy) || missing.length > 0}
          loading={busy === "submit" || busy === "approve"}
          onClick={onApprove}
        >
          <CheckCircle2 size={14} />
          <span className="hidden sm:inline">Hoàn tất hợp đồng</span>
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
              onClick={() => onReturn()}
              className={styles.menuItem}
            >
              Yêu cầu chỉnh sửa
            </button>
          )}
          {canPublish &&
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
  );
}
