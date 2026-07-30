import { Router } from 'express';
import { login, profile, updateProfile, changePassword, forgotPassword, setup } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/setup', setup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/profile', authenticate, profile);
router.put('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);

export default router;
