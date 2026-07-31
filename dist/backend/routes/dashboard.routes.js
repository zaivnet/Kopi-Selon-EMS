import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboard.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.middleware.js';
const router = Router();
router.get('/summary', authenticate, authorizePermission('dashboard.view'), getDashboardSummary);
export default router;
