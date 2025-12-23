import axios from 'axios';
import { db } from '../db';
import { logger } from './logger';

interface TokenData {
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
    email?: string;
    name?: string;
}

/**
 * Refresh Google OAuth token using refresh_token
 */
export async function refreshGoogleToken(
    accountId: string,
    tokenEmail: string,
    refreshToken: string
): Promise<string | null> {
    try {
        const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
        const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
            logger.error('Google OAuth credentials not configured');
            return null;
        }

        logger.info(`Refreshing Google token for ${tokenEmail}`);

        const response = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        });

        const { access_token, expires_in } = response.data;
        const expiry_date = Date.now() + expires_in * 1000;

        // Get existing token to preserve email and name
        const existingTokens = db.getTokens(accountId, 'google');
        const existingToken = existingTokens.find(t => t.email === tokenEmail);

        // Update token in database
        db.setToken(accountId, 'google', {
            access_token,
            refresh_token: refreshToken, // Keep the same refresh token
            expiry_date,
            email: existingToken?.email || tokenEmail,
            name: existingToken?.name || ''
        });

        logger.info(`Successfully refreshed Google token for ${tokenEmail}`);
        return access_token;
    } catch (error: any) {
        logger.error(`Failed to refresh Google token for ${tokenEmail}`, {
            error: error.message,
            response: error.response?.data
        });
        return null;
    }
}

/**
 * Check if token is expired or about to expire (within 5 minutes)
 */
export function isTokenExpired(token: TokenData): boolean {
    if (!token.expiry_date) {
        return false; // If no expiry date, assume it's valid
    }

    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    return token.expiry_date <= (now + bufferTime);
}

/**
 * Get a valid Google access token, refreshing if necessary
 */
export async function getValidGoogleToken(
    accountId: string,
    tokenEmail: string
): Promise<string | null> {
    const tokens = db.getTokens(accountId, 'google');
    const token = tokens.find(t => t.email === tokenEmail);

    if (!token) {
        logger.warn(`No token found for ${tokenEmail}`);
        return null;
    }

    // Check if token is expired or about to expire
    if (isTokenExpired(token)) {
        logger.info(`Token for ${tokenEmail} is expired or expiring soon, refreshing...`);

        if (!token.refresh_token) {
            logger.error(`No refresh token available for ${tokenEmail}`);
            return null;
        }

        // Refresh the token
        const newAccessToken = await refreshGoogleToken(accountId, tokenEmail, token.refresh_token);
        return newAccessToken;
    }

    return token.access_token;
}
