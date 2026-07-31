import { Router } from 'express';
import { getStatus, submitAttendance, getMonitoring, checkAttendanceLocation, getMyAttendances } from '../controllers/attendance.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Karyawan routes
router.get('/status', getStatus);
router.get('/me', getMyAttendances);
router.post('/location-check', checkAttendanceLocation);
router.post('/', authorizePermission('attendance.create'), submitAttendance);

// Admin routes
router.get('/monitoring', authorizePermission('attendance.view'), getMonitoring);

export default router;
