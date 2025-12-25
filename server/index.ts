import express from 'express';
import path from 'path';
import cors from 'cors';
import session from 'express-session';
import helmet from 'helmet';
import { config } from './config/env';
import { logger, logError } from './utils/logger';
import { authLimiter, apiLimiter, signupLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import dataRoutes from './routes/data';
import sessionRoutes from './routes/session';
import accountsRoutes from './routes/accounts';
import alertsRoutes from './routes/alerts';
import authSignupRoutes from './routes/auth_signup';
import { extractAccountId, requireAuth } from './middleware/auth';
import cron from 'node-cron';
import { runDailyAlertCheck } from './alert-checker';
import { startTokenRefreshScheduler } from './utils/tokenScheduler';

const app = express();
const PORT = config.port;

// Security headers
app.use(helmet());

// Dynamic CORS configuration
const allowedOrigins = [
    'http://localhost:3000',
    process.env.FRONTEND_URL || ''
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());

// Session configuration with enhanced security
app.use(session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: config.session.secure, // true in production (HTTPS)
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
}));

// Extract accountId from session
app.use(extractAccountId);

// Routes with rate limiting
app.use('/api/auth', authRoutes);
app.use('/api/auth/signup', signupLimiter, authSignupRoutes);
app.use('/api/session', authLimiter, sessionRoutes);
app.use('/api/accounts', requireAuth, apiLimiter, accountsRoutes);
app.use('/api/data', requireAuth, apiLimiter, dataRoutes);
app.use('/api/alerts', requireAuth, apiLimiter, alertsRoutes);

// Health check endpoint for Cloud Run
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const publicPath = path.join(__dirname, 'public');
    app.use(express.static(publicPath));

    // Catch-all route for React SPA
    app.get('*', (req, res, next) => {
        // Skip if it's an API route or health check
        if (req.path.startsWith('/api') || req.path === '/health') {
            return next();
        }
        res.sendFile(path.join(publicPath, 'index.html'));
    });
} else {
    // Root endpoint for development
    app.get('/', (req, res) => {
        res.send('Phantom Trifid Backend is running (Development)');
    });
}

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
    logError(err, {
        method: req.method,
        path: req.path,
        ip: req.ip
    });

    if (config.nodeEnv === 'production') {
        // Production: Don't leak error details
        res.status(500).json({ error: 'Internal server error' });
    } else {
        // Development: Provide detailed error info
        res.status(500).json({
            error: err.message,
            stack: err.stack
        });
    }
});

// Start daily alert check scheduler
const scheduleDailyAlertCheck = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
        runDailyAlertCheck();
        setInterval(runDailyAlertCheck, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    logger.info('Daily alert check scheduled at 00:00');
};

// Start token refresh scheduler (runs every 30 minutes)
startTokenRefreshScheduler();

scheduleDailyAlertCheck();

const server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info('Daily alert check scheduled at 00:00');
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received, starting graceful shutdown...`);

    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
