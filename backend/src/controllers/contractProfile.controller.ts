import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import * as contractProfileService from '../services/contractProfile.service';

export const listContractProfilesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const profiles = await contractProfileService.listContractProfiles();
  ok(res, profiles);
});
