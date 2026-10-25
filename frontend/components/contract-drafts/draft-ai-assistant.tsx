"use client";

import { Check, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReviewAllowance } from "@/hooks/use-review-allowance";
import type { DraftEditorState } from "@/hooks/use-draft-editor";
import type { ContractTemplate } from "@/types/contract-drafts";
import { readLineItems, totalLineItems } from "@/lib/draft-line-items";
import { draftSaveStatus } from "@/lib/draft-save-status";
import { DraftAllowance } from "./draft-allowance";

type DraftAiAssistantProps = {
  editor: DraftEditorState;
  template: ContractTemplate;
  orgId?: string;
  onGenerated: () => void;
};

export function DraftAiAssistant({
  editor,
  template,
  orgId,
  onGenerated,
}: DraftAiAssistantProps) {
  const { draft, values, busy, dirty } = editor;
  const allowance = useReviewAllowance(orgId);
  const canGenerate =
    allowance.data?.status === "active" &&
    (allowance.data.drafting?.available ?? 0) >= 1;
  const saveStatus = draftSaveStatus(editor);
  const requiredFields = template.fields.filter((field) => field.required);
  const required = requiredFields.length;
  const filled = requiredFields.filter((field) => {
    const value = values.input[field.key] ?? "";
    if (field.kind === "items")
      return Boolean(totalLineItems(readLineItems(value)));
    return Boolean(value.trim());
  }).length;

  async function generate() {
    if (!canGenerate) return;
    if (
      values.content &&
      !window.confirm(
        "Tạo lại bằng AI sẽ thay thế nội dung hiện tại và dùng thêm 1 lượt soạn nếu thành công. Bạn có muốn tiếp tục?",
      )
    )
      return;
    if (await editor.run("generate")) onGenerated();
  }

  return (
    <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
      <span className="inline-flex rounded-xl bg-white p-2.5 text-blue-600">
        <Sparkles size={21} />
      </span>
      <h2 className="mt-3 font-semibold">Trợ lý soạn hợp đồng</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        AI bổ sung nội dung theo khung mẫu và dữ liệu bạn nhập. Không tự điền
        thông tin thiếu hoặc duyệt thay Owner.
      </p>
      <div className="mt-4 flex justify-between text-xs text-slate-500">
        <span>Trường bắt buộc đã điền</span>
        <strong>
          {filled}/{required}
        </strong>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100">
        <div
          className="h-full rounded-full bg-blue-600"
          style={{ width: `${(filled / required) * 100}%` }}
        />
      </div>
      {draft.status === "draft" && (
        <DraftAllowance
          subscription={allowance.data}
          loading={allowance.isFetching}
          onRefresh={() => {
            void allowance.refetch();
          }}
        />
      )}
      {draft.status === "draft" && (
        <div className="mt-5 grid gap-3">
          <Button
            loading={busy === "generate"}
            disabled={Boolean(busy) || !canGenerate}
            onClick={() => void generate()}
          >
            <Sparkles size={16} />
            {values.content ? "Tạo lại bản nháp" : "Tạo bản nháp bằng AI"}
          </Button>
          <Button
            variant="outline"
            disabled={!dirty || Boolean(busy)}
            loading={busy === "save"}
            onClick={() => void editor.save()}
          >
            {!dirty && !busy ? <Check size={16} /> : <Save size={16} />}
            {saveStatus.label}
          </Button>
          <p
            role="status"
            aria-live="polite"
            className={`text-xs leading-5 ${saveStatus.tone}`}
          >
            {saveStatus.message}
          </p>
          {!values.content && (
            <p className="text-xs leading-5 text-slate-500">
              Lưu thay đổi chỉ lưu thông tin đã nhập. Để xem nội dung hợp đồng,
              chọn <strong>Tạo bản nháp bằng AI</strong>.
            </p>
          )}
        </div>
      )}
      {busy === "generate" && (
        <p role="status" className="mt-3 text-xs leading-5 text-blue-700">
          AI đang soạn nội dung. Quá trình có thể mất khoảng một phút; vui lòng
          giữ trang này mở.
        </p>
      )}
    </section>
  );
}
