"use client";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { managedTemplatesApi } from "@/lib/api/managed-templates";
import type { TemplateDefinition } from "@/types/managed-templates";

const DELAY_MS = 500;

/** Re-renders the contract shortly after the Manager stops typing; keeps the last good preview. */
export function useTemplatePreview(definition: TemplateDefinition) {
  const [settled, setSettled] = useState(definition);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(definition), DELAY_MS);
    return () => clearTimeout(timer);
  }, [definition]);
  const preview = useQuery({
    queryKey: ["managed-templates", "preview", JSON.stringify(settled)],
    queryFn: ({ signal }) => managedTemplatesApi.preview(settled, signal),
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: Infinity,
  });
  return { ...preview, updating: preview.isFetching || settled !== definition };
}
