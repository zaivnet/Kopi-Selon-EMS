import { Router } from 'express';
import { getReportData } from '../controllers/report.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.get('/', authorizePermission('reports.view'), getReportData);

export default router;
