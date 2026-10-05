import { AppError } from '../errors/AppError';
import { ContractVersionModel } from '../models/contractVersion.model';

export async function getCurrentVersion(contractId: string) {
  const version = await ContractVersionModel.findOne({ contractId }).sort({ versionNumber: -1 });
  if (!version) {
    throw AppError.notFound('Contract version not found');
  }
  return version;
}

export async function getCurrentVersionWithText(contractId: string) {
  const version = await ContractVersionModel.findOne({ contractId })
    .sort({ versionNumber: -1 })
    .select('+extractedText');
  if (!version) {
    throw AppError.notFound('Contract version not found');
  }
  return version;
}
