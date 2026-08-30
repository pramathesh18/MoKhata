import { Request, Response, NextFunction } from 'express';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.user) {
    res.status(401).json({
      success: false,
      error: { message: 'Unauthorized. Please log in.' },
    });
    return;
  }
  next();
};

export const requireOwner = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.user || req.session.user.role !== 'SHOP_OWNER') {
    res.status(403).json({
      success: false,
      error: { message: 'Forbidden. Shop Owner access required.' },
    });
    return;
  }
  next();
};

export const requireCustomer = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.user || req.session.user.role !== 'CUSTOMER') {
    res.status(403).json({
      success: false,
      error: { message: 'Forbidden. Customer access required.' },
    });
    return;
  }
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.user || req.session.user.role !== 'ADMIN') {
    res.status(404).json({
      success: false,
      error: { message: 'Resource not found' },
    });
    return;
  }
  next();
};
