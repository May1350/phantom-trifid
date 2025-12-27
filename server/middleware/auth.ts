import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include session and accountId
declare module 'express-serve-static-core' {
    interface Request {
        accountId?: string;
        accountType?: 'admin' | 'agency';
        accountStatus?: 'active' | 'pending' | 'suspended';
    }
}

import { db } from '../db';

// 세션에서 accountId 추출 및 상태 확인
export const extractAccountId = (req: Request, res: Response, next: NextFunction) => {
    if (req.session && (req.session as any).accountId) {
        const accountId = (req.session as any).accountId;
        req.accountId = accountId;
        req.accountType = (req.session as any).accountType;

        // Fetch current status from DB to handle real-time changes
        const account = db.getAccount(accountId);
        if (account) {
            req.accountStatus = account.status;
        }
    }
    next();
};

// 활성 계정인지 확인 (pending, suspended 차단)
export const requireActive = (req: Request, res: Response, next: NextFunction) => {
    if (!req.accountId) {
        return res.status(401).json({ error: 'Unauthorized: Login required' });
    }

    // Treat undefined status as 'active' for legacy compatibility
    if (req.accountStatus && req.accountStatus !== 'active') {
        const message = req.accountStatus === 'pending'
            ? 'Your account is pending approval by an administrator.'
            : 'Your account has been suspended.';
        return res.status(403).json({ error: 'Forbidden: Account not active', message });
    }

    next();
};

// 인증 필수
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.accountId) {
        return res.status(401).json({ error: 'Unauthorized: Login required' });
    }

    // Also enforce active status by default for protected routes
    return requireActive(req, res, next);
};

// 관리자 권한 필수
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.accountId) {
        return res.status(401).json({ error: 'Unauthorized: Login required' });
    }

    if (req.accountType !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    next();
};
