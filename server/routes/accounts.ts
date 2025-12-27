import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { requireAdmin } from '../middleware/auth';
import { accountValidators, validate } from '../middleware/validator';

const router = Router();

// 모든 계정 목록 (관리자 전용)
router.get('/', requireAdmin, (req, res) => {
    const accounts = db.getAccounts().map(acc => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        email: acc.email,
        createdAt: acc.createdAt,
        status: acc.status,
        provider: acc.provider
        // password는 제외
    }));
    res.json(accounts);
});

// 특정 계정 정보 (관리자 전용)
router.get('/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const account = db.getAccount(id);

    if (!account) {
        return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
        id: account.id,
        name: account.name,
        type: account.type,
        email: account.email,
        createdAt: account.createdAt
    });
});

// 계정별 통계 (관리자 전용)
router.get('/:id/stats', requireAdmin, (req, res) => {
    const { id } = req.params;
    const account = db.getAccount(id);

    if (!account) {
        return res.status(404).json({ error: 'Account not found' });
    }

    const clients = db.getClients(id);
    const tokens = {
        google: !!db.getToken(id, 'google'),
        meta: !!db.getToken(id, 'meta')
    };

    res.json({
        account: {
            id: account.id,
            name: account.name,
            type: account.type,
            email: account.email
        },
        stats: {
            clientCount: clients.length,
            connectedProviders: tokens
        }
    });
});

// 새 계정 생성 (관리자 전용)
router.post('/', requireAdmin, accountValidators.create, validate, async (req: Request, res: Response) => {
    const { id, name, type, email, password } = req.body;

    // 필수 필드 확인
    if (!id || !name || !type || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // 타입 검증
    if (type !== 'admin' && type !== 'agency') {
        return res.status(400).json({ error: 'Invalid account type' });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 계정 생성
    const success = db.createAccount({
        id,
        name,
        type,
        email,
        password: hashedPassword,
        status: 'active',
        provider: 'email'
    });

    if (!success) {
        return res.status(409).json({ error: 'Account ID or email already exists' });
    }

    res.json({ success: true, accountId: id });
});

// 계정 정보 수정 (관리자 전용)
router.put('/:id', requireAdmin, accountValidators.update, validate, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, email, password, status, type } = req.body;

    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (status) updates.status = status;
    if (type) updates.type = type;
    if (password) {
        updates.password = await bcrypt.hash(password, 10);
    }

    const success = db.updateAccount(id, updates);
    if (!success) {
        return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ success: true });
});

// 계정 삭제 (관리자 전용)
router.delete('/:id', requireAdmin, (req, res) => {
    const { id } = req.params;

    // admin 계정은 삭제 불가
    if (id === 'admin') {
        return res.status(403).json({ error: 'Cannot delete admin account' });
    }

    const success = db.deleteAccount(id);
    if (!success) {
        return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ success: true });
});

export default router;
