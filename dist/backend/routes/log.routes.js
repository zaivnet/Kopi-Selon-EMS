import { Router } from 'express';
import { getAuditLogs } from '../controllers/log.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.middleware.js';
const router = Router();
router.get('/', authenticate, authorizePermission('audit_log.view'), getAuditLogs);
export default router;
