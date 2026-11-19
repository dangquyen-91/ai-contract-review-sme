"use client";
import { useState } from "react";
import { FileText, Plus, Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useManagedTemplates } from "@/hooks/managed-templates/use-managed-templates";
import {
  templateInputClass,
  templateStatusLabels,
  templateTypeLabels,
} from "@/config/managed-templates";
import { ManagedTemplateEditor } from "./managed-template-editor";

export function ManagedTemplatesWorkspace() {
  const workspace = useManagedTemplates();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("labor");
  if (workspace.selected && workspace.definition)
    return (
      <ManagedTemplateEditor
        key={workspace.selected.id}
        selected={workspace.selected}
        definition={workspace.definition}
        dirty={workspace.dirty}
        pending={workspace.pending}
        error={workspace.error}
        onChange={workspace.setDefinition}
        onSave={workspace.save}
        onClose={workspace.close}
        onAction={workspace.action}
        onRemove={workspace.remove}
        onReload={workspace.reload}
      />
    );
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Quản lý nội dung
          </p>
          <h1 className="mt-2 text-3xl font-bold">Mẫu hợp đồng</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Soạn mẫu, kiểm tra nội dung và phát hành phiên bản để cá nhân, doanh
            nghiệp sử dụng.
          </p>
        </div>
        <Button disabled={workspace.pending} onClick={() => setCreating(true)}>
          <Plus size={16} /> Tạo mẫu
        </Button>
      </header>
      <form
        className="flex gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          workspace.searchNow();
        }}
      >
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
          <Search size={17} className="text-slate-400" />
          <input
            aria-label="Tìm mẫu hợp đồng"
            className="w-full bg-transparent py-3 text-sm outline-none"
            maxLength={160}
            placeholder="Tìm theo tên hoặc mô tả mẫu…"
            value={workspace.search}
            onChange={(event) => workspace.setSearch(event.target.value)}
          />
        </label>
        <Button type="submit" variant="outline">
          Tìm kiếm
        </Button>
      </form>
      {(workspace.error || workspace.list.error) && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {(workspace.error ?? workspace.list.error)?.message}
          <Button variant="ghost" onClick={() => void workspace.list.refetch()}>
            Tải lại
          </Button>
        </p>
      )}
      {workspace.list.isPending ? (
        <p className="py-12 text-center text-slate-500">Đang tải mẫu…</p>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            {workspace.list.data?.items.map((template) => (
              <article
                key={template.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-xl bg-blue-50 p-3 text-blue-600">
                    <FileText size={22} />
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${template.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {templateStatusLabels[template.status]}
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-semibold">{template.name}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
                  {template.description}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <span className="text-xs text-slate-500">
                    {template.publishedVersion
                      ? `v${template.publishedVersion}`
                      : "Bản nháp"}
                    {template.hasUnpublishedChanges && template.publishedVersion
                      ? " · Có bản sửa chưa phát hành"
                      : ""}
                  </span>
                  <Button
                    variant="outline"
                    disabled={workspace.pending}
                    onClick={() => void workspace.open(template.id)}
                  >
                    Quản lý mẫu <ArrowRight size={15} />
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {!workspace.list.data?.items.length && (
            <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              Chưa tìm thấy mẫu phù hợp.
            </p>
          )}
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              {workspace.list.data?.total ?? 0} mẫu · Trang {workspace.page}/
              {workspace.list.data?.pages ?? 1}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={workspace.page <= 1}
                onClick={() => workspace.setPage(workspace.page - 1)}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                disabled={workspace.page >= (workspace.list.data?.pages ?? 1)}
                onClick={() => workspace.setPage(workspace.page + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        </>
      )}
      <Dialog
        open={creating}
        onOpenChange={(open) => {
          if (!workspace.pending) setCreating(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo mẫu hợp đồng</DialogTitle>
            <DialogDescription>
              Bắt đầu từ cấu trúc của loại hợp đồng đã được hỗ trợ. Mẫu mới ở
              trạng thái nháp và chưa hiển thị cho người dùng.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (await workspace.create(code, name.trim())) {
                setCreating(false);
                setName("");
              }
            }}
            className="grid gap-4"
          >
            <label className="grid gap-2 text-sm font-medium">
              Loại hợp đồng
              <select
                className={templateInputClass}
                value={code}
                onChange={(event) => setCode(event.target.value)}
              >
                {Object.entries(templateTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Tên mẫu
              <input
                required
                minLength={2}
                maxLength={160}
                className={templateInputClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ví dụ: Hợp đồng lao động nhân viên văn phòng"
              />
            </label>
            {workspace.error && (
              <p role="alert" className="text-sm text-red-600">
                {workspace.error.message}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={workspace.pending}
                onClick={() => setCreating(false)}
              >
                Hủy
              </Button>
              <Button
                disabled={workspace.pending || name.trim().length < 2}
                type="submit"
              >
                {workspace.pending ? "Đang tạo…" : "Tạo bản nháp"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
