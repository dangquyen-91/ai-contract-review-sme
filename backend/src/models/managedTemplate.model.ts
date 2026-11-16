import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    builtinKey: { type: String },
    code: { type: String, required: true, immutable: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'retired'],
      default: 'draft',
      required: true,
    },
    revision: { type: Number, default: 0, required: true },
    publishedVersion: { type: Number, default: 0, required: true },
    draftJson: { type: String, required: true },
    publishedJson: { type: String, default: null },
    hasUnpublishedChanges: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
schema.index({ builtinKey: 1 }, { unique: true, sparse: true });
schema.index({ status: 1, code: 1 });
export const ManagedTemplateModel = model('ManagedTemplate', schema);

const versionSchema = new Schema(
  {
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'ManagedTemplate',
      required: true,
      immutable: true,
    },
    version: { type: Number, required: true, immutable: true },
    definitionJson: { type: String, required: true, immutable: true },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', immutable: true },
  },
  { timestamps: { createdAt: 'publishedAt', updatedAt: false } },
);
versionSchema.index({ templateId: 1, version: 1 }, { unique: true });
export const ManagedTemplateVersionModel = model('ManagedTemplateVersion', versionSchema);
