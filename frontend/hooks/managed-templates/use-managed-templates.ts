"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { managedTemplatesApi as api } from "@/lib/api/managed-templates";
import type {
  ManagedTemplate,
  TemplateDefinition,
} from "@/types/managed-templates";

export function useManagedTemplates() {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ManagedTemplate | null>(null);
  const [definition, setDefinition] = useState<TemplateDefinition | null>(null);
  const lock = useRef(false);
  const list = useQuery({
    queryKey: ["managed-templates", page, query],
    queryFn: () => api.list(page, query),
  });
  const mutation = useMutation({
    mutationFn: (operation: () => Promise<ManagedTemplate | { id: string }>) =>
      operation(),
  });
  const dirty = Boolean(
    selected &&
    definition &&
    JSON.stringify(definition) !== JSON.stringify(selected.definition),
  );
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  async function run(
    operation: () => Promise<ManagedTemplate | { id: string }>,
    message?: string,
  ) {
    if (lock.current) return false;
    lock.current = true;
    try {
      const result = await mutation.mutateAsync(operation);
      if ("definition" in result) {
        setSelected(result);
        setDefinition(structuredClone(result.definition));
      } else {
        setSelected(null);
        setDefinition(null);
      }
      await client.invalidateQueries({ queryKey: ["managed-templates"] });
      if (message) toast.success(message);
      return true;
    } catch {
      return false;
    } finally {
      lock.current = false;
    }
  }
  return {
    list,
    page,
    setPage,
    search,
    setSearch,
    selected,
    definition,
    setDefinition,
    dirty,
    pending: mutation.isPending,
    error: mutation.error,
    searchNow: () => {
      setPage(1);
      setQuery(search.trim());
    },
    open: (id: string) => run(() => api.get(id)),
    reload: () => selected && (!dirty || window.confirm("Tải lại sẽ bỏ thay đổi chưa lưu. Tiếp tục?")) ? run(() => api.get(selected.id)) : Promise.resolve(false),
    close: () => {
      if (!dirty || window.confirm("Bỏ thay đổi chưa lưu?")) {
        setSelected(null);
        setDefinition(null);
        mutation.reset();
      }
    },
    create: (code: string, name: string) =>
      run(() => api.create(code, name), "Đã tạo mẫu nháp"),
    save: () =>
      selected && definition
        ? run(
            () => api.save(selected.id, selected.revision, definition),
            "Đã lưu bản nháp; bản đang phát hành chưa thay đổi",
          )
        : Promise.resolve(false),
    action: (action: "publish" | "retire") =>
      selected
        ? run(
            () => api.action(selected.id, selected.revision, action),
            action === "publish"
              ? "Đã phát hành phiên bản mới"
              : "Đã ngừng sử dụng mẫu",
          )
        : Promise.resolve(false),
    remove: () =>
      selected
        ? run(
            () => api.remove(selected.id, selected.revision),
            "Đã xóa mẫu nháp",
          )
        : Promise.resolve(false),
  };
}
