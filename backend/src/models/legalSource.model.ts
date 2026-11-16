import { Schema, model, InferSchemaType } from 'mongoose';

export const LEGAL_SOURCE_TYPES = ['law', 'decree', 'circular', 'resolution', 'standard_template'] as const;

export const LEGAL_SOURCE_STATUSES = ['in_force', 'amended', 'repealed', 'not_yet_effective'] as const;

export const LEGAL_SOURCE_CODE_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

export const LEGAL_SOURCE_PUBLISHERS = ['official_gazette', 'national_database', 'issuing_authority', 'other'] as const;

export const LEGAL_TEXT_KINDS = ['original', 'consolidated'] as const;

export const LEGAL_PROVENANCES = ['official', 'declared', 'unverified'] as const;

export const legalSourceOriginSchema = new Schema(
  {
    publisher: { type: String, enum: LEGAL_SOURCE_PUBLISHERS, required: true },
    url: { type: String, trim: true },
    retrievedAt: { type: Date },
  },
  { _id: false },
);

const legalCoverageSchema = new Schema(
  {
    structured: { type: Boolean, required: true },
    articleCount: { type: Number, required: true },
    firstArticle: { type: Number },
    lastArticle: { type: Number },
    expectedArticleCount: { type: Number },
    missingArticleCount: { type: Number, required: true },
    missingRanges: { type: [String], default: [] },
    suffixedArticles: { type: [String], default: [] },
    headingCount: { type: Number, required: true },
    chunkCount: { type: Number, required: true },
    complete: { type: Boolean, required: true },
    warnings: { type: [String], default: [] },
  },
  { _id: false },
);

export const LEGAL_INGESTION_STATUSES = ['queued', 'running', 'paused', 'completed', 'failed'] as const;

const legalIngestionSchema = new Schema(
  {
    status: { type: String, enum: LEGAL_INGESTION_STATUSES, required: true },
    jobId: { type: String },
    totalChunks: { type: Number, required: true },
    embeddedChunks: { type: Number, required: true, default: 0 },
    error: { type: String },
    resumeAt: { type: Date },
    queuedAt: { type: Date },
    startedAt: { type: Date },
    finishedAt: { type: Date },
  },
  { _id: false },
);

export const LEGAL_END_OF_TEXT_KINDS = ['signature', 'consolidation', 'appendix'] as const;

const legalTextCleanupSchema = new Schema(
  {
    pageFurnitureLines: { type: Number, required: true },
    footnoteLines: { type: Number, required: true },
    droppedTailLines: { type: Number, required: true },
    stoppedAt: { type: String },
    stoppedAtKind: { type: String, enum: LEGAL_END_OF_TEXT_KINDS },
  },
  { _id: false },
);

export const LEGAL_EXTRACTION_METHODS = ['text_layer', 'ocr', 'mixed', 'docx', 'doc', 'txt'] as const;

const legalExtractionSchema = new Schema(
  {
    method: { type: String, enum: LEGAL_EXTRACTION_METHODS, required: true },
    pageCount: { type: Number },
    ocrPageCount: { type: Number, required: true },
    ocrConfidence: { type: Number },
    lowConfidence: { type: Boolean, required: true },
  },
  { _id: false },
);

export const LEGAL_CROSS_CHECK_RESULTS = ['same', 'different'] as const;

const legalCrossCheckSchema = new Schema(
  {
    result: { type: String, enum: LEGAL_CROSS_CHECK_RESULTS, required: true },
    referenceFileName: { type: String },
    referenceFileKey: { type: String },
    referenceFileResourceType: { type: String },
    referenceFileDeliveryType: { type: String },
    referenceFileFormat: { type: String },
    referenceFileHash: { type: String },
    referenceMimeType: { type: String },
    referenceFileSize: { type: Number },
    referenceOrigin: { type: legalSourceOriginSchema },
    compared: { type: Number, required: true },
    differing: { type: Number, required: true },
    onlyInReference: { type: Number, required: true },
    differences: { type: [String], default: undefined },
    acknowledged: { type: Boolean, required: true },
    checkedAt: { type: Date, required: true },
  },
  { _id: false },
);

const legalSourcePartSchema = new Schema(
  {
    fileName: { type: String },
    articleFrom: { type: Number },
    articleTo: { type: Number },
    chunkCount: { type: Number, required: true },
    skippedArticles: { type: [String], default: [] },
    uploadedAt: { type: Date, required: true },
    fileKey: { type: String },
    fileResourceType: { type: String },
    fileDeliveryType: { type: String },
    fileFormat: { type: String },
    fileHash: { type: String },
    mimeType: { type: String },
    fileSize: { type: Number },
    cleanup: { type: legalTextCleanupSchema },
    extraction: { type: legalExtractionSchema },
    notes: { type: [String], default: undefined },
    crossCheck: { type: legalCrossCheckSchema },
  },
  { _id: false },
);

const previousLegalSourcePartSchema = legalSourcePartSchema.clone();
previousLegalSourcePartSchema.add({ replacedAt: { type: Date, required: true } });

const legalSourceSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    documentNumber: { type: String, trim: true },
    sourceType: { type: String, enum: LEGAL_SOURCE_TYPES, required: true, index: true },
    status: { type: String, enum: LEGAL_SOURCE_STATUSES, default: 'in_force', index: true },
    issuingBody: { type: String },
    signer: { type: String, trim: true },
    legalField: { type: String, trim: true },
    issuingPlace: { type: String, trim: true },
    gazette: { type: String, trim: true },
    citationLabel: { type: String, required: true },
    issuedDate: { type: Date },
    effectiveDate: { type: Date },
    expiryDate: { type: Date },
    origin: { type: legalSourceOriginSchema },
    textKind: { type: String, enum: LEGAL_TEXT_KINDS },
    consolidatedThrough: { type: [String], default: undefined },
    coverage: { type: legalCoverageSchema },
    ingestion: { type: legalIngestionSchema },
    parts: { type: [legalSourcePartSchema], default: [] },
    previousParts: { type: [previousLegalSourcePartSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

legalSourceSchema.index({ 'parts.fileHash': 1 });

export type LegalSource = InferSchemaType<typeof legalSourceSchema>;
export type LegalSourcePart = InferSchemaType<typeof legalSourcePartSchema>;
export type LegalCoverage = InferSchemaType<typeof legalCoverageSchema>;
export type LegalSourceOrigin = InferSchemaType<typeof legalSourceOriginSchema>;
export const LegalSourceModel = model('LegalSource', legalSourceSchema);
