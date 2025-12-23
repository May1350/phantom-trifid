import { Router } from 'express';
import bcrypt from 'bcrypt';
import axios from 'axios';
import { db } from '../db';
import { logger } from '../utils/logger';
import { authValidators, validate } from '../middleware/validator';

const router = Router();

// ==========================================
// EMAIL SIGNUP
// ==========================================
router.post('/', authValidators.signup, validate, async (req: any, res: any) => {
    const { email, password, name } = req.body;


    // Validation is now handled by middleware

    // 2. Duplicate Check
    const existing = db.getAccountByEmail(email);
    if (existing) {
        return res.status(409).json({ error: 'Email already exists' });
    }

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create Account
    const newAccountId = `user_${Date.now()}`;
    const success = db.createAccount({
        id: newAccountId,
        name,
        email,
        password: hashedPassword,
        type: 'agency', // Default type
        status: 'active', // TODO: Change to 'pending' if approval required
        provider: 'email'
    });

    if (success) {
        // Auto-login after signup
        if (req.session) {
            (req.session as any).accountId = newAccountId;
            (req.session as any).accountType = 'agency';
        }
        res.json({ success: true, accountId: newAccountId });
    } else {
        res.status(500).json({ error: 'Failed to create account' });
    }
});

// ==========================================
// GOOGLE LOGIN (IDENTITY)
// ==========================================
router.get('/google/login', (req, res) => {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const REDIRECT_URI = 'http://localhost:3000/api/auth/google/login/callback';

    // Scope for Identity (Profile, Email) only
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
    const REDIRECT_URI = 'http://localhost:3000/api/auth/google/login/callback';

    if (!code) return res.status(400).send('No code provided');

    try {
        let email = '';
        let name = '';

        // Real Flow
        // 1. Exchange Code for Token
        const { data: tokenData } = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI
        });

        // 2. Get User Info
        const { data: userInfo } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });

        email = userInfo.email;
        name = userInfo.name;

        // 3. Find or Create Account
        let account = db.getAccountByEmail(email);

        if (!account) {
            // Create new account via Google
            const newAccountId = `user_${Date.now()}`;
            const randomPassword = await bcrypt.hash(Math.random().toString(36), 10); // Unusable password

            const success = db.createAccount({
                id: newAccountId,
                name: name,
                email: email,
                password: randomPassword,
                type: 'agency',
                status: 'active',
                provider: 'google'
            });

            if (success) {
                account = db.getAccount(newAccountId);
            } else {
                return res.status(500).send('Failed to create account via Google');
            }
        }

        if (account) {
            // 4. Login (Session)
            if (req.session) {
                (req.session as any).accountId = account.id;
                (req.session as any).accountType = account.type;
            }

            // 5. Redirect to Auth Callback Page
            const encodedName = encodeURIComponent(account.name);
            res.redirect(`http://localhost:3000/auth-callback?role=${account.type}&id=${account.id}&name=${encodedName}&email=${account.email}`);
        } else {
            res.status(500).send('Account creation failed');
        }

    } catch (error) {
        console.error('Error in Google Login:', error);
        res.status(500).send('Google Login Failed');
    }
});

export default router;
