import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { env } from '../utils/env';
import { verifyPassword, hashPassword } from '../utils/password';

// Admin Login Controller
export const adminLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { password } = req.body;

    if (!password || typeof password !== 'string' || !env.ADMIN_PASSWORD_HASH) {
      // Security requirement: Return 404 Not Found on failed authentication to conceal route
      res.status(404).json({
        success: false,
        error: { message: 'Resource not found' },
      });
      return;
    }

    const isValid = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
    if (!isValid) {
      // Intentionally return 404 on invalid password to hide admin route
      res.status(404).json({
        success: false,
        error: { message: 'Resource not found' },
      });
      return;
    }

    req.session.user = {
      id: 'admin',
      userId: 'admin',
      role: 'ADMIN',
    };

    res.status(200).json({
      success: true,
      message: 'Admin authenticated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// Admin Logout Controller
export const adminLogout = (req: Request, res: Response, next: NextFunction): void => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        next(err);
        return;
      }
      res.clearCookie('mokhata.sid', { path: '/' });
      res.status(200).json({
        success: true,
        message: 'Admin logged out successfully.',
      });
    });
  } else {
    res.status(200).json({
      success: true,
      message: 'Admin logged out successfully.',
    });
  }
};

// Get List of Shop Owners (Admin only)
export const getOwners = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const owners = await prisma.shopOwner.findMany({
      select: {
        id: true,
        userId: true,
        shopName: true,
        createdAt: true,
        user: {
          select: {
            userId: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedOwners = owners.map((o) => ({
      id: o.id,
      userId: o.user.userId,
      shopName: o.shopName,
      createdAt: o.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: { owners: formattedOwners },
    });
  } catch (error) {
    next(error);
  }
};

// Create Shop Owner Account (Admin only)
export const createOwner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, password, shopName } = req.body;

    if (!userId || !password || typeof userId !== 'string' || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'User ID and password are required.' },
      });
      return;
    }

    const trimmedUserId = userId.trim();
    if (trimmedUserId.length < 3) {
      res.status(400).json({
        success: false,
        error: { message: 'User ID must be at least 3 characters long.' },
      });
      return;
    }

    // Check for existing user ID
    const existingUser = await prisma.user.findUnique({
      where: { userId: trimmedUserId },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: { message: 'User ID already exists. Please choose a different User ID.' },
      });
      return;
    }

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          userId: trimmedUserId,
          passwordHash,
          role: 'SHOP_OWNER',
        },
      });

      const shopOwner = await tx.shopOwner.create({
        data: {
          userId: user.id,
          shopName: shopName && typeof shopName === 'string' ? shopName.trim() : `${trimmedUserId}'s Shop`,
        },
      });

      return { user, shopOwner };
    });

    res.status(201).json({
      success: true,
      data: {
        owner: {
          id: result.shopOwner.id,
          userId: result.user.userId,
          shopName: result.shopOwner.shopName,
          createdAt: result.shopOwner.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Reset/Update Shop Owner Password (Admin only)
export const updateOwnerPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const { newPassword } = req.body;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid owner ID.' },
      });
      return;
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: { message: 'New password must be at least 6 characters long.' },
      });
      return;
    }

    const shopOwner = await prisma.shopOwner.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!shopOwner) {
      res.status(404).json({
        success: false,
        error: { message: 'Shop owner not found.' },
      });
      return;
    }

    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: shopOwner.userId },
      data: { passwordHash: newHash },
    });

    res.status(200).json({
      success: true,
      message: `Password for shop owner '${shopOwner.user.userId}' updated successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
