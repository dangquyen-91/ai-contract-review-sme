import { Schema, model, InferSchemaType } from 'mongoose';

const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    taxCode: { type: String, trim: true },
    address: { type: String, trim: true },
    addressDetails: {
      type: new Schema({
        provinceCode: String, provinceName: String,
        wardCode: String, wardName: String, addressLine: String,
      }, { _id: false }),
      default: undefined,
    },
    isPersonal: { type: Boolean, default: false },
    industry: { type: String },
  },
  { timestamps: true },
);

export type Organization = InferSchemaType<typeof organizationSchema>;
export const OrganizationModel = model('Organization', organizationSchema);
