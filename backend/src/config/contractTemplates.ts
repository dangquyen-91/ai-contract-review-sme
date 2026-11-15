// Keep rental readable for saved drafts; it is no longer offered for new drafts.
export const TEMPLATE_CODES = [
  'labor',
  'service',
  'sales',
  'office_lease',
  'housing_purchase',
  'life_insurance',
  'rental',
] as const;
export type TemplateCode = (typeof TEMPLATE_CODES)[number];
