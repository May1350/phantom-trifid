import { Router } from 'express';
import { db } from '../db';
import { runDailyAlertCheck } from '../alert-checker';

const router = Router();

// ==========================================
// GET /api/alerts - 알람 목록 조회
// ==========================================
router.get('/', (req, res) => {
    const accountId = req.accountId || 'admin';
    const unreadOnly = req.query.unreadOnly === 'true';

    const alerts = db.getAlerts(accountId, unreadOnly);
    res.json(alerts);
});

// ==========================================
// POST /api/alerts/:id/read - 알람 읽음 처리
// ==========================================
router.post('/:id/read', (req, res) => {
    const { id } = req.params;
    const success = db.markAlertAsRead(id);

    if (success) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Alert not found' });
    }
});

// ==========================================
// DELETE /api/alerts/:id - 알람 삭제
// ==========================================
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const success = db.deleteAlert(id);

    if (success) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Alert not found' });
    }
});

// ==========================================
// POST /api/alerts/check - 수동 알람 체크 (테스트용)
// ==========================================
router.post('/check', async (req, res) => {
    console.log('[API] Manual alert check triggered');

    try {
        await runDailyAlertCheck();
        res.json({ success: true, message: 'Alert check completed' });
    } catch (error) {
        console.error('[API] Error during alert check:', error);
        res.status(500).json({ error: 'Alert check failed' });
    }
});

export default router;
