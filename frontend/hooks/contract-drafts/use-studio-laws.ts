"use client";

import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { contractDraftsApi } from "@/lib/api/contract-drafts";
import { studioLawKeys } from "@/lib/query-keys/studio-laws";
import type { TemplateCode } from "@/types/contract-drafts";

export const MAX_STUDIO_LAWS = 10;

export function useStudioLawPicker(
  initial: string[],
  templateCode: TemplateCode,
) {
  const [selected, setSelected] = useState(initial);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOnly, setSelectedOnly] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const ids = selectedOnly ? selected : undefined;
  const list = useQuery({
    queryKey: studioLawKeys.list(query, page, ids, templateCode),
    queryFn: ({ signal }) =>
      contractDraftsApi.laws(query, page, ids, signal, templateCode),
    enabled: !selectedOnly || selected.length > 0,
    staleTime: 30_000,
    retry: 1,
  });
  return {
    selected,
    search,
    setSearch,
    page,
    setPage,
    selectedOnly,
    list,
    clearSelection: () => setSelected([]),
    setSelectedOnly: (value: boolean) => {
      setSelectedOnly(value);
      setPage(1);
    },
    toggle: (id: string) =>
      setSelected((current) =>
        current.includes(id)
          ? current.filter((item) => item !== id)
          : current.length < MAX_STUDIO_LAWS
            ? [...current, id]
            : current,
      ),
  };
}

export function useStudioLawPreview(id: string) {
  return useInfiniteQuery({
    queryKey: studioLawKeys.preview(id),
    initialPageParam: 1,
    queryFn: ({ signal, pageParam }) =>
      contractDraftsApi.lawPreview(id, pageParam, signal),
    getNextPageParam: (last) =>
      last.page < last.pages ? last.page + 1 : undefined,
    staleTime: 30_000,
    retry: 1,
  });
}
