import 'express-session';

export interface SessionUser {
  id: string;
  userId: string;
  role: 'ADMIN' | 'SHOP_OWNER' | 'CUSTOMER';
  shopOwnerId?: string;
  customerId?: string;
}

declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}
