import { Router, Request, Response } from 'express';
import axios from 'axios';
import { db } from '../db';
import { logger, logAuthEvent, logSecurityEvent } from '../utils/logger';
import { config } from '../config/env';
import bcrypt from 'bcrypt';

const router = Router();

// Helper to get the correct base URL for redirects
const getBaseUrl = (req: Request) => {
    // Priority 1: Environment variable
    if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;

    // Priority 2: Current request (for production automatic detection)
    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    if (host && !host.includes('localhost')) {
        return `${protocol}://${host}`;
    }

    // Priority 3: Config fallback (usually localhost)
    return config.frontend.url;
};

// Check connection status
router.get('/status', (req: Request, res: Response) => {
    const accountId = req.accountId;
    if (!accountId) return res.status(401).json({ error: 'Unauthorized' });

    const googleTokens = db.getTokens(accountId, 'google');
    const metaTokens = db.getTokens(accountId, 'meta');

    res.json({
        google: {
            connected: googleTokens.length > 0,
            accounts: googleTokens.map(t => ({ email: t.email, name: t.name }))
        },
        meta: {
            connected: metaTokens.length > 0,
            accounts: metaTokens.map(t => ({ email: t.email, name: t.name }))
        },
        selected_account: db.getSelectedAccount()
    });
});

// Disconnect
router.post('/disconnect', (req: Request, res: Response) => {
    const { platform, email } = req.body;
    const accountId = req.accountId;
    if (!accountId) return res.status(401).json({ error: 'Unauthorized' });

    if (platform === 'google' || platform === 'meta') {
        db.removeToken(accountId, platform, email);
        res.json({ success: true });
    } else {
        res.status(400).send('Invalid platform');
    }
});

// Google OAuth
router.get('/google', (req: Request, res: Response) => {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const REDIRECT_URI = `${getBaseUrl(req)}/api/auth/google/callback`;
    const accountId = req.accountId;

    if (!accountId) return res.status(401).send('Unauthorized');

    if (!GOOGLE_CLIENT_ID) {
        return res.status(500).send('Google Client ID not configured');
    }

    const scope = [
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/adwords'
    ].join(' ');

    // Use state to pass accountId through OAuth flow
    // prompt=select_account forces Google to show the account picker
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account%20consent&state=${accountId}`;

    res.redirect(authUrl);
});

router.get('/google/callback', async (req: Request, res: Response) => {
    const { code } = req.query;
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REDIRECT_URI = `${getBaseUrl(req)}/api/auth/google/callback`;

    if (!code) return res.status(400).send('No code provided');

    try {
        const { data } = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI
        });

        // Fetch user profile to identify which account is being connected
        const profileRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${data.access_token}` }
        });
        const { email, name } = profileRes.data;

        // Store tokens in DB
        const accountId = String(req.query.state || 'admin');
        db.setToken(accountId, 'google', {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expiry_date: Date.now() + (data.expires_in * 1000),
            email,
            name
        });

        // Redirect back to settings on the FRONTEND
        res.redirect(`${getBaseUrl(req)}/settings?status=success`);
    } catch (error: any) {
        logger.error('Google OAuth Error:', {
            message: error.message,
            response: error.response?.data,
            stack: error.stack
        });
        res.status(500).send('Authentication Failed');
    }
});

// Meta OAuth
router.get('/meta', (req: Request, res: Response) => {
    const META_CLIENT_ID = process.env.META_CLIENT_ID;
    const REDIRECT_URI = `${getBaseUrl(req)}/api/auth/meta/callback`;
    const accountId = req.accountId;

    if (!accountId) return res.status(401).send('Unauthorized');

    // Strict Mode: Redirect to Facebook even if ID is missing (Client will see Facebook error)
    // This allows the user to confirm the redirect happens.
    const clientIdToUse = META_CLIENT_ID || 'PLACEHOLDER_CLIENT_ID';

    // Request specific permissions for Ads Manager
    const scope = 'ads_management,ads_read';

    // auth_type=reauthenticate forces Facebook to show the login dialog again
    const authUrl = `https://www.facebook.com/v17.0/dialog/oauth?client_id=${clientIdToUse}&redirect_uri=${REDIRECT_URI}&state=${accountId}&scope=${scope}&auth_type=reauthenticate`;
    res.redirect(authUrl);
});

router.get('/meta/callback', async (req: Request, res: Response) => {
    const { code } = req.query;
    const META_CLIENT_ID = process.env.META_CLIENT_ID;
    const META_CLIENT_SECRET = process.env.META_CLIENT_SECRET;
    const REDIRECT_URI = `${getBaseUrl(req)}/api/auth/meta/callback`;

    if (!code) return res.status(400).send('No code provided');

    try {
        const { data } = await axios.get('https://graph.facebook.com/v17.0/oauth/access_token', {
            params: {
                client_id: META_CLIENT_ID,
                client_secret: META_CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                code
            }
        });

        // Fetch Meta user profile
        const profileRes = await axios.get('https://graph.facebook.com/me', {
            params: {
                fields: 'id,name,email',
                access_token: data.access_token
            }
        });
        const { email, name } = profileRes.data;

        const accountId = String(req.query.state || 'admin');
        db.setToken(accountId, 'meta', {
            access_token: data.access_token,
            expiry_date: Date.now() + (data.expires_in * 1000),
            email: email || `meta_${profileRes.data.id}`,
            name
        });

        res.redirect(`${config.frontend.url}/settings?status=success`);
    } catch (error: any) {
        logger.error('Meta OAuth Error:', {
            message: error.message,
            response: error.response?.data,
            stack: error.stack
        });
        res.status(500).send('Meta Authentication Failed');
    }
});

// ==========================================
// GOOGLE LOGIN (IDENTITY)
// ==========================================
// This is used for logging in via Google, separate from connecting an ads account.
router.get('/google/login', (req, res) => {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const REDIRECT_URI = `${getBaseUrl(req)}/api/auth/google/login/callback`;

    logger.info(`Initiating Google Login Redirect: REDIRECT_URI=${REDIRECT_URI}`);

    const scope = [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
    ].join(' ');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}&access_type=online&prompt=select_account`;

    res.redirect(authUrl);
});

router.get('/google/login/callback', async (req, res) => {
    const { code } = req.query;
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REDIRECT_URI = `${getBaseUrl(req)}/api/auth/google/login/callback`;

    if (!code) return res.status(400).send('No code provided');

    try {
        const { data: tokenData } = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI
        });

        const { data: userInfo } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });

        const { email, name } = userInfo;

        let account = db.getAccountByEmail(email);

        if (!account) {
            const newAccountId = `user_${Date.now()}`;
            const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);

            db.createAccount({
                id: newAccountId,
                name: name,
                email: email,
                password: randomPassword,
                type: 'agency',
                status: 'active',
                provider: 'google'
            });

            account = db.getAccount(newAccountId);
        }

        if (account) {
            if (req.session) {
                (req.session as any).accountId = account.id;
                (req.session as any).accountType = account.type;
            }

            // Redirect to frontend auth-callback to handle role-based navigation
            const encodedName = encodeURIComponent(account.name);
            res.redirect(`${getBaseUrl(req)}/auth-callback?role=${account.type}&id=${account.id}&name=${encodedName}&email=${account.email}`);
        } else {
            res.status(500).send('Account creation failed');
        }

    } catch (error: any) {
        logger.error('Error in Google Login Callback:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).send('Google Login Failed');
    }
});

export default router;
