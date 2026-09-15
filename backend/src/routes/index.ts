import { Router } from 'express';
import authRoutes from './auth.routes';
import contractRoutes from './contract.routes';

const router = Router();

router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

router.use('/auth', authRoutes);
router.use('/contracts', contractRoutes);

// Future modules plug in here: /clauses, /risks, /dashboard, /users, /kb (RAG knowledge base)

export default router;
