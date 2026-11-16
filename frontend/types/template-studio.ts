export type StudioNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: "bold" | "italic" | "underline" | "strike" }[];
  content?: StudioNode[];
};
export type StudioDocument = StudioNode & {
  type: "doc";
  content: StudioNode[];
};
export type StudioSelection = { blockIds: string[]; text: string };
export type StudioReference = { name: string; text: string };
export type StudioLaw = {
  id: string;
  code: string;
  title: string;
  documentNumber?: string;
  citationLabel: string;
  sourceType: string;
  status: "in_force" | "amended";
  issuingBody?: string;
  signer?: string;
  legalField?: string;
  issuingPlace?: string;
  gazette?: string;
  issuedDate?: string;
  effectiveDate?: string;
};
export type StudioLawList = {
  items: StudioLaw[];
  total: number;
  page: number;
  pages: number;
};
export type StudioLawPreview = {
  source: StudioLaw;
  chunks: {
    id: string;
    articleRef?: string;
    articleTitle?: string;
    text: string;
    hierarchy?: {
      level: "part" | "chapter" | "section" | "subsection";
      number: string;
      title?: string;
    }[];
  }[];
  page: number;
  pages: number;
  total: number;
};
export type StudioProposal = {
  mode?: "edit" | "check";
  blockIds?: string[];
  review?: {
    summary: string;
    findings: {
      blockId: string;
      severity: "high" | "medium" | "note";
      title: string;
      reason: string;
      contractText: string;
      verification: "source_matched" | "insufficient_basis";
      citations: {
        chunkId: string;
        sourceId: string;
        title: string;
        documentNumber?: string;
        articleRef?: string;
        quote: string;
      }[];
    }[];
  } | null;
  id: string;
  baseRevision: number;
  userMessage: string;
  message: string;
  status: "pending" | "applied" | "dismissed";
  createdAt: string;
  referenceNames?: string[];
  legalSources?: Pick<StudioLaw, "id" | "title" | "documentNumber">[];
  changes: {
    fields: { key: string; before: string; after: string }[];
    blocks: {
      action: "replace" | "insertAfter";
      blockId: string;
      before: string;
      after: string;
    }[];
  };
};
