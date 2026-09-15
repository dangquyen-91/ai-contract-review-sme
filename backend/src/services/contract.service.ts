import { FilterQuery } from 'mongoose';
import { AppError } from '../errors/AppError';
import { PaginationParams } from '../utils/pagination';
import { Contract, ContractModel } from '../models/contract.model';
import { CreateContractInput, ListContractsQuery } from '../validations/contract.validation';
import { deleteContractFile } from './storage.service';

interface CreateContractParams {
  orgId: string;
  uploadedBy: string;
  input: CreateContractInput;
  file?: { key: string; url: string; resourceType: string; name: string; mimeType: string };
}

export async function createContract({ orgId, uploadedBy, input, file }: CreateContractParams) {
  return ContractModel.create({
    orgId,
    uploadedBy,
    title: input.title,
    type: input.type,
    fileKey: file?.key,
    fileUrl: file?.url,
    fileResourceType: file?.resourceType,
    fileName: file?.name,
    mimeType: file?.mimeType,
  });
}

export async function listContracts(
  orgId: string,
  query: ListContractsQuery,
  pagination: PaginationParams,
) {
  const filter: FilterQuery<Contract> = { orgId };
  if (query.type) filter.type = query.type;
  if (query.status) filter.status = query.status;
  if (query.riskLevel) filter.overallRiskLevel = query.riskLevel;
  if (query.search) filter.$text = { $search: query.search };

  const [items, total] = await Promise.all([
    ContractModel.find(filter)
      .sort({ [pagination.sortBy]: pagination.sortOrder })
      .skip(pagination.skip)
      .limit(pagination.limit),
    ContractModel.countDocuments(filter),
  ]);

  return { items, total };
}

export async function getContractById(orgId: string, id: string) {
  const contract = await ContractModel.findOne({ _id: id, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  return contract;
}

export async function deleteContract(orgId: string, id: string) {
  const contract = await ContractModel.findOne({ _id: id, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }

  await ContractModel.deleteOne({ _id: id, orgId });

  if (contract.fileKey && contract.fileResourceType) {
    await deleteContractFile(contract.fileKey, contract.fileResourceType);
  }
}
