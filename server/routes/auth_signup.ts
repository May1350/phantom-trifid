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

});

export default router;
