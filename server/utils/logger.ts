import winston from 'winston';
import path from 'path';
import 'winston-daily-rotate-file';
import fs from 'fs-extra';

// Determine log directory: Use DATA_DIR/logs if available, else ../logs
const DB_DIR = process.env.DATA_DIR || path.join(__dirname, '../');
const logDir = path.join(DB_DIR, 'logs');

// Ensure log directory exists
fs.ensureDirSync(logDir);

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Create console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

// 1. General Application Logger
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        // Error log rotation
        new winston.transports.DailyRotateFile({
            filename: path.join(logDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error',
        }),
        // Combined log rotation
        new winston.transports.DailyRotateFile({
            filename: path.join(logDir, 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
        }),
    ],
});

// 2. Dedicated Activity Logger (for Admin Audit)
// This strictly logs user actions to separate files for easier parsing
export const activityLogger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        new winston.transports.DailyRotateFile({
            filename: path.join(logDir, 'activity-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: false, // Keep plain text for easy streaming reading
            maxSize: '20m',
            maxFiles: '30d',
        }),
    ],
});


// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: consoleFormat,
        })
    );
    activityLogger.add(
        new winston.transports.Console({
            format: consoleFormat,
        })
    );
}

// Helper functions for common log patterns
export const logAuthEvent = (event: string, details: Record<string, any>) => {
    logger.info('Auth Event', { event, ...details });
    // Also log key auth events to activity log
    if (['Login Success', 'Logout', 'Account Created'].includes(event)) {
        logActivity(details.accountId || 'unknown', event, details);
    }
};

export const logSecurityEvent = (event: string, details: Record<string, any>) => {
    logger.warn('Security Event', { event, ...details });
    logActivity(details.accountId || 'system', `Security: ${event}`, details);
};

export const logError = (error: Error, context?: Record<string, any>) => {
    logger.error('Error occurred', {
        message: error.message,
        stack: error.stack,
        ...context,
    });
};

// Main Activity Logging Function
export const logActivity = (accountId: string, action: string, details: Record<string, any> = {}) => {
    activityLogger.info(action, {
        type: 'activity',
        accountId,
        ...details
    });
};
