import { Router } from 'express';
import { getOutlets, getOutlet, createOutlet, updateOutlet, deleteOutlet } from '../controllers/outlet.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getOutlets);
router.get('/:id', getOutlet);
router.post('/', authorizePermission('settings.edit'), createOutlet);
router.put('/:id', authorizePermission('settings.edit'), updateOutlet);
router.delete('/:id', authorizePermission('settings.edit'), deleteOutlet);

export default router;
