import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { verifyPassword, hashPassword } from '../utils/password';

// Owner Login Controller
export const loginOwner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password || typeof userId !== 'string' || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid user ID or password.' },
      });
      return;
    }

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { userId: userId.trim() },
        include: { shopOwner: true },
      });
    } catch (dbErr: any) {
      if (dbErr.code === 'P1001' || dbErr.name === 'PrismaClientInitializationError') {
        res.status(503).json({
          success: false,
          error: { message: 'Database service unavailable. Please try again later.' },
        });
        return;
      }
      throw dbErr;
    }

    if (!user || user.role !== 'SHOP_OWNER' || !user.shopOwner) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid user ID or password.' },
      });
      return;
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid user ID or password.' },
      });
      return;
    }

    // Set session user identity
    req.session.user = {
      id: user.id,
      userId: user.userId,
      role: user.role,
      shopOwnerId: user.shopOwner.id,
    };

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          userId: user.userId,
          role: user.role,
          shopOwnerId: user.shopOwner.id,
          shopName: user.shopOwner.shopName,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Customer Login Controller
export const loginCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password || typeof userId !== 'string' || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid user ID or password.' },
      });
      return;
    }

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { userId: userId.trim() },
        include: { customer: { include: { shopOwner: true } } },
      });
    } catch (dbErr: any) {
      if (dbErr.code === 'P1001' || dbErr.name === 'PrismaClientInitializationError') {
        res.status(503).json({
          success: false,
          error: { message: 'Database service unavailable. Please try again later.' },
        });
        return;
      }
      throw dbErr;
    }

    if (!user || user.role !== 'CUSTOMER' || !user.customer || !user.customer.isActive) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid user ID or password.' },
      });
      return;
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid user ID or password.' },
      });
      return;
    }

    req.session.user = {
      id: user.id,
      userId: user.userId,
      role: user.role,
      customerId: user.customer.id,
      shopOwnerId: user.customer.shopOwnerId,
    };

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          userId: user.userId,
          role: user.role,
          customerId: user.customer.id,
          name: user.customer.name,
          shopName: user.customer.shopOwner.shopName,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Current Session Info Controller (/api/auth/me)
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.session || !req.session.user) {
      res.status(401).json({
        success: false,
        error: { message: 'Not authenticated' },
      });
      return;
    }

    const sessionUser = req.session.user;

    // Virtual admin session bypasses DB lookups
    if (sessionUser.role === 'ADMIN' && sessionUser.id === 'admin') {
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: 'admin',
            userId: 'admin',
            role: 'ADMIN',
          },
        },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        shopOwner: true,
        customer: { include: { shopOwner: true } },
      },
    });

    if (!user) {
      req.session.destroy(() => {});
      res.status(401).json({
        success: false,
        error: { message: 'User identity no longer exists' },
      });
      return;
    }

    if (user.role === 'SHOP_OWNER' && user.shopOwner) {
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            userId: user.userId,
            role: user.role,
            shopOwnerId: user.shopOwner.id,
            shopName: user.shopOwner.shopName,
          },
        },
      });
      return;
    }

    if (user.role === 'CUSTOMER' && user.customer && user.customer.isActive) {
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            userId: user.userId,
            role: user.role,
            customerId: user.customer.id,
            name: user.customer.name,
            balance: user.customer.balance,
            shopName: user.customer.shopOwner.shopName,
          },
        },
      });
      return;
    }

    if (user.role === 'ADMIN' || sessionUser.role === 'ADMIN') {
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: 'admin',
            userId: 'admin',
            role: 'ADMIN',
          },
        },
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: { message: 'Invalid session context' },
    });
  } catch (error) {
    next(error);
  }
};

// Logout Controller
export const logout = (req: Request, res: Response, next: NextFunction): void => {
  const cookieName = 'mokhata.sid';
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        next(err);
        return;
      }
      res.clearCookie(cookieName, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      res.status(200).json({
        success: true,
        message: 'Logged out successfully.',
      });
    });
  } else {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  }
};

// Change Password Controller
export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.session || !req.session.user) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
      return;
    }

    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      res.status(400).json({
        success: false,
        error: { message: 'All fields are required.' },
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({
        success: false,
        error: { message: 'New password and confirmation do not match.' },
      });
      return;
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: { message: 'New password must be at least 6 characters long.' },
      });
      return;
    }

    const userId = req.session.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      res.status(401).json({
        success: false,
        error: { message: 'User not found.' },
      });
      return;
    }

    const isMatch = await verifyPassword(oldPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        error: { message: 'Current password is incorrect.' },
      });
      return;
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};
