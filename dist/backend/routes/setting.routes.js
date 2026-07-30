import { Router } from 'express';
import { getLocationSettings, updateLocationSettings, getGeneralSettings, updateGeneralSettings } from '../controllers/setting.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.middleware.js';
const router = Router();
router.get('/location', authenticate, authorizePermission('settings.view'), getLocationSettings);
router.put('/location', authenticate, authorizePermission('settings.edit'), updateLocationSettings);
router.get('/general', authenticate, authorizePermission('settings.view'), getGeneralSettings);
router.put('/general', authenticate, authorizePermission('settings.edit'), updateGeneralSettings);
export default router;
