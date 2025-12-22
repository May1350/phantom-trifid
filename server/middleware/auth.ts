import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include session and accountId
declare module 'express-serve-static-core' {
    interface Request {
        accountId?: string;
        accountType?: 'admin' | 'agency';
    }
}

// 세션에서 accountId 추출
export const extractAccountId = (req: Request, res: Response, next: NextFunction) => {
    if (req.session && (req.session as any).accountId) {
        req.accountId = (req.session as any).accountId;
        req.accountType = (req.session as any).accountType;
    }
    next();
};

// 인증 필수
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.accountId) {
        return res.status(401).json({ error: 'Unauthorized: Login required' });
    }
    next();
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
