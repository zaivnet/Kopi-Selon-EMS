import { Router } from 'express';
import { getRoles, updateRolePermissions } from '../controllers/role.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.middleware.js';
const router = Router();
router.use(authenticate);
router.get('/', authorizePermission('user_management.edit_user', 'user_management.create_user', 'employee.create', 'employee.edit', 'employee.view'), getRoles);
router.put('/:id/permissions', authorizePermission('user_management.edit_user'), updateRolePermissions);
export default router;
