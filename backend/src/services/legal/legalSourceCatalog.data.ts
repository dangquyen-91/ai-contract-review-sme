export const LEGAL_SOURCE_CATALOG = {
  commercial_law_2005: 'Luật Thương mại 2005',
  civil_code_2015: 'Bộ luật Dân sự 2015',
  labor_code_2019: 'Bộ luật Lao động 2019',
  decree_145_2020: 'Nghị định 145/2020/NĐ-CP',
  real_estate_business_law_2023: 'Luật Kinh doanh bất động sản 2023',
  housing_law_2023: 'Luật Nhà ở 2023',
  land_law_2024: 'Luật Đất đai 2024',
  insurance_business_law_2022: 'Luật Kinh doanh bảo hiểm 2022',
} as const;

export type LegalSourceCode = keyof typeof LEGAL_SOURCE_CATALOG;
