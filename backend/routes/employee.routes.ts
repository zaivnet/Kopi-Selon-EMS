import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { 
  getMyEmployeeProfile,
  getEmployees, 
  getEmployee, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee, 
  resetPassword,
  uploadPhoto
} from '../controllers/employee.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.middleware.js';

const router = Router();

// Setup multer for photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'employee-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

router.use(authenticate);

router.get('/me', getMyEmployeeProfile);
router.get('/', authorizePermission('employee.view'), getEmployees);
router.get('/:id', authorizePermission('employee.view'), getEmployee);
router.post('/', authorizePermission('employee.create'), createEmployee);
router.put('/:id', authorizePermission('employee.edit'), updateEmployee);
router.delete('/:id', authorizePermission('employee.delete'), deleteEmployee);
router.post('/:id/reset-password', authorizePermission('user_management.reset_password'), resetPassword);
router.post('/:id/photo', authorizePermission('employee.edit'), upload.single('photo'), uploadPhoto);

export default router;