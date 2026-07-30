import { Router } from 'express';
import { getRoles, updateRolePermissions } from '../controllers/role.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.get('/', getRoles);
router.put('/:id/permissions', updateRolePermissions);

export default router;
