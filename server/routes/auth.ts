import { Router } from 'express';
import axios from 'axios';
import { db } from '../db';

const router = Router();

// Check connection status
router.get('/status', (req, res) => {
    const accountId = req.accountId || 'admin';
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
router.post('/disconnect', (req, res) => {
    const { platform, email } = req.body;
    const accountId = req.accountId || 'admin';

    if (platform === 'google' || platform === 'meta') {
        db.removeToken(accountId, platform, email);
        res.json({ success: true });
    } else {
        res.status(400).send('Invalid platform');
    }
});

// Google OAuth
router.get('/google', (req, res) => {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
    const accountId = req.accountId || 'admin';

    if (!GOOGLE_CLIENT_ID) {
        return res.status(500).send('Google Client ID not configured');
    }

    const scope = [
        'https://www.googleapis.com/auth/adwords'
    ].join(' ');

    // Use state to pass accountId through OAuth flow
    // prompt=select_account forces Google to show the account picker
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account%20consent&state=${accountId}`;

    res.redirect(authUrl);
});

router.get('/google/callback', async (req, res) => {
    const { code } = req.query;
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';

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

        // Redirect back to settings on the FRONTEND port (3000)
        res.redirect(`http://localhost:3000/settings?status=success`);
    } catch (error) {
        console.error('Error exchanging token:', error);
        res.status(500).send('Authentication Failed');
    }
});

// Meta OAuth
router.get('/meta', (req, res) => {
    const META_CLIENT_ID = process.env.META_CLIENT_ID;
    const REDIRECT_URI = 'http://localhost:3000/api/auth/meta/callback';
    const accountId = req.accountId || 'admin';

    // Strict Mode: Redirect to Facebook even if ID is missing (Client will see Facebook error)
    // This allows the user to confirm the redirect happens.
    const clientIdToUse = META_CLIENT_ID || 'PLACEHOLDER_CLIENT_ID';

    // Request specific permissions for Ads Manager
    const scope = 'ads_management,ads_read';

    // auth_type=reauthenticate forces Facebook to show the login dialog again
    const authUrl = `https://www.facebook.com/v17.0/dialog/oauth?client_id=${clientIdToUse}&redirect_uri=${REDIRECT_URI}&state=${accountId}&scope=${scope}&auth_type=reauthenticate`;
    res.redirect(authUrl);
});

router.get('/meta/callback', async (req, res) => {
    const { code } = req.query;
    const META_CLIENT_ID = process.env.META_CLIENT_ID;
    const META_CLIENT_SECRET = process.env.META_CLIENT_SECRET;
    const REDIRECT_URI = 'http://localhost:3000/api/auth/meta/callback';

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

        res.redirect(`http://localhost:3000/settings?status=success`);
    } catch (error) {
        console.error('Error exchanging Meta token:', error);
        res.status(500).send('Meta Authentication Failed');
    }
});

export default router;
