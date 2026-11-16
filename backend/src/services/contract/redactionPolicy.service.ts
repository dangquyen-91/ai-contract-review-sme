import { SENSITIVE_DATA_TYPES } from '../../models/contractProfile.model';
import type { SensitiveDataType } from '../ai/redaction.service';
import { resolveContractProfile } from './contractProfile.service';

export async function redactionPolicyFor(type?: string | null): Promise<SensitiveDataType[]> {
  if (!type) return [...SENSITIVE_DATA_TYPES];
  return (await resolveContractProfile(type)).redactionPolicy as SensitiveDataType[];
}
