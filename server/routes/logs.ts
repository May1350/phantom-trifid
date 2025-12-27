
import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import readline from 'readline';
import { requireAdmin } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Determine log directory (Must match logger.ts logic)
const DB_DIR = process.env.DATA_DIR || path.join(__dirname, '../../');
const LOG_DIR = path.join(DB_DIR, 'logs');

// Helper: Format date to YYYY-MM-DD
const getToday = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * GET /api/admin/logs
 * Query Params:
 * - date: YYYY-MM-DD (default: today)
 * - accountId: Filter by specific account
 */
router.get('/', requireAdmin, async (req, res) => {
    try {
        const date = (req.query.date as string) || getToday();
        const targetAccountId = req.query.accountId as string;

        // Log filename format from winston-daily-rotate-file: activity-YYYY-MM-DD.log
        const logFilePath = path.join(LOG_DIR, `activity-${date}.log`);

        if (!fs.existsSync(logFilePath)) {
            return res.json({ logs: [], message: 'No logs found for this date.' });
        }

        const logs: any[] = [];
        const fileStream = fs.createReadStream(logFilePath);

        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        for await (const line of rl) {
            try {
                if (!line.trim()) continue;

                const logEntry = JSON.parse(line);

                // Filter by type 'activity' (security check)
                if (logEntry.type !== 'activity') continue;

                // Optional Filter by Account ID
                if (targetAccountId && logEntry.accountId !== targetAccountId) {
                    continue;
                }

                logs.push(logEntry);
            } catch (parseError) {
                // Ignore malformed lines
                continue;
            }
        }

        // Sort by timestamp descending (newest first)
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        res.json({ logs });

    } catch (error) {
        logger.error('Failed to retrieve logs', { error });
        res.status(500).json({ error: 'Failed to retrieve logs' });
    }
});

export default router;
