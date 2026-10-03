import { PipelineStage, Types } from 'mongoose';
import { AppError } from '../errors/AppError';
import { PaginationParams } from '../utils/pagination';
import { ContractModel } from '../models/contract.model';
import { ContractVersionModel } from '../models/contractVersion.model';
import { ClauseModel } from '../models/clause.model';
import { RiskFindingModel } from '../models/riskFinding.model';
import { RiskCitationModel } from '../models/riskCitation.model';
import { CreateContractInput, ListContractsQuery } from '../validations/contract.validation';
import { deleteContractFile } from './storage.service';
import { extractContractText } from './textExtraction.service';
import { getCurrentVersion, getCurrentVersionWithText } from './contractVersion.service';

interface CreateContractParams {
  orgId: string;
  uploadedBy: string;
  input: CreateContractInput;
  file?: {
    key: string;
    url: string;
    resourceType: string;
    name: string;
    mimeType: string;
    buffer: Buffer;
  };
}

export async function createContract({ orgId, uploadedBy, input, file }: CreateContractParams) {
  const extraction = file ? await extractContractText(file.buffer, file.mimeType) : undefined;

  const contract = await ContractModel.create({
    orgId,
    uploadedBy,
    title: input.title,
    type: input.type,
  });

  const currentVersion = await ContractVersionModel.create({
    contractId: contract._id,
    versionNumber: 1,
    createdBy: uploadedBy,
    fileKey: file?.key,
    fileUrl: file?.url,
    fileResourceType: file?.resourceType,
    fileName: file?.name,
    mimeType: file?.mimeType,
    extractedText: extraction?.text,
    extractionStatus: extraction?.status ?? 'pending',
    extractionError: extraction?.error,
  });

  return { ...contract.toObject(), currentVersion: currentVersion.toObject() };
}

export async function listContracts(
  orgId: string,
  query: ListContractsQuery,
  pagination: PaginationParams,
) {
  const match: Record<string, unknown> = { orgId: new Types.ObjectId(orgId) };
  if (query.type) match.type = query.type;
  if (query.status) match.status = query.status;
  if (query.search) match.$text = { $search: query.search };

  const pipeline: PipelineStage[] = [
    { $match: match },
    {
      $lookup: {
        from: ContractVersionModel.collection.name,
        let: { contractId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$contractId', '$$contractId'] } } },
          { $sort: { versionNumber: -1 } },
          { $limit: 1 },
          { $project: { extractedText: 0 } },
        ],
        as: 'currentVersion',
      },
    },
    { $unwind: { path: '$currentVersion', preserveNullAndEmptyArrays: true } },
  ];

  if (query.riskLevel) {
    pipeline.push({ $match: { 'currentVersion.overallRiskLevel': query.riskLevel } });
  }

  const sortField =
    pagination.sortBy === 'overallRiskLevel' ? 'currentVersion.overallRiskLevel' : pagination.sortBy;

  const [items, totalResult] = await Promise.all([
    ContractModel.aggregate([
      ...pipeline,
      { $sort: { [sortField]: pagination.sortOrder } },
      { $skip: pagination.skip },
      { $limit: pagination.limit },
    ]),
    ContractModel.aggregate([...pipeline, { $count: 'total' }]),
  ]);

  return { items, total: totalResult[0]?.total ?? 0 };
}

export async function getContractById(orgId: string, id: string) {
  const contract = await ContractModel.findOne({ _id: id, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  const currentVersion = await getCurrentVersion(id);
  return { ...contract.toObject(), currentVersion: currentVersion.toObject() };
}

export async function deleteContract(orgId: string, id: string) {
  const contract = await ContractModel.findOne({ _id: id, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }

  const versions = await ContractVersionModel.find({ contractId: id });
  const versionIds = versions.map((v) => v._id);

  const findingIds = await RiskFindingModel.find({
    contractVersionId: { $in: versionIds },
  }).distinct('_id');
  await RiskCitationModel.deleteMany({ riskFindingId: { $in: findingIds } });
  await RiskFindingModel.deleteMany({ contractVersionId: { $in: versionIds } });
  await ClauseModel.deleteMany({ contractVersionId: { $in: versionIds } });
  await ContractVersionModel.deleteMany({ contractId: id });
  await ContractModel.deleteOne({ _id: id, orgId });

  for (const version of versions) {
    if (version.fileKey && version.fileResourceType) {
      await deleteContractFile(version.fileKey, version.fileResourceType);
    }
  }
}

export async function getContractText(orgId: string, id: string) {
  const contract = await ContractModel.findOne({ _id: id, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  const version = await getCurrentVersionWithText(id);
  return {
    text: version.extractedText ?? '',
    extractionStatus: version.extractionStatus,
    fileUrl: version.fileUrl,
    fileName: version.fileName,
    mimeType: version.mimeType,
  };
}
