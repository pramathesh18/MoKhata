import { Router } from 'express';
import {
  createTransaction,
  getCustomerTransactions,
} from '../controllers/transaction.controller';
import { requireAuth, requireOwner } from '../middleware/auth.middleware';

const router = Router();

router.post('/transactions', requireOwner, createTransaction);
router.get('/customers/:id/transactions', requireAuth, getCustomerTransactions);

export default router;
