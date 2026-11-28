"use client";
import { useState } from "react";
import { ArrowLeft, Eye, Save, Send, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  templateCategorySuggestions,
  templateInputClass,
  templateStatusLabels,
} from "@/config/managed-templates";
import { TemplateFieldsEditor } from "./template-fields-editor";
import { TemplateSectionsEditor } from "./template-sections-editor";
import { TemplatePreview } from "./template-preview";
import type {
  ManagedTemplate,
  TemplateDefinition,
} from "@/types/managed-templates";

type Props = {
  selected: ManagedTemplate;
  definition: TemplateDefinition;
  dirty: boolean;
  pending: boolean;
  error?: Error | null;
  onChange: (definition: TemplateDefinition) => void;
  onSave: () => Promise<boolean>;
  onClose: () => void;
  onAction: (action: "publish" | "retire") => Promise<boolean>;
  onRemove: () => Promise<boolean>;
  onReload: () => Promise<boolean>;
};
export function ManagedTemplateEditor(props: Props) {
  const {
    selected,
    definition,
    dirty,
    pending,
    error,
    onChange,
    onSave,
    onClose,
    onAction,
    onRemove,
    onReload,
  } = props;
  const [tab, setTab] = useState("info");
  const [confirm, setConfirm] = useState<
    "publish" | "retire" | "delete" | null
  >(null);
  const tabs = [
    { key: "info", label: "Thông tin mẫu" },
    { key: "fields", label: `Ô thông tin (${definition.fields.length})` },
    { key: "sections", label: `Điều khoản (${definition.sections.length})` },
    { key: "published", label: "Bản đang phát hành" },
    { key: "history", label: "Lịch sử phiên bản" },
    // Wide screens show the preview beside the editor instead.
    { key: "preview", label: "Xem trước", narrowOnly: true },
  ];
  return (
    <div className="space-y-5">
      <Button variant="ghost" disabled={pending} onClick={onClose}>
        <ArrowLeft size={16} /> Danh sách mẫu
      </Button>
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Quản lý mẫu hợp đồng
          </p>
          <h1 className="mt-2 text-2xl font-bold">{definition.name}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {templateStatusLabels[selected.status]} ·{" "}
            {selected.publishedVersion
              ? `Phiên bản ${selected.publishedVersion}`
              : "Chưa có phiên bản công khai"}
            {dirty
              ? " · Có thay đổi chưa lưu"
              : selected.hasUnpublishedChanges
                ? " · Bản sửa chưa phát hành"
                : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={pending || !dirty}
            onClick={() => void onSave()}
          >
            <Save size={16} /> Lưu nháp
          </Button>
          <Button
            disabled={
              pending ||
              dirty ||
              (!selected.hasUnpublishedChanges &&
                selected.status === "published")
            }
            onClick={() => setConfirm("publish")}
          >
            <Send size={16} /> Phát hành
          </Button>
          {selected.status === "published" && (
            <Button
              variant="outline"
              disabled={pending || dirty}
              onClick={() => setConfirm("retire")}
            >
              <Archive size={16} /> Ngừng sử dụng
            </Button>
          )}
          {!selected.publishedVersion && (
            <Button
              variant="outline"
              className="text-red-600"
              disabled={pending}
              onClick={() => setConfirm("delete")}
            >
              <Trash2 size={16} /> Xóa mẫu
            </Button>
          )}
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
        >
          {error.message}
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => void onReload()}
          >
            Tải lại mẫu
          </Button>
        </p>
      )}
      <nav
        aria-label="Nội dung mẫu"
        className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-3"
      >
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={tab === item.key}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${tab === item.key ? "bg-blue-600 text-white" : "bg-white text-slate-600"} ${"narrowOnly" in item ? "xl:hidden" : ""}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          {tab === "preview" && (
            <div className="xl:hidden">
              <TemplatePreview definition={definition} />
            </div>
          )}
          {tab === "info" && (
            <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6">
              <label className="grid gap-2 text-sm font-medium">
                Tên mẫu
                <input
                  disabled={pending}
                  className={templateInputClass}
                  maxLength={160}
                  value={definition.name}
                  onChange={(event) =>
                    onChange({ ...definition, name: event.target.value })
                  }
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Danh mục trong kho mẫu
                <input
                  disabled={pending}
                  className={templateInputClass}
                  maxLength={60}
                  list="template-category-suggestions"
                  placeholder="Để trống để dùng danh mục mặc định của loại hợp đồng"
                  value={definition.category ?? ""}
                  onChange={(event) =>
                    onChange({ ...definition, category: event.target.value })
                  }
                />
                <datalist id="template-category-suggestions">
                  {templateCategorySuggestions.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
                <span className="text-xs font-normal text-slate-500">
                  Người dùng thấy mẫu trong danh mục này sau khi phát hành. Danh
                  mục không còn mẫu nào sẽ tự ẩn khỏi kho.
                </span>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Mô tả
                <textarea
                  disabled={pending}
                  className={templateInputClass}
                  rows={3}
                  maxLength={1000}
                  value={definition.description}
                  onChange={(event) =>
                    onChange({ ...definition, description: event.target.value })
                  }
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Căn cứ pháp luật
                <textarea
                  disabled={pending}
                  className={templateInputClass}
                  rows={5}
                  maxLength={4000}
                  value={definition.legalBasis}
                  onChange={(event) =>
                    onChange({ ...definition, legalBasis: event.target.value })
                  }
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Ghi chú rà soát (mỗi ghi chú một dòng)
                <textarea
                  disabled={pending}
                  className={templateInputClass}
                  rows={4}
                  value={definition.reviewNotes?.join("\n") ?? ""}
                  onChange={(event) =>
                    onChange({
                      ...definition,
                      reviewNotes: event.target.value.split("\n"),
                    })
                  }
                />
              </label>
              <p className="text-xs leading-6 text-slate-500">
                Thay đổi được lưu riêng ở bản nháp. Người dùng tiếp tục nhận bản
                đã phát hành cho đến khi bạn xác nhận phát hành phiên bản mới.
              </p>
            </div>
          )}
          {tab === "fields" && (
            <TemplateFieldsEditor
              definition={definition}
              onChange={onChange}
              disabled={pending}
            />
          )}
          {tab === "sections" && (
            <TemplateSectionsEditor
              definition={definition}
              onChange={onChange}
              disabled={pending}
            />
          )}
          {tab === "published" && (
            <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Eye size={18} /> Nội dung người dùng đang nhận
              </h2>
              {!selected.publishedDefinition ? (
                <p>Chưa có bản phát hành.</p>
              ) : (
                <>
                  <p className="text-sm leading-7 text-slate-500">
                    {selected.publishedDefinition.legalBasis}
                  </p>
                  {selected.publishedDefinition.sections.map(
                    (section, index) => (
                      <div key={section.key}>
                        <h3 className="font-semibold">
                          Điều {index + 1}. {section.title}
                        </h3>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
                          {section.body}
                        </p>
                      </div>
                    ),
                  )}
                </>
              )}
            </section>
          )}
          {tab === "history" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold">
                Các phiên bản đã phát hành
              </h2>
              {selected.versions.length ? (
                <ul className="divide-y">
                  {selected.versions.map((version) => (
                    <li
                      key={version.version}
                      className="flex justify-between gap-4 py-3 text-sm"
                    >
                      <span>Phiên bản {version.version}</span>
                      <span className="text-slate-500">
                        {new Date(version.publishedAt).toLocaleString("vi-VN")}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  {selected.publishedVersion
                    ? `Mẫu nền phiên bản ${selected.publishedVersion}. Lịch sử thay đổi được ghi khi phát hành tiếp theo.`
                    : "Chưa có phiên bản phát hành."}
                </p>
              )}
              <p className="mt-4 text-xs leading-6 text-slate-500">
                Hợp đồng đã tạo luôn giữ nội dung và phiên bản tại thời điểm mở
                mẫu.
              </p>
            </section>
          )}
        </div>
        <div className="hidden min-w-0 xl:sticky xl:top-6 xl:block">
          <TemplatePreview definition={definition} />
        </div>
      </div>
      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!pending && !open) setConfirm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === "publish"
                ? "Phát hành phiên bản mới?"
                : confirm === "retire"
                  ? "Ngừng sử dụng mẫu?"
                  : "Xóa mẫu chưa phát hành?"}
            </DialogTitle>
            <DialogDescription>
              {confirm === "publish"
                ? "Người dùng sẽ có thể tạo hợp đồng từ phiên bản này. Các bản nháp đã có không thay đổi."
                : confirm === "retire"
                  ? "Mẫu sẽ ẩn khỏi danh mục tạo mới. Các hợp đồng đã tạo vẫn được giữ nguyên."
                  : "Mẫu nháp này sẽ bị xóa khỏi danh sách."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setConfirm(null)}
            >
              Hủy
            </Button>
            <Button
              disabled={pending}
              onClick={async () => {
                const success =
                  confirm === "delete"
                    ? await onRemove()
                    : confirm
                      ? await onAction(confirm)
                      : false;
                if (success) setConfirm(null);
              }}
            >
              {pending ? "Đang xử lý…" : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
