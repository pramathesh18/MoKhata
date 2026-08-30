import { Router } from 'express';
import {
  adminLogin,
  adminLogout,
  getOwners,
  createOwner,
  updateOwnerPassword,
} from '../controllers/admin.controller';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Hidden Admin Routes
router.post('/admin/login', adminLogin);
router.post('/admin/logout', adminLogout);
router.get('/admin/owners', requireAdmin, getOwners);
router.post('/admin/owners', requireAdmin, createOwner);
router.patch('/admin/owners/:id/password', requireAdmin, updateOwnerPassword);

export default router;
