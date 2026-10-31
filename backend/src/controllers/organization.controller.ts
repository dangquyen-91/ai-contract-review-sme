import { Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { getOrganizationUser } from '../middlewares/auth.middleware';
import {
  createOrganization,
  deleteOrganization,
  getOrganization,
  listOrganizations,
  updateOrganization,
} from '../services/organization/organization.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, paginated } from '../utils/ApiResponse';
import { listOrganizationsQuerySchema } from '../validations/organization.validation';
import { vietnamAddressDirectory } from '../services/organization/vietnamAddress';

export const organizationAddressOptionsHandler = asyncHandler(async (_req, res) => {
  ok(res, vietnamAddressDirectory);
});

function toOrganizationResponse(organization: Awaited<ReturnType<typeof getOrganization>>) {
  return {
    id: organization.id,
    name: organization.name,
    taxCode: organization.taxCode ?? null,
    address: organization.address ?? null,
    addressDetails: organization.addressDetails ?? null,
    industry: organization.industry ?? null,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  };
}

export const createOrganizationHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();

  const organization = await createOrganization(req.user.sub, req.body);
  ok(res, toOrganizationResponse(organization), 201);
});

export const listOrganizationsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search, industry } = listOrganizationsQuerySchema.parse(req.query);
  const { items, total } = await listOrganizations(page, limit, { search, industry });
  paginated(res, items.map(toOrganizationResponse), { page, limit, total });
});

export const getOrganizationHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const organization = await getOrganization(req.params.id, user.orgId);
  ok(res, toOrganizationResponse(organization));
});

export const updateOrganizationHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const organization = await updateOrganization(req.params.id, user.orgId, req.body);
  ok(res, toOrganizationResponse(organization));
});

export const deleteOrganizationHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  await deleteOrganization(req.params.id, user.orgId, user.sub);
  res.status(204).send();
});
