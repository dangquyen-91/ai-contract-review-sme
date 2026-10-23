import { Router } from 'express';
import authRoutes from './auth.routes';
import userManagementRoutes from './userManagement.routes';
import contractRoutes from './contract.routes';
import contractProfileRoutes from './contractProfile.routes';
import legalSourceRoutes from './legalSource.routes';
import organizationRoutes from './organization.routes';
import reviewRoutes from './review.routes';
import invitationRoutes from './invitation.routes';
import profileRoutes from './profile.routes';
import { listPlansHandler } from '../controllers/subscription.controller';

const router = Router();

router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/admin/users', userManagementRoutes);
// Compatibility alias for existing clients.
router.use('/admin/userManagement', userManagementRoutes);
router.use('/organizations', organizationRoutes);
router.use('/invitations', invitationRoutes);
router.get('/plans', listPlansHandler);
router.use('/contracts', contractRoutes);
router.use('/contract-profiles', contractProfileRoutes);
router.use('/reviews', reviewRoutes);
router.use('/kb/legal-sources', legalSourceRoutes);

export default router;
