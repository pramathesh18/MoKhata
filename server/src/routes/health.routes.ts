import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../utils/db';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  const dbStatus = await checkDatabaseConnection();

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'MoKhata Credit Ledger API',
    database: dbStatus,
  });
});

export default router;
