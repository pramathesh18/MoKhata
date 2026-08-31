import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { env } from './utils/env';
import { errorHandler } from './middleware/error.middleware';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import customerRoutes from './routes/customer.routes';
import transactionRoutes from './routes/transaction.routes';

const app = express();

// Security middleware
app.use(helmet());

// CORS setup
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

// Body & Cookie parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Lightweight health check endpoint for external ping services (UptimeRobot, cron jobs)
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Trust reverse proxy (required for Render / HTTPS cookies behind reverse proxy)
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Server-side session configuration
app.use(
  session({
    name: 'mokhata.sid',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: env.NODE_ENV === 'production',
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days persistent session
    },
  })
);

// API routes
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', adminRoutes);
app.use('/api', customerRoutes);
app.use('/api', transactionRoutes);

// 404 Route Handler for undefined endpoints
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Resource not found',
    },
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
