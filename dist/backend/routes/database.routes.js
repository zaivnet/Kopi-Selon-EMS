import { Router } from 'express';
import { backupDatabase, restoreDatabase } from '../controllers/database.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.middleware.js';
import multer from 'multer';
const upload = multer({ dest: 'uploads/' });
const router = Router();
router.get('/backup', authenticate, authorizePermission('backup_restore.backup'), backupDatabase);
router.post('/restore', authenticate, authorizePermission('backup_restore.restore'), upload.single('database'), restoreDatabase);
export default router;
