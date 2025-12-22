import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';

const router = Router();

// 로그인
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    // 계정 찾기
    const account = db.getAccountByEmail(email);
    if (!account) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 비밀번호 확인
    const isValid = await bcrypt.compare(password, account.password);
    if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 세션에 저장
    if (req.session) {
        (req.session as any).accountId = account.id;
        (req.session as any).accountType = account.type;
    }

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

// 로그아웃
router.post('/logout', (req, res) => {
    req.session?.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true });
    });
});

// 현재 로그인된 계정 정보
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
