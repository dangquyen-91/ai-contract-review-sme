export type LegalSource = {
  _id: string;
  title: string;
  citationLabel: string;
  sourceType: "law" | "decree" | "circular" | "resolution" | "standard_template";
  issuingBody?: string;
  effectiveDate?: string;
  chunkCount: number;
  code?: string;
  inCatalog?: boolean;
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

export type LegalSourceUpdate = Partial<{
  title: string;
  citationLabel: string;
  sourceType: LegalSource["sourceType"];
  status: NonNullable<LegalSource["status"]>;
  documentNumber: string | null;
  issuingBody: string | null;
  issuedDate: string | null;
  effectiveDate: string | null;
  expiryDate: string | null;
  expectedArticleCount: number | null;
}>;

export type LegalSourceCatalogEntry = {
  code: string;
  label: string;
  usedByProfiles: { code: string; name: string }[];
  ruleCodes: string[];
  legalSource: { _id: string; title: string; status?: LegalSource["status"]; ingestionStatus: NonNullable<LegalSource["ingestion"]>["status"] | null } | null;
};

export type AdminHealth = { status: "ok" };
