import { Schema, model, InferSchemaType } from 'mongoose';

const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    taxCode: { type: String, trim: true },
  },
  { timestamps: true },
);

export type Organization = InferSchemaType<typeof organizationSchema>;
export const OrganizationModel = model('Organization', organizationSchema);
