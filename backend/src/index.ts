import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables before route modules handle any requests.
dotenv.config();

import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import examRoutes from './routes/examRoutes';
import uploadRoutes from './routes/uploadRoutes';
import studentRoutes from './routes/studentRoutes';
import violationRoutes from './routes/violationRoutes';
import feedbackRoutes from './routes/feedbackRoutes';
import { authenticateUser, authorizeRoles } from './middleware/auth';
import { initAdminUser } from './controllers/authController';

const app = express();
const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
let adminSeedPromise: Promise<void> | null = null;

// Middlewares
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(cookieParser());

// Request logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Seed once per process/cold start without blocking module import.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!adminSeedPromise) {
    adminSeedPromise = initAdminUser();
  }
  next();
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/exams', examRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/violations', violationRoutes);
app.use('/api/student', feedbackRoutes);

// Protected Demo Routes (To test role-based authorizations on the backend)
app.get('/api/dashboard/admin', authenticateUser, authorizeRoles('ADMIN'), (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Welcome to the Admin API. You have ADMIN privileges.',
    stats: {
      totalExams: 12,
      activeStudents: 45,
      pendingReviews: 8,
      recentViolations: 2,
    }
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`👉 Access-Control-Allow-Origin: ${CLIENT_URL}`);
    await initAdminUser();
  });
}

export default app;
