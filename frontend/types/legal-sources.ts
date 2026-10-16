export type LegalSource = {
  _id: string;
  title: string;
  citationLabel: string;
  sourceType: "law" | "decree" | "circular" | "resolution" | "standard_template";
  issuingBody?: string;
  effectiveDate?: string;
  chunkCount: number;
};

export type AdminHealth = { status: "ok" };
