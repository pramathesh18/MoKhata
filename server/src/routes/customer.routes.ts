import { Router } from 'express';
import {
  getCustomers,
  createCustomer,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller';
import { requireAuth, requireOwner } from '../middleware/auth.middleware';

const router = Router();

router.get('/customers', requireOwner, getCustomers);
router.post('/customers', requireOwner, createCustomer);
router.get('/customers/:id', requireAuth, getCustomerById);
router.patch('/customers/:id', requireOwner, updateCustomer);
router.delete('/customers/:id', requireOwner, deleteCustomer);

export default router;
