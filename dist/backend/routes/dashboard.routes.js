import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboard.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
const router = Router();
router.get('/summary', authenticate, authorize(['Administrator', 'Owner', 'Staff']), getDashboardSummary);
export default router;
