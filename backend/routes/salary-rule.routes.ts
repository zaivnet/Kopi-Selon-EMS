import { Router } from 'express';
import { getActiveRule, getHistory, updateRule } from '../controllers/salary-rule.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize(['Administrator', 'Owner']));

router.get('/active', getActiveRule);
router.get('/history', getHistory);
router.post('/', updateRule);

export default router;
