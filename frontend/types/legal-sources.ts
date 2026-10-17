export type LegalSource = {
  _id: string;
  title: string;
  citationLabel: string;
  sourceType: "law" | "decree" | "circular" | "resolution" | "standard_template";
  issuingBody?: string;
  effectiveDate?: string;
  chunkCount: number;
  code?: string;
  documentNumber?: string;
  status?: "in_force" | "amended" | "repealed" | "not_yet_effective";
  issuedDate?: string;
  expiryDate?: string;
  coverage?: LegalCoverage;
  ingestion?: { status: "queued" | "running" | "paused" | "completed" | "failed"; totalChunks: number; embeddedChunks: number; error?: string; resumeAt?: string };
  parts?: { fileName?: string; articleFrom?: number; articleTo?: number; chunkCount: number; skippedArticles: string[]; uploadedAt: string }[];
};

export type LegalCoverage = { structured: boolean; articleCount: number; expectedArticleCount?: number; missingArticleCount: number; missingRanges: string[]; complete: boolean; warnings: string[]; chunkCount: number };
export type LegalSourcePreview = { documentNumber?: string; coverage: LegalCoverage; chunks: { order: number; articleRef?: string; articleTitle?: string; characters: number; preview: string }[] };

export type AdminHealth = { status: "ok" };
