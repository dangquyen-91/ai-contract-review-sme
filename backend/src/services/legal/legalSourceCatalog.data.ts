export const LEGAL_SOURCE_CATALOG = {
  commercial_law_2005: 'Luật Thương mại 2005',
  civil_code_2015: 'Bộ luật Dân sự 2015',
  product_quality_law_2007: 'Luật Chất lượng sản phẩm, hàng hóa (đã sửa đổi, bổ sung)',
  consumer_protection_law_2023: 'Luật Bảo vệ quyền lợi người tiêu dùng (đã sửa đổi, bổ sung)',
  decree_55_2024: 'Nghị định 55/2024/NĐ-CP',
  labor_code_2019: 'Bộ luật Lao động 2019',
  decree_145_2020: 'Nghị định 145/2020/NĐ-CP',
  real_estate_business_law_2023: 'Luật Kinh doanh bất động sản 2023',
  housing_law_2023: 'Luật Nhà ở 2023',
  land_law_2024: 'Luật Đất đai 2024',
  insurance_business_law_2022: 'Luật Kinh doanh bảo hiểm 2022',
  foreign_exchange_ordinance_2005: 'Pháp lệnh Ngoại hối 2005',
} as const;

export type LegalSourceCode = keyof typeof LEGAL_SOURCE_CATALOG;

export const SALES_LEGAL_SOURCE_CODES: LegalSourceCode[] = [
  'commercial_law_2005', 'civil_code_2015', 'product_quality_law_2007',
  'consumer_protection_law_2023', 'decree_55_2024',
];

export const isCatalogLegalSourceCode = (code: string): code is LegalSourceCode =>
  Object.hasOwn(LEGAL_SOURCE_CATALOG, code);
