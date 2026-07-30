import { Router } from 'express';
import { generatePayroll, getPayrollHistory } from '../controllers/payroll.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.middleware.js';
const router = Router();
router.use(authenticate);
router.post('/generate', authorizePermission('salary.calculate'), generatePayroll);
router.get('/history', authorizePermission('salary.view'), getPayrollHistory);
export default router;
