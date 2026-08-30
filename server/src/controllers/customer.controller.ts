import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { generateCustomerUserId } from '../utils/idGenerator';
import { hashPassword } from '../utils/password';

// List all active customers for the authenticated shop owner
export const getCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shopOwnerId = req.session.user?.shopOwnerId;

    if (!shopOwnerId) {
      res.status(403).json({
        success: false,
        error: { message: 'Shop owner context required.' },
      });
      return;
    }

    const customers = await prisma.customer.findMany({
      where: {
        shopOwnerId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formattedCustomers = customers.map((c) => ({
      id: c.id,
      userId: c.user.userId,
      name: c.name,
      balance: c.balance,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    res.status(200).json({
      success: true,
      data: { customers: formattedCustomers },
    });
  } catch (error) {
    next(error);
  }
};

// Create a new customer under the authenticated shop owner
export const createCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shopOwnerId = req.session.user?.shopOwnerId;
    const { name, password } = req.body;

    if (!shopOwnerId) {
      res.status(403).json({
        success: false,
        error: { message: 'Shop owner context required.' },
      });
      return;
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: { message: 'Customer name is required.' },
      });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({
        success: false,
        error: { message: 'Password must be at least 6 characters long.' },
      });
      return;
    }

    const trimmedName = name.trim();
    const generatedUserId = await generateCustomerUserId(trimmedName);
    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          userId: generatedUserId,
          passwordHash,
          role: 'CUSTOMER',
        },
      });

      const customer = await tx.customer.create({
        data: {
          shopOwnerId,
          userId: user.id,
          name: trimmedName,
          balance: 0,
          isActive: true,
        },
      });

      return { user, customer };
    });

    // Return generated credentials immediately for shopkeeper display
    res.status(201).json({
      success: true,
      data: {
        customer: {
          id: result.customer.id,
          userId: result.user.userId,
          name: result.customer.name,
          balance: result.customer.balance,
          createdAt: result.customer.createdAt,
        },
        credentials: {
          userId: result.user.userId,
          password,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get specific customer details (with strict multi-tenant authorization)
export const getCustomerById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const sessionUser = req.session.user;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid customer ID.' },
      });
      return;
    }

    const customer = await prisma.customer.findFirst({
      where: { id, isActive: true },
      include: {
        user: { select: { userId: true } },
        shopOwner: { select: { shopName: true } },
      },
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        error: { message: 'Customer not found.' },
      });
      return;
    }

    // Authorization check: Shop owner can only view their own customers; Customer can only view themselves
    if (sessionUser?.role === 'SHOP_OWNER' && customer.shopOwnerId !== sessionUser.shopOwnerId) {
      res.status(403).json({
        success: false,
        error: { message: 'Access denied. You do not own this customer.' },
      });
      return;
    }

    if (sessionUser?.role === 'CUSTOMER' && customer.id !== sessionUser.customerId) {
      res.status(403).json({
        success: false,
        error: { message: 'Access denied. You can only view your own account.' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          userId: customer.user.userId,
          name: customer.name,
          balance: customer.balance,
          shopName: customer.shopOwner.shopName,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update customer details (e.g. name change)
export const updateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const shopOwnerId = req.session.user?.shopOwnerId;
    const { name } = req.body;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid customer ID.' },
      });
      return;
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: { message: 'Customer name is required.' },
      });
      return;
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: { id, isActive: true },
    });

    if (!existingCustomer) {
      res.status(404).json({
        success: false,
        error: { message: 'Customer not found.' },
      });
      return;
    }

    // Strict multi-tenant verification
    if (existingCustomer.shopOwnerId !== shopOwnerId) {
      res.status(403).json({
        success: false,
        error: { message: 'Access denied. You do not own this customer.' },
      });
      return;
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: { name: name.trim() },
      include: { user: { select: { userId: true } } },
    });

    res.status(200).json({
      success: true,
      data: {
        customer: {
          id: updatedCustomer.id,
          userId: updatedCustomer.user.userId,
          name: updatedCustomer.name,
          balance: updatedCustomer.balance,
          updatedAt: updatedCustomer.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Soft delete / deactivate customer
export const deleteCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const shopOwnerId = req.session.user?.shopOwnerId;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid customer ID.' },
      });
      return;
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: { id, isActive: true },
    });

    if (!existingCustomer) {
      res.status(404).json({
        success: false,
        error: { message: 'Customer not found.' },
      });
      return;
    }

    // Strict multi-tenant verification
    if (existingCustomer.shopOwnerId !== shopOwnerId) {
      res.status(403).json({
        success: false,
        error: { message: 'Access denied. You do not own this customer.' },
      });
      return;
    }

    // Soft delete to protect financial auditability and transaction ledger history
    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(200).json({
      success: true,
      message: 'Customer deactivated successfully. Financial transactions preserved.',
    });
  } catch (error) {
    next(error);
  }
};
