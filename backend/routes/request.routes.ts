import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  getRequests,
  getRequestById,
  createRequest,
  respondPeerSwap,
  approveRequest,
  rejectRequest,
  cancelRequest,
  getPendingCount,
  getAuditLogs,
  getEligibleSwapPeers,
} from '../controllers/request.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.middleware.js';

const router = Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'request-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipe file tidak diizinkan. Hanya file foto (JPEG/PNG/WEBP) dan PDF yang diperbolehkan.'));
    }
  }
});

router.use(authenticate);

router.post('/upload-attachment', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Tidak ada berkas yang diunggah.' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

router.get('/pending-count', getPendingCount);
router.get('/eligible-swap-peers', getEligibleSwapPeers);
router.get('/audit-logs', authorizePermission('request_center.view'), getAuditLogs);
router.get('/', authorizePermission('request_center.view'), getRequests);
router.get('/:id', authorizePermission('request_center.view'), getRequestById);
router.post('/', authorizePermission('request_center.create'), createRequest);
router.post('/:id/peer-respond', respondPeerSwap);
router.post('/:id/approve', authorizePermission('request_center.approve'), approveRequest);
router.post('/:id/reject', authorizePermission('request_center.approve'), rejectRequest);
router.post('/:id/cancel', cancelRequest);

export default router;
