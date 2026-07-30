import { Router } from 'express';
import { getCompanyProfile, updateCompanyProfile } from '../controllers/company.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.middleware.js';
import multer from 'multer';
const upload = multer({ dest: 'uploads/' });
const router = Router();
router.get('/', authenticate, authorizePermission('company_profile.view'), getCompanyProfile);
router.put('/', authenticate, authorizePermission('company_profile.edit'), upload.single('logo'), updateCompanyProfile);
export default router;
