import { Router } from 'express';
import authRoutes from './auth.routes';
import contractRoutes from './contract.routes';
import contractProfileRoutes from './contractProfile.routes';
import legalSourceRoutes from './legalSource.routes';
import organizationRoutes from './organization.routes';

const router = Router();

router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/contracts', contractRoutes);
router.use('/contract-profiles', contractProfileRoutes);
router.use('/kb/legal-sources', legalSourceRoutes);

export default router;
