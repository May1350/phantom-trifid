import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import authRoutes from './routes/auth';
import dataRoutes from './routes/data';
import sessionRoutes from './routes/session';
import accountsRoutes from './routes/accounts';
import alertsRoutes from './routes/alerts';
import authSignupRoutes from './routes/auth_signup';
import { extractAccountId, requireAuth } from './middleware/auth';
import cron from 'node-cron';
import { runDailyAlertCheck } from './alert-checker';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// 세션 설정
app.use(session({
    secret: process.env.SESSION_SECRET || 'phantom-trifid-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // HTTPS가 아니므로 false
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7일
    }
}));

// 모든 요청에서 accountId 추출
app.use(extractAccountId);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', authSignupRoutes); // Merges with existing authRoutes if paths differ, or use specific path
app.use('/api/session', sessionRoutes);
app.use('/api/accounts', requireAuth, accountsRoutes);
app.use('/api/data', requireAuth, dataRoutes);
app.use('/api/alerts', requireAuth, alertsRoutes);

app.get('/', (req, res) => {
    res.send('Phantom Trifid Backend is running');
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
    console.error('Error occurred:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).send('Internal Server Error: ' + err.message);
});

// 매일 자정에 알람 체크 실행 (한국 시간 기준, cron은 서버 시간 기준으로 실행)
cron.schedule('0 0 * * *', () => {
    console.log('[CRON] Running daily alert check...');
    runDailyAlertCheck();
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('[Scheduler] Daily alert check scheduled at 00:00');
});
