import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

// Create a new ledger transaction (CREDIT or PAYMENT)
export const createTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shopOwnerId = req.session.user?.shopOwnerId;
    const { customerId, type, amount, note, itemName } = req.body;

    if (!shopOwnerId) {
      res.status(403).json({
        success: false,
        error: { message: 'Shop owner context required.' },
      });
      return;
    }

    if (!customerId || typeof customerId !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'Customer ID is required.' },
      });
      return;
    }

    if (type !== 'CREDIT' && type !== 'PAYMENT') {
      res.status(400).json({
        success: false,
        error: { message: "Transaction type must be either 'CREDIT' or 'PAYMENT'." },
      });
      return;
    }

    // Convert amount to integer Paise (e.g. ₹10.50 -> 1050 paise)
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      res.status(400).json({
        success: false,
        error: { message: 'Transaction amount must be a positive number.' },
      });
      return;
    }

    const amountInPaise = Math.round(numericAmount * 100);
    const description = (itemName || note) && typeof (itemName || note) === 'string' ? (itemName || note).trim() : null;

    // Atomic transaction execution using Prisma $transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch customer and verify tenant ownership
      const customer = await tx.customer.findFirst({
        where: { id: customerId, isActive: true },
      });

      if (!customer) {
        throw { status: 404, message: 'Customer not found or deactivated.' };
      }

      if (customer.shopOwnerId !== shopOwnerId) {
        throw { status: 403, message: 'Access denied. Customer does not belong to your shop.' };
      }

      // 2. Calculate balance adjustment: CREDIT increases debt (+), PAYMENT reduces debt (-)
      const balanceDelta = type === 'CREDIT' ? amountInPaise : -amountInPaise;
      const newBalance = customer.balance + balanceDelta;

      // 3. Atomically update customer balance
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: { balance: newBalance },
      });

      // 4. Create ledger transaction record
      const transaction = await tx.transaction.create({
        data: {
          customerId,
          type,
          amount: amountInPaise,
          itemName: description,
        },
      });

      return { transaction, newBalance: updatedCustomer.balance };
    });

    res.status(201).json({
      success: true,
      data: {
        transaction: {
          id: result.transaction.id,
          type: result.transaction.type,
          amountInRupees: result.transaction.amount / 100,
          amountInPaise: result.transaction.amount,
          itemName: result.transaction.itemName,
          createdAt: result.transaction.createdAt,
        },
        currentBalanceInRupees: result.newBalance / 100,
      },
    });
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({
        success: false,
        error: { message: error.message },
      });
      return;
    }
    next(error);
  }
};

// Get transaction history for a customer (with pagination & ownership check)
export const getCustomerTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawId = req.params.id;
    const customerId = Array.isArray(rawId) ? rawId[0] : rawId;
    const sessionUser = req.session.user;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    if (!customerId || typeof customerId !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid customer ID.' },
      });
      return;
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, isActive: true },
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        error: { message: 'Customer not found.' },
      });
      return;
    }

    // Authorization checks
    if (sessionUser?.role === 'SHOP_OWNER' && customer.shopOwnerId !== sessionUser.shopOwnerId) {
      res.status(403).json({
        success: false,
        error: { message: 'Access denied. Customer does not belong to your shop.' },
      });
      return;
    }

    if (sessionUser?.role === 'CUSTOMER' && customer.id !== sessionUser.customerId) {
      res.status(403).json({
        success: false,
        error: { message: 'Access denied. You can only view your own transactions.' },
      });
      return;
    }

    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({
        where: { customerId },
      }),
    ]);

    const formattedTransactions = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amountInRupees: t.amount / 100,
      amountInPaise: t.amount,
      itemName: t.itemName,
      createdAt: t.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
