"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FilePlus2, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDraftList } from "@/hooks/contract-drafts/use-contract-drafts";
import { libraryCategories, searchText, templateCategory } from "@/lib/contract-drafts/template-categories";
import type { ContractTemplate } from "@/types/contract-drafts";

type Tab = "templates" | "mine";
const templateKey = (template: ContractTemplate) => template.id ?? template.code;

export function DraftLibraryDialog({
  open,
  onOpenChange,
  templates,
  loading,
  error,
  onRetry,
  pending,
  createError,
  onOpenTemplate,
  organizationWide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ContractTemplate[];
  loading: boolean;
  error?: Error | null;
  onRetry: () => void;
  pending: boolean;
  createError?: Error | null;
  onOpenTemplate: (template: ContractTemplate, party: string) => void;
  /** An organization Owner sees every draft of the organization, not only their own. */
  organizationWide?: boolean;
}) {
  const draftsLabel = organizationWide ? "Bản nháp trong tổ chức" : "Bản nháp của tôi";
  const [tab, setTab] = useState<Tab>("templates");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContractTemplate | null>(null);

  function choose(template: ContractTemplate) {
    if (template.parties.length === 1) onOpenTemplate(template, template.parties[0].code);
    else setSelected(template);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelected(null);
        onOpenChange(next);
      }}
    >
      <DialogContent
        busy={pending}
        className="flex h-[min(860px,calc(100dvh-2rem))] flex-col gap-0 p-0 sm:max-w-[min(1280px,calc(100%-2rem))]"
      >
        <div className="border-b border-slate-100 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
          <DialogTitle className="text-xl font-semibold">Mẫu hợp đồng</DialogTitle>
          <DialogDescription className="sr-only">
            Chọn mẫu hợp đồng, văn bản để bắt đầu soạn thảo hoặc mở lại bản nháp của bạn.
          </DialogDescription>
          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:gap-8">
            <div role="tablist" aria-label="Nguồn mẫu" className="inline-flex shrink-0 self-start rounded-lg bg-slate-100 p-1">
              {(
                [
                  ["templates", "Mẫu hợp đồng"],
                  ["mine", draftsLabel],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => {
                    setTab(value);
                    setSelected(null);
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    tab === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Tìm kiếm mẫu hợp đồng</span>
              <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={tab === "templates" ? "Tìm kiếm mẫu hợp đồng..." : organizationWide ? "Tìm kiếm bản nháp trong tổ chức..." : "Tìm kiếm bản nháp của bạn..."}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          {tab === "mine" ? (
            <MyDrafts query={query} templates={templates} organizationWide={organizationWide} />
          ) : selected ? (
            <TemplateRolePicker
              template={selected}
              pending={pending}
              error={createError}
              onBack={() => setSelected(null)}
              onOpen={(party) => onOpenTemplate(selected, party)}
            />
          ) : (
            <TemplateBrowser
              templates={templates}
              loading={loading}
              error={error}
              onRetry={onRetry}
              query={query}
              category={category}
              onCategory={setCategory}
              pending={pending}
              createError={createError}
              onChoose={choose}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TemplateBrowser({
  templates,
  loading,
  error,
  onRetry,
  query,
  category,
  onCategory,
  pending,
  createError,
  onChoose,
}: {
  templates: ContractTemplate[];
  loading: boolean;
  error?: Error | null;
  onRetry: () => void;
  query: string;
  category: string | null;
  onCategory: (category: string | null) => void;
  pending: boolean;
  createError?: Error | null;
  onChoose: (template: ContractTemplate) => void;
}) {
  const visible = useMemo(() => {
    const term = searchText(query);
    return templates
      .filter((template) => !category || templateCategory(template) === category)
      .filter((template) => !term || searchText(template.name).includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [templates, query, category]);
  // Only categories that hold a template are listed; the Manager sets them per template.
  const categories = useMemo(() => libraryCategories(templates), [templates]);

  return (
    <div className="flex h-full flex-col md:flex-row">
      <nav aria-label="Danh mục hợp đồng" className="shrink-0 border-b border-slate-100 px-5 py-3 md:w-64 md:border-b-0 md:px-7 md:py-5">
        <p className="mb-3 hidden px-2 text-sm font-semibold text-slate-900 md:block">Danh mục hợp đồng</p>
        <ul className="-mx-1 flex gap-1 overflow-x-auto pb-1 md:mx-0 md:flex-col md:overflow-visible md:pb-0">
          {[null, ...categories].map((item) => (
            <li key={item ?? "all"} className="shrink-0">
              <button
                type="button"
                aria-pressed={category === item}
                onClick={() => onCategory(item)}
                className={`w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  category === item ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {item ?? "Tất cả"}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:py-5 md:pl-2 md:pr-7">
        {createError && (
          <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {createError.message}
          </p>
        )}
        {loading ? (
          <p role="status" className="py-10 text-center text-sm text-slate-500">
            Đang tải mẫu hợp đồng…
          </p>
        ) : error ? (
          <div role="alert" className="py-10 text-center text-sm">
            <p className="text-red-600">{error.message}</p>
            <Button className="mt-3" variant="outline" onClick={onRetry}>
              Thử lại
            </Button>
          </div>
        ) : !visible.length ? (
          <div className="py-14 text-center">
            <FileText className="mx-auto mb-3 text-slate-300" size={30} aria-hidden="true" />
            <p className="text-sm font-medium text-slate-700">Không có mẫu phù hợp</p>
            <p className="mt-1 text-sm text-slate-500">
              {query ? "Thử từ khóa khác hoặc chọn danh mục \"Tất cả\"." : "Danh mục này chưa có mẫu."}
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((template) => (
              <li key={templateKey(template)}>
                <button
                  type="button"
                  disabled={pending}
                  data-template-code={template.code}
                  onClick={() => onChoose(template)}
                  title={template.description}
                  className="flex min-h-12 w-full items-center gap-3 rounded-lg bg-white px-4 py-3 text-left text-[15px] text-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.12)] transition-[box-shadow,color] hover:text-blue-700 hover:shadow-[0_2px_8px_rgba(15,23,42,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-50"
                >
                  <FileText size={18} aria-hidden="true" className="shrink-0 text-slate-700" />
                  <span className="min-w-0 flex-1 break-words">{template.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TemplateRolePicker({
  template,
  pending,
  error,
  onBack,
  onOpen,
}: {
  template: ContractTemplate;
  pending: boolean;
  error?: Error | null;
  onBack: () => void;
  onOpen: (party: string) => void;
}) {
  const [party, setParty] = useState(template.parties[0].code);
  return (
    <div className="h-full overflow-y-auto px-5 py-5 sm:px-7">
      <button
        type="button"
        onClick={onBack}
        disabled={pending}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Quay lại danh sách
      </button>
      <div className="mt-5 max-w-xl">
        <h3 className="text-lg font-semibold text-slate-900">{template.name}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{template.description}</p>
        <fieldset className="mt-6" disabled={pending}>
          <legend className="text-sm font-medium text-slate-700">Bạn tham gia hợp đồng với vai trò</legend>
          <div className="mt-3 grid gap-2">
            {template.parties.map((option) => (
              <label
                key={option.code}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                  party === option.code ? "border-blue-400 bg-blue-50/60 text-slate-900" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="draft-party"
                  value={option.code}
                  checked={party === option.code}
                  onChange={() => setParty(option.code)}
                  className="accent-blue-600"
                />
                {option.name}
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error.message}
          </p>
        )}
        <Button className="mt-6 gap-2" disabled={pending} onClick={() => onOpen(party)}>
          <FilePlus2 size={16} aria-hidden="true" />
          {pending ? "Đang mở mẫu…" : "Mở mẫu"}
        </Button>
      </div>
    </div>
  );
}

function MyDrafts({ query, templates, organizationWide }: { query: string; templates: ContractTemplate[]; organizationWide: boolean }) {
  const [page, setPage] = useState(1);
  const drafts = useDraftList(page);
  const term = searchText(query);
  const items = (drafts.data?.items ?? []).filter((draft) => !term || searchText(draft.title).includes(term));
  const nameOf = (code: string) => templates.find((template) => template.code === code)?.name;

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
        {drafts.isLoading ? (
          <p role="status" className="py-10 text-center text-sm text-slate-500">
            Đang tải bản nháp…
          </p>
        ) : drafts.error ? (
          <p role="alert" className="py-10 text-center text-sm text-red-600">
            {drafts.error.message}
          </p>
        ) : !items.length ? (
          <div className="py-14 text-center">
            <FileText className="mx-auto mb-3 text-slate-300" size={30} aria-hidden="true" />
            <p className="text-sm font-medium text-slate-700">
              {term ? "Không có bản nháp phù hợp" : organizationWide ? "Tổ chức chưa có bản nháp nào" : "Bạn chưa có bản nháp nào"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {term ? "Thử từ khóa khác." : organizationWide ? "Bản nháp các thành viên tạo từ mẫu hoặc tải lên sẽ hiện ở đây." : "Bản nháp bạn tạo từ mẫu hoặc tải lên sẽ hiện ở đây."}
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((draft) => (
              <li key={draft.id}>
                <Link
                  href={`/contract-drafts/${draft.id}`}
                  className="flex w-full items-start gap-3 rounded-lg bg-white px-4 py-3 text-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.12)] transition-[box-shadow,color] hover:text-blue-700 hover:shadow-[0_2px_8px_rgba(15,23,42,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                >
                  <FileText size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-slate-700" />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-[15px]">{draft.title}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {[nameOf(draft.templateCode), new Date(draft.updatedAt).toLocaleDateString("vi-VN")]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {drafts.data && drafts.data.pages > 1 && (
        <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm sm:px-7">
          <span className="text-slate-500">
            Trang {page}/{drafts.data.pages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Trước
            </Button>
            <Button size="sm" variant="outline" disabled={page >= drafts.data.pages} onClick={() => setPage(page + 1)}>
              Sau
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
