import { Router } from 'express';
import {
  loginOwner,
  loginCustomer,
  getMe,
  logout,
  changePassword,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/auth/owner/login', loginOwner);
router.post('/auth/customer/login', loginCustomer);
router.post('/auth/logout', logout);
router.get('/auth/me', requireAuth, getMe);
router.post('/auth/change-password', requireAuth, changePassword);

export default router;
