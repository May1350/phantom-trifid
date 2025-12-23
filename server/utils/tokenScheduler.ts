import { db } from '../db';
import { logger } from './logger';
import { getValidGoogleToken } from './tokenRefresh';

/**
 * Background scheduler to refresh tokens periodically
 * Runs every 30 minutes to ensure all tokens are valid
 */
export function startTokenRefreshScheduler() {
    const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

    logger.info('Token refresh scheduler started (runs every 30 minutes)');

    // Run immediately on startup
    refreshAllTokens();

    // Then run every 30 minutes
    setInterval(() => {
        refreshAllTokens();
    }, REFRESH_INTERVAL);
}

/**
 * Refresh all Google tokens for all accounts
 */
async function refreshAllTokens() {
    try {
        logger.info('Running scheduled token refresh check...');

        const data = db.read();
        const accountTokens = data.accountTokens || [];

        let refreshedCount = 0;
        let errorCount = 0;

        for (const accountToken of accountTokens) {
            const accountId = accountToken.accountId;
            const googleTokens = accountToken.tokens.google || [];

            for (const token of googleTokens) {
                if (!token.email) continue;

                try {
                    // This will automatically refresh if expired
                    const validToken = await getValidGoogleToken(accountId, token.email);

                    if (validToken && validToken !== token.access_token) {
                        refreshedCount++;
                        logger.info(`Refreshed token for ${token.email} (account: ${accountId})`);
                    }
                } catch (error: any) {
                    errorCount++;
                    logger.error(`Failed to refresh token for ${token.email}`, {
                        accountId,
                        error: error.message
                    });
                }
            }
        }

        logger.info(`Token refresh check completed`, {
            refreshed: refreshedCount,
            errors: errorCount,
            totalAccounts: accountTokens.length
        });
    } catch (error: any) {
        logger.error('Error in token refresh scheduler', {
            error: error.message,
            stack: error.stack
        });
    }
}
