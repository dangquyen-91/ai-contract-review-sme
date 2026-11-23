import type { LegalSourceReference } from "@/types/contracts";

export type LegalSourceLink = { url: string; label: string };

type CitedSource = LegalSourceReference & {
  legalKnowledgeChunkId: string;
  citationLabel?: string;
  sourceTitle?: string;
};

// Only http(s) links are rendered, so a stored value can never run script.
export function safeLegalUrl(url?: string) {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

export function legalSourceLink(source: CitedSource): LegalSourceLink | undefined {
  const url = safeLegalUrl(source.origin?.url);
  if (!url) return undefined;
  return { url, label: source.citationLabel || source.sourceTitle || source.documentNumber || "Văn bản gốc" };
}

// The official texts behind one legal-basis entry, one link per document.
export function legalBasisLinks(chunkIds: string[] = [], citations: CitedSource[] = []): LegalSourceLink[] {
  const ids = new Set(chunkIds);
  const links = new Map<string, LegalSourceLink>();
  for (const citation of citations) {
    if (!ids.has(citation.legalKnowledgeChunkId)) continue;
    const link = legalSourceLink(citation);
    if (link && !links.has(link.url)) links.set(link.url, link);
  }
  return [...links.values()];
}
