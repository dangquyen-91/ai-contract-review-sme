import { Schema, model, InferSchemaType } from 'mongoose';

const industrySchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
  },
  { timestamps: true },
);

export type Industry = InferSchemaType<typeof industrySchema>;
export const IndustryModel = model('Industry', industrySchema);
