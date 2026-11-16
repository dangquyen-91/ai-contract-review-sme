import { AppError } from '../../errors/AppError';
import { BUSINESS_REVIEW_TYPES, PERSONAL_REVIEW_TYPES } from '../contract/personalReviewPolicy';
import { CONTRACT_TEMPLATES, getTemplate, type ContractTemplate } from './templates';

export function assertTemplateScope(code: string, personal: boolean) {
  const allowed: readonly string[] = personal ? PERSONAL_REVIEW_TYPES : BUSINESS_REVIEW_TYPES;
  if (!allowed.includes(code)) {
    throw AppError.forbidden('Loại mẫu hợp đồng không thuộc phạm vi của không gian hiện tại.');
  }
}

export function accountTemplate(code: string, personal: boolean): ContractTemplate {
  assertTemplateScope(code, personal);
  const template = getTemplate(code as ContractTemplate['code']);
  if (personal && code === 'labor') {
    return {
      ...template,
      description:
        'Dành cho cá nhân giao kết hợp đồng từ góc nhìn người lao động; điền riêng thông tin người sử dụng lao động.',
      parties: [{ code: 'employee', name: 'Người lao động' }],
    };
  }
  return template;
}

export function accountTemplates(personal: boolean) {
  const allowed: readonly string[] = personal ? PERSONAL_REVIEW_TYPES : BUSINESS_REVIEW_TYPES;
  return CONTRACT_TEMPLATES.filter((template) => allowed.includes(template.code)).map((template) =>
    accountTemplate(template.code, personal),
  );
}
