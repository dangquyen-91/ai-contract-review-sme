"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useLegalSources, useRemoveLegalSourceMutation } from "@/hooks/legal-sources/use-legal-sources";
import { usePaginationPage } from "@/hooks/shared/use-pagination-page";
import type { LegalSource } from "@/types/legal-sources";

import { normalizeLegalSearch, matchesSourceGroup, type SourceGroup, type SourceFilters } from "@/lib/legal-source-filtering";
const emptyFilters: SourceFilters = { status: "all", issuingBody: "", issuedFrom: "", issuedTo: "" };

export function useLegalSourcesWorkspace() {
  const query = useLegalSources();
  const removeMutation = useRemoveLegalSourceMutation();
  const lock = useRef(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [filters, setFilters] = useState<SourceFilters>(emptyFilters);
  const [group, setGroup] = useState<SourceGroup>("all");
  const [page, setPage] = usePaginationPage();
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<LegalSource | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const dateError = Boolean(filters.issuedFrom && filters.issuedTo && filters.issuedFrom > filters.issuedTo);
  const baseFiltered = (query.data ?? []).filter((source) => {
    const issued = source.issuedDate?.slice(0, 10);
    return !dateError && (type === "all" || source.sourceType === type) &&
      (filters.status === "all" || source.status === filters.status) &&
      normalizeLegalSearch(source.issuingBody ?? "").includes(normalizeLegalSearch(filters.issuingBody)) &&
      (!filters.issuedFrom || Boolean(issued && issued >= filters.issuedFrom)) &&
      (!filters.issuedTo || Boolean(issued && issued <= filters.issuedTo)) &&
      normalizeLegalSearch(`${source.title} ${source.code ?? ""} ${source.documentNumber ?? ""} ${source.citationLabel} ${source.issuingBody ?? ""}`).includes(normalizeLegalSearch(search));
  });
  const groupCounts = { all: baseFiltered.length, processing: 0, failed: 0, coverage: 0 };
  for (const source of baseFiltered) {
    for (const key of ["processing", "failed", "coverage"] as const) if (matchesSourceGroup(source, key)) groupCounts[key]++;
  }
  const filtered = baseFiltered.filter((source) => matchesSourceGroup(source, group));
  const hasFilters = Boolean(search || type !== "all" || group !== "all" || filters.status !== "all" || filters.issuingBody || filters.issuedFrom || filters.issuedTo);
  function clearFilters() { setSearch(""); setType("all"); setFilters(emptyFilters); setGroup("all"); setPage(1); }
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, totalPages);
  const sources = filtered.slice((currentPage - 1) * 10, currentPage * 10);

  async function removeSource() {
    if (!deleting || removeMutation.isPending || lock.current) return;
    lock.current = true;
    setDeleteError("");
    try {
      await removeMutation.mutateAsync(deleting._id);
      setDeleting(null);
      toast.success("Đã xóa nguồn pháp lý");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Không thể xóa nguồn pháp lý.");
    } finally { lock.current = false; }
  }

  return {
    query, search, type, filtered, sources, currentPage, totalPages, showForm, deleting, deleteError,
    filters, group, groupCounts, hasFilters, dateError, clearFilters,
    changeFilter: (key: keyof SourceFilters, value: string) => { setFilters({ ...filters, [key]: value }); setPage(1); },
    changeGroup: (value: SourceGroup) => { setGroup(value); setPage(1); },
    deletePending: removeMutation.isPending,
    setPage,
    changeSearch: (value: string) => { setSearch(value); setPage(1); },
    changeType: (value: string) => { setType(value); setPage(1); },
    openForm: () => setShowForm(true),
    closeForm: () => setShowForm(false),
    selectForDeletion: (source: LegalSource) => { if (!removeMutation.isPending && !lock.current) { setDeleting(source); setDeleteError(""); } },
    cancelDeletion: () => { if (!removeMutation.isPending && !lock.current) setDeleting(null); },
    removeSource,
    sourceSaved: () => {
      setShowForm(false); clearFilters();
      toast.success("Đã thêm nguồn pháp lý. Hệ thống đang xử lý tài liệu.");
    },
  };
}
