import type { TemplateCode } from './templates';

// Where a template appears in the template library until a Manager chooses a category.
const defaultCategories: Record<TemplateCode, string> = {
  labor: 'Lao động',
  service: 'Dịch vụ',
  sales: 'Thương mại',
  rental: 'Bất động sản',
  office_lease: 'Bất động sản',
  housing_purchase: 'Bất động sản',
  life_insurance: 'Bảo hiểm',
};

export const templateCategory = (template: { code: TemplateCode; category?: string }) =>
  template.category?.trim() || defaultCategories[template.code];
