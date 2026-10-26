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
export type StudioProposal = {
  id: string;
  baseRevision: number;
  userMessage: string;
  message: string;
  status: "pending" | "applied" | "dismissed";
  createdAt: string;
  referenceNames?: string[];
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
