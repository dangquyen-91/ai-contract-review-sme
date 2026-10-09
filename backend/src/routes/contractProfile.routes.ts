import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { listContractProfilesHandler } from '../controllers/contractProfile.controller';

const router = Router();

router.use(requireAuth);

router.get('/', listContractProfilesHandler);

export default router;
