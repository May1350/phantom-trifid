import fs from 'fs-extra';
import path from 'path';
import bcrypt from 'bcrypt';
import { logger, logError } from './utils/logger';

const DB_DIR = process.env.DATA_DIR || __dirname;
// Ensure directory exists if using a custom path
if (process.env.DATA_DIR) {
    fs.ensureDirSync(process.env.DATA_DIR);
}
const DB_PATH = path.join(DB_DIR, 'database.json');

// ==========================================
// TYPE DEFINITIONS
// ==========================================

interface TokenData {
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
    // Metadata for identifying the account
    email?: string;
    name?: string;
}

interface Account {
    id: string;           // 고유 계정 ID
    name: string;         // 계정 이름
    type: 'admin' | 'agency';
    email: string;        // 로그인 이메일
    password: string;     // 해시된 비밀번호
    createdAt: string;    // 생성 일시
    status: 'active' | 'pending' | 'suspended'; // 계정 상태
    provider?: 'email' | 'google'; // 가입 경로
}

interface AccountTokens {
    accountId: string;
    tokens: {
        google: TokenData[]; // Changed from optional single to required array
        meta: TokenData[];   // Changed from optional single to required array
    };
}

interface Client {
    id: string;
    accountId: string;    // 이 클라이언트가 속한 계정 ID
    tokenEmail?: string;  // 이 클라이언트가 어떤 연동 계정(이메일)에 속해 있는지 식별
    name: string;
    provider: 'google' | 'meta';
    status?: string;
    commission?: {
        type: 'fixed' | 'percentage';
        value: number;
    };
}

interface BudgetPeriod {
    startDate: string;
    endDate: string;
    amount: number;
}

interface BudgetHistoryItem {
    timestamp: string;
    type: 'recurring' | 'fixed';
    amount: number;
    period: string;
    user?: string;
}

interface CampaignBudgetConfig {
    id: string;
    type: 'recurring' | 'fixed';
    periods: BudgetPeriod[];
    history?: BudgetHistoryItem[];
    rawConfig?: any;
}

interface Alert {
    id: string;
    accountId: string;
    campaignId: string;
    campaignName: string;
    type: 'daily_budget_over' | 'daily_budget_under' | 'progress_mismatch_over' | 'progress_mismatch_under' | 'campaign_ending' | 'budget_almost_exhausted' | 'budget_not_set';
    severity: 'high' | 'medium' | 'low';
    message: string;
    metadata: {
        dailyBudget?: number;
        yesterdaySpend?: number;
        periodProgress?: number;
        budgetProgress?: number;
        daysLeft?: number;
        spendRate?: number;
    };
    isRead: boolean;
    createdAt: string;
}

interface DBData {
    accounts: Account[];
    accountTokens: AccountTokens[];
    clients: Client[];
    campaign_budgets: Record<string, CampaignBudgetConfig>;
    alerts: Alert[];
    settings: {
        selected_account_id?: string;
    };
    cache?: {
        [accountId: string]: {
            [key: string]: {
                data: any;
                updatedAt: string;
            }
        }
    };
}

// ==========================================
// MEMORY CACHE
// ==========================================

let dbCache: DBData | null = null;
let writeTimeout: NodeJS.Timeout | null = null;
const WRITE_DEBOUNCE_MS = 100;

// ==========================================
// INITIALIZATION & MIGRATION
// ==========================================

const initializeDBSync = () => {
    try {
        let needsInit = false;
        let data: DBData | null = null;

        // 1. Try to load existing DB
        if (fs.existsSync(DB_PATH)) {
            try {
                const dataStr = fs.readFileSync(DB_PATH, 'utf-8');
                data = JSON.parse(dataStr);

                // Basic structural validation
                if (!data || !Array.isArray(data.accounts)) {
                    throw new Error("Invalid DB structure: missing accounts array");
                }

                // Smart Recovery: Check if DB seems to have been reset (empty lists) while backup has data
                if (fs.existsSync(`${DB_PATH}.backup`)) {
                    try {
                        const backupStr = fs.readFileSync(`${DB_PATH}.backup`, 'utf-8');
                        const backupData = JSON.parse(backupStr);

                        // Indicators of data: tokens, clients, or campaign budgets
                        const currentHasData = (data.accountTokens?.length || 0) > 0 || (data.clients?.length || 0) > 0 || Object.keys(data.campaign_budgets || {}).length > 0;
                        const backupHasData = (backupData.accountTokens?.length || 0) > 0 || (backupData.clients?.length || 0) > 0 || Object.keys(backupData.campaign_budgets || {}).length > 0;

                        if (!currentHasData && backupHasData) {
                            logger.warn('Detected potential data loss (clean DB but populated backup). Restoring from backup...');
                            data = backupData;
                            // Immediately persist the restored data
                            fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
                            logger.info('Successfully restored database from backup');
                        }
                    } catch (backupCheckError) {
                        logger.warn('Failed to check backup for smart recovery', { error: (backupCheckError as Error).message });
                    }
                }
            } catch (parseError) {
                logger.error('Failed to parse database.json', { error: (parseError as Error).message });
                // Rename corrupt file for investigation
                const corruptPath = `${DB_PATH}.corrupt.${Date.now()}`;
                fs.copySync(DB_PATH, corruptPath);
                logger.warn(`Corrupt DB preserved at ${corruptPath}`);
                data = null; // Trigger recovery
            }
        }

        // 2. Recovery from backup if main DB is missing or invalid
        if (!data && fs.existsSync(`${DB_PATH}.backup`)) {
            try {
                logger.warn('Attempting to restore from backup...');
                const backupStr = fs.readFileSync(`${DB_PATH}.backup`, 'utf-8');
                const backupData = JSON.parse(backupStr);

                if (backupData && Array.isArray(backupData.accounts)) {
                    data = backupData;
                    // Restore physical file
                    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
                    logger.info('Successfully restored database from backup');
                }
            } catch (backupError) {
                logger.error('Failed to recover from backup', { error: (backupError as Error).message });
            }
        }

        // 3. Initialize if still no data
        if (!data) {
            logger.info('Initializing new database...');
            const adminPassword = bcrypt.hashSync('1111', 10);
            const agencyPassword = bcrypt.hashSync('1111', 10);

            data = {
                accounts: [
                    {
                        id: 'admin',
                        name: 'System Administrator',
                        type: 'admin',
                        email: 'admin@gmail.com',
                        password: adminPassword,
                        createdAt: new Date().toISOString(),
                        status: 'active',
                        provider: 'email'
                    },
                    {
                        id: 'agency_test',
                        name: 'Test Agency',
                        type: 'agency',
                        email: 'test@gmail.com',
                        password: agencyPassword,
                        createdAt: new Date().toISOString(),
                        status: 'active',
                        provider: 'email'
                    },
                    {
                        id: 'agency_guntak',
                        name: 'Takgun',
                        type: 'agency',
                        email: 'takgun.jr@gmail.com',
                        password: agencyPassword,
                        createdAt: new Date().toISOString(),
                        status: 'active',
                        provider: 'google'
                    }
                ],
                accountTokens: [],
                clients: [],
                campaign_budgets: {},
                alerts: [],
                settings: {}
            };
            fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        }

        // 4. Migration & Seeding (safe merge)
        let changed = false;

        // Ensure accounts list is seeded if empty or missing admin
        const adminExists = data.accounts && data.accounts.find(a => a.email === 'admin@gmail.com');

        if (!data.accounts || data.accounts.length === 0 || !adminExists) {
            logger.info('[DB] Seeding missing default accounts into existing DB...');
            const adminPassword = bcrypt.hashSync('1111', 10);
            // ... (rest of seeding logic is fine, relying on unique check)
            const agencyPassword = bcrypt.hashSync('1111', 10);

            const defaultAccounts: Account[] = [
                {
                    id: 'admin',
                    name: 'System Administrator',
                    type: 'admin',
                    email: 'admin@gmail.com',
                    password: adminPassword,
                    createdAt: new Date().toISOString(),
                    status: 'active',
                    provider: 'email'
                },
                {
                    id: 'agency_test',
                    name: 'Test Agency',
                    type: 'agency',
                    email: 'test@gmail.com',
                    password: agencyPassword,
                    createdAt: new Date().toISOString(),
                    status: 'active',
                    provider: 'email'
                },
                {
                    id: 'agency_guntak',
                    name: 'Takgun',
                    type: 'agency',
                    email: 'takgun.jr@gmail.com',
                    password: agencyPassword,
                    createdAt: new Date().toISOString(),
                    status: 'active',
                    provider: 'google'
                }
            ];

            if (!data.accounts) {
                data.accounts = defaultAccounts;
            } else if (!adminExists) {
                // Only add if not exists
                defaultAccounts.forEach(da => {
                    if (!data!.accounts.find(a => a.email === da.email)) {
                        data!.accounts.push(da);
                    }
                });
            }
            changed = true;
        }

        // Migration from old structure
        if (!(data as any).accounts_old_check_done) {
            (data as any).accounts_old_check_done = true;
            changed = true;
        }

        if (changed) {
            fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
            logger.info('Database migrated/seeded successfully');
        }

    } catch (e) {
        logger.error('Critical failure in initializeDBSync', { error: (e as Error).message });
    }
};

// Immediately execute synchronusly to ensure DB is ready for imports
initializeDBSync();

// ==========================================
// CORE DB OPERATIONS
// ==========================================

export const db = {
    read: (): DBData => {
        if (dbCache) {
            return dbCache;
        }

        try {
            const data = fs.readFileSync(DB_PATH, 'utf-8');
            dbCache = JSON.parse(data);
            return dbCache!;
        } catch (error) {
            logError(error as Error, { operation: 'db.read', dbPath: DB_PATH });
            dbCache = {
                accounts: [],
                accountTokens: [],
                clients: [],
                campaign_budgets: {},
                alerts: [],
                settings: {}
            };
            return dbCache;
        }
    },

    write: async (data: DBData): Promise<void> => {
        dbCache = data;

        if (writeTimeout) {
            clearTimeout(writeTimeout);
        }

        writeTimeout = setTimeout(async () => {
            const tempPath = `${DB_PATH}.tmp`;
            const backupPath = `${DB_PATH}.backup`;

            try {
                // 1. Write to temporary file first
                await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');

                // 2. Backup existing file if it exists
                if (await fs.pathExists(DB_PATH)) {
                    // Rotate existing backup if present
                    if (await fs.pathExists(backupPath)) {
                        await fs.copy(backupPath, `${backupPath}.old`, { overwrite: true });
                    }
                    await fs.copy(DB_PATH, backupPath, { overwrite: true });
                }

                // 3. Atomic move: replace original with temp file
                await fs.move(tempPath, DB_PATH, { overwrite: true });

                logger.debug('DB saved successfully');
            } catch (error) {
                logError(error as Error, { operation: 'db.write', dbPath: DB_PATH });

                // Clean up temp file if it exists
                await fs.remove(tempPath).catch(() => { });

                // Attempt to restore from backup
                if (await fs.pathExists(backupPath)) {
                    try {
                        await fs.copy(backupPath, DB_PATH, { overwrite: true });
                        logger.warn('DB write failed, restored from backup');
                    } catch (restoreError) {
                        logError(restoreError as Error, { operation: 'db.restore' });
                    }
                }
            }
            writeTimeout = null;
        }, WRITE_DEBOUNCE_MS);
    },

    // ==========================================
    // ACCOUNT MANAGEMENT
    // ==========================================

    getAccounts: (): Account[] => {
        const data = db.read();
        return data.accounts || [];
    },

    getAccount: (accountId: string): Account | undefined => {
        const data = db.read();
        return data.accounts?.find(acc => acc.id === accountId);
    },

    getAccountByEmail: (email: string): Account | undefined => {
        const data = db.read();
        return data.accounts?.find(acc => acc.email === email);
    },

    createAccount: (account: Omit<Account, 'createdAt'>): boolean => {
        const data = db.read();

        // 중복 체크
        if (data.accounts.find(acc => acc.id === account.id || acc.email === account.email)) {
            return false;
        }

        const newAccount: Account = {
            ...account,
            createdAt: new Date().toISOString()
        };

        data.accounts.push(newAccount);
        db.write(data);
        return true;
    },

    updateAccount: (accountId: string, updates: Partial<Account>): boolean => {
        const data = db.read();
        const account = data.accounts.find(acc => acc.id === accountId);

        if (!account) {
            return false;
        }

        Object.assign(account, updates);
        db.write(data);
        return true;
    },

    deleteAccount: (accountId: string): boolean => {
        const data = db.read();
        const index = data.accounts.findIndex(acc => acc.id === accountId);

        if (index === -1) {
            return false;
        }

        // 계정 삭제
        data.accounts.splice(index, 1);

        // 관련 데이터 삭제
        data.accountTokens = data.accountTokens.filter(at => at.accountId !== accountId);
        data.clients = data.clients.filter(c => c.accountId !== accountId);

        db.write(data);
        return true;
    },

    // ==========================================
    // TOKEN MANAGEMENT (ACCOUNT-SCOPED, MULTI-TOKEN SUPPORT)
    // ==========================================

    getTokens: (accountId: string, provider: 'google' | 'meta'): TokenData[] => {
        const data = db.read();
        const accountToken = data.accountTokens?.find(at => at.accountId === accountId);
        if (!accountToken || !accountToken.tokens[provider]) return [];
        return accountToken.tokens[provider];
    },

    // Single token getter (deprecated, but keeping for compatibility - returns first token)
    getToken: (accountId: string, provider: 'google' | 'meta'): TokenData | undefined => {
        const tokens = db.getTokens(accountId, provider);
        return tokens.length > 0 ? tokens[0] : undefined;
    },

    setToken: (accountId: string, provider: 'google' | 'meta', tokenData: TokenData) => {
        const data = db.read();
        let accountToken = data.accountTokens?.find(at => at.accountId === accountId);

        if (!accountToken) {
            accountToken = {
                accountId,
                tokens: {
                    google: [],
                    meta: []
                }
            };
            data.accountTokens.push(accountToken);
        }

        // Provider array initialization if missing (should be handled by initialization/migration but for safety)
        if (!accountToken.tokens[provider]) {
            accountToken.tokens[provider] = [];
        }

        // email을 기준으로 기존 토큰 업데이트 또는 새 토큰 추가
        const existingIndex = accountToken.tokens[provider].findIndex(t => t.email === tokenData.email);
        if (existingIndex !== -1) {
            accountToken.tokens[provider][existingIndex] = {
                ...accountToken.tokens[provider][existingIndex],
                ...tokenData
            };
        } else {
            accountToken.tokens[provider].push(tokenData);
        }

        db.write(data);
    },

    removeToken: (accountId: string, provider: 'google' | 'meta', email?: string) => {
        const data = db.read();
        const accountToken = data.accountTokens?.find(at => at.accountId === accountId);

        if (accountToken && accountToken.tokens[provider]) {
            if (email) {
                // 특정 이메일 토큰만 삭제
                accountToken.tokens[provider] = accountToken.tokens[provider].filter(t => t.email !== email);
            } else {
                // 모든 토큰 삭제 (초기화)
                accountToken.tokens[provider] = [];
            }
            db.write(data);
        }
    },

    // ==========================================
    // SETTINGS (DEPRECATED - keeping for compatibility)
    // ==========================================

    getSelectedAccount: () => {
        const data = db.read();
        return data.settings.selected_account_id;
    },

    setSelectedAccount: (accountId: string) => {
        const data = db.read();
        data.settings.selected_account_id = accountId;
        db.write(data);
    },

    // ==========================================
    // CLIENT MANAGEMENT (ACCOUNT-SCOPED)
    // ==========================================

    getClients: (accountId?: string): Client[] => {
        const data = db.read();
        const clients = data.clients || [];

        if (accountId) {
            return clients.filter(c => c.accountId === accountId);
        }

        return clients;
    },

    addClient: (client: Client) => {
        const data = db.read();
        if (!data.clients) data.clients = [];

        // accountId 필수
        if (!client.accountId) {
            throw new Error('Client must have accountId');
        }

        // 중복 방지
        if (!data.clients.find(c => c.id === client.id && c.accountId === client.accountId)) {
            data.clients.push(client);
            db.write(data);
        }
    },

    removeClient: (clientId: string, accountId?: string) => {
        const data = db.read();
        if (data.clients) {
            if (accountId) {
                // 특정 계정의 클라이언트만 삭제
                data.clients = data.clients.filter(c => !(c.id === clientId && c.accountId === accountId));
            } else {
                // 모든 계정에서 해당 ID 삭제 (관리자 권한)
                data.clients = data.clients.filter(c => c.id !== clientId);
            }
            db.write(data);
        }
    },

    // ==========================================
    // CLIENT COMMISSION (ACCOUNT-SCOPED)
    // ==========================================

    setClientCommission: (
        clientId: string,
        commission: { type: 'fixed' | 'percentage'; value: number },
        accountId?: string
    ) => {
        const data = db.read();
        if (data.clients) {
            const client = data.clients.find(c => {
                if (accountId) {
                    return c.id === clientId && c.accountId === accountId;
                }
                return c.id === clientId;
            });

            if (client) {
                client.commission = commission;
                db.write(data);
                return true;
            }
        }
        return false;
    },

    getClientCommission: (clientId: string, accountId?: string) => {
        const data = db.read();
        if (data.clients) {
            const client = data.clients.find(c => {
                if (accountId) {
                    return c.id === clientId && c.accountId === accountId;
                }
                return c.id === clientId;
            });
            return client?.commission;
        }
        return undefined;
    },

    // ==========================================
    // CAMPAIGN BUDGET (GLOBAL)
    // ==========================================

    getCampaignBudget: (campaignId: string): CampaignBudgetConfig | undefined => {
        const data = db.read();
        return data.campaign_budgets?.[campaignId];
    },

    setCampaignBudget: (config: CampaignBudgetConfig) => {
        const data = db.read();
        if (!data.campaign_budgets) data.campaign_budgets = {};
        data.campaign_budgets[config.id] = config;
        db.write(data);
    },

    // ==========================================
    // ALERT MANAGEMENT (ACCOUNT-SCOPED)
    // ==========================================

    getAlerts: (accountId?: string, unreadOnly?: boolean): Alert[] => {
        const data = db.read();
        let alerts = data.alerts || [];

        if (accountId) {
            alerts = alerts.filter(a => a.accountId === accountId);
        }

        if (unreadOnly) {
            alerts = alerts.filter(a => !a.isRead);
        }

        // 최신순 정렬
        return alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    addAlert: (alert: Omit<Alert, 'id' | 'createdAt'>): Alert => {
        const data = db.read();
        if (!data.alerts) data.alerts = [];

        const newAlert: Alert = {
            ...alert,
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString()
        };

        data.alerts.push(newAlert);
        db.write(data);
        return newAlert;
    },

    markAlertAsRead: (alertId: string): boolean => {
        const data = db.read();
        const alert = data.alerts?.find(a => a.id === alertId);

        if (!alert) {
            return false;
        }

        alert.isRead = true;
        db.write(data);
        return true;
    },

    deleteAlert: (alertId: string): boolean => {
        const data = db.read();
        const index = data.alerts?.findIndex(a => a.id === alertId);

        if (index === undefined || index === -1) {
            return false;
        }

        data.alerts.splice(index, 1);
        db.write(data);
        return true;
    },

    // 중복 알람 체크 (같은 캠페인, 같은 타입, 같은 날짜)
    hasRecentAlert: (accountId: string, campaignId: string, type: Alert['type'], hoursAgo: number = 24): boolean => {
        const data = db.read();
        const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

        return data.alerts?.some(a =>
            a.accountId === accountId &&
            a.campaignId === campaignId &&
            a.type === type &&
            new Date(a.createdAt) > cutoffTime
        ) || false;
    },

    // ==========================================
    // CACHE MANAGEMENT
    // ==========================================

    getCache: (accountId: string, key: string): any => {
        const data = db.read();
        return data.cache?.[accountId]?.[key]?.data || null;
    },

    setCache: (accountId: string, key: string, value: any) => {
        const data = db.read();
        if (!data.cache) data.cache = {};
        if (!data.cache[accountId]) data.cache[accountId] = {};

        data.cache[accountId][key] = {
            data: value,
            updatedAt: new Date().toISOString()
        };
        db.write(data);
    }
};
