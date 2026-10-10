import { Router } from 'express';
import authRoutes from './auth.routes';
import contractRoutes from './contract.routes';
import legalSourceRoutes from './legalSource.routes';
import organizationRoutes from './organization.routes';
import invitationRoutes from './invitation.routes';
import { listPlansHandler } from '../controllers/subscription.controller';

const router = Router();

router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/invitations', invitationRoutes);
router.get('/plans', listPlansHandler);
router.use('/contracts', contractRoutes);
router.use('/kb/legal-sources', legalSourceRoutes);

export default router;
