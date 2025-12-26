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

// Trust proxy for Railway/Load balancer
app.set('trust proxy', 1);

// Immediate Health Check (before any middleware/auth)
app.get('/health', (req, res) => {
    logger.info(`Health check ping received from ${req.ip}`);
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        env: config.nodeEnv
    });
});

// Security headers
app.use(helmet({
    contentSecurityPolicy: false // Loosen CSP for initial deployment stability
}));

// Serve static files EARLY (before CORS/Session/Parsers)
if (process.env.NODE_ENV === 'production') {
    const publicPath = path.join(__dirname, 'public');
    const fs = require('fs');
    if (fs.existsSync(publicPath)) {
        logger.info(`Static files directory found at: ${publicPath}`);
        app.use(express.static(publicPath));
    } else {
        logger.error(`CRITICAL: Static files directory NOT FOUND at: ${publicPath}`);
    }
}

// Dynamic CORS configuration
app.use(cors({
    origin: true, // Allow all origins in production for stability, or customize as needed
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
        sameSite: 'lax', // Changed from strict to lax for OAuth redirect support
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


// Catch-all handle for React SPA in production
if (process.env.NODE_ENV === 'production') {
    const publicPath = path.join(__dirname, 'public');
    app.use((req, res, next) => {
        if (req.method !== 'GET') return next();
        if (req.path.startsWith('/api') || req.path === '/health' || req.path.includes('.')) {
            return next();
        }
        res.sendFile(path.join(publicPath, 'index.html'), (err) => {
            if (err) {
                logger.error(`Failed to send index.html: ${err.message}`);
                next(err);
            }
        });
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

const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server is running on 0.0.0.0:${PORT}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Database path target: ${path.join(__dirname, 'database.json')}`);
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
