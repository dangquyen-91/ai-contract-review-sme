import { AppError } from '../../errors/AppError';

export const PERSONAL_REVIEW_TYPES = ['life_insurance', 'housing_purchase', 'labor'] as const;
export const BUSINESS_REVIEW_TYPES = ['sales', 'labor', 'service', 'office_lease'] as const;

export function assertPersonalReviewContract(type: string, ourParty?: string | null) {
  if (!PERSONAL_REVIEW_TYPES.some((allowedType) => allowedType === type)) {
    throw AppError.badRequest('Personal accounts can only review insurance, housing purchase, and labor contracts');
  }
  if (type === 'labor' && ourParty !== 'employee') {
    throw AppError.badRequest('Personal labor contract reviews must use the employee perspective');
  }
}

export function assertBusinessReviewContract(type: string) {
  if (!BUSINESS_REVIEW_TYPES.some((allowedType) => allowedType === type)) {
    throw AppError.badRequest('Business accounts can only review sales, labor, service, and office lease contracts');
  }
}

export function assertAccountReviewPolicy(isPersonal: boolean, type: string, ourParty?: string | null) {
  if (isPersonal) assertPersonalReviewContract(type, ourParty);
  else assertBusinessReviewContract(type);
}
