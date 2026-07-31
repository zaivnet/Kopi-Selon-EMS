import { Router } from 'express';
import { getCompanyProfile, updateCompanyProfile } from '../controllers/company.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.middleware.js';
import multer from 'multer';
import path from 'path';

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipe file tidak diizinkan. Hanya foto logo (JPEG/PNG/WEBP) yang diperbolehkan.'));
    }
  }
});

const router = Router();

router.get('/', authenticate, authorizePermission('company_profile.view'), getCompanyProfile);
router.put('/', authenticate, authorizePermission('company_profile.edit'), upload.single('logo'), updateCompanyProfile);

export default router;
