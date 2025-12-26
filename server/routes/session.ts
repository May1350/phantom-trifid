import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { logger, logAuthEvent, logSecurityEvent } from '../utils/logger';
import { authValidators, validate } from '../middleware/validator';

const router = Router();

// Login
router.post('/login', authValidators.login, validate, async (req: any, res: any) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    // Find account
    const accounts = db.getAccounts();
    logger.info(`Login attempt: email=${email}, total_accounts=${accounts.length}`);

    const account = db.getAccountByEmail(email);
    if (!account) {
        logger.warn(`Login failed: Account not found for ${email}. Available emails: ${accounts.map((a: any) => a.email).join(', ')}`);
        logSecurityEvent('login_failed', { email, reason: 'account_not_found', ip: req.ip });
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isValid = await bcrypt.compare(password, account.password);
    if (!isValid) {
        logger.warn(`Login failed: Password mismatch for ${email}`);
        logSecurityEvent('login_failed', { email, reason: 'invalid_password', ip: req.ip });
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check account status
    if (account.status !== 'active') {
        logSecurityEvent('login_blocked', { email, status: account.status, ip: req.ip });
        return res.status(403).json({ error: 'Account is not active. Please contact support.' });
    }

    // Regenerate session to prevent session fixation
    req.session.regenerate((err: any) => {
        if (err) {
            logSecurityEvent('session_regeneration_failed', { email, ip: req.ip });
            return res.status(500).json({ error: 'Login failed. Please try again.' });
        }

        // Save to session
        (req.session as any).accountId = account.id;
        (req.session as any).accountType = account.type;

        logAuthEvent('login_success', { accountId: account.id, email, type: account.type });

        res.json({
            success: true,
            account: {
                id: account.id,
                name: account.name,
                type: account.type,
                email: account.email
            }
        });
    });
});

// Logout
router.post('/logout', (req, res) => {
    const accountId = (req.session as any)?.accountId;

    req.session?.destroy((err) => {
        if (err) {
            logger.error('Logout failed', { error: err.message });
            return res.status(500).json({ error: 'Logout failed' });
        }

        if (accountId) {
            logAuthEvent('logout', { accountId });
        }

        res.json({ success: true });
    });
});

// Get current logged-in account info
router.get('/current', (req, res) => {
    const accountId = (req.session as any)?.accountId;

    if (!accountId) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    const account = db.getAccount(accountId);
    if (!account) {
        return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
        id: account.id,
        name: account.name,
        type: account.type,
        email: account.email
    });
});

export default router;
