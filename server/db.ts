import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

const DB_PATH = path.join(__dirname, 'database.json');

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

const initializeDB = () => {
    if (!fs.existsSync(DB_PATH)) {
        // 새 DB 생성
        const initialData: DBData = {
            accounts: [],
            accountTokens: [],
            clients: [],
            campaign_budgets: {},
            alerts: [],
            settings: {}
        };
        fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
        console.log('[DB] New database created');
    } else {
        // 기존 DB 마이그레이션
        try {
            const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
            let changed = false;

            // 마이그레이션: 구 구조 → 신 구조
            if (!data.accounts) {
                console.log('[DB] Migrating to multi-tenant structure...');

                // 기본 admin 계정 생성
                const adminPassword = bcrypt.hashSync('1111', 10);
                const adminAccount: Account = {
                    id: 'admin',
                    name: 'System Administrator',
                    type: 'admin',
                    email: 'admin@gmail.com',
                    password: adminPassword,
                    createdAt: new Date().toISOString(),
                    status: 'active',
                    provider: 'email'
                };

                // 기본 테스트 agency 계정 생성
                const agencyPassword = bcrypt.hashSync('1111', 10);
                const agencyAccount: Account = {
                    id: 'agency_test',
                    name: 'Test Agency',
                    type: 'agency',
                    email: 'test@gmail.com',
                    password: agencyPassword,
                    createdAt: new Date().toISOString(),
                    status: 'active',
                    provider: 'email'
                };

                data.accounts = [adminAccount, agencyAccount];
                changed = true;

                // 기존 tokens를 admin 계정으로 이관
                data.accountTokens = [];
                if (data.tokens) {
                    data.accountTokens.push({
                        accountId: 'admin',
                        tokens: data.tokens
                    });
                    delete data.tokens;
                }

                // 기존 clients를 admin 계정으로 이관
                if (data.clients && Array.isArray(data.clients)) {
                    data.clients = data.clients.map((client: any) => ({
                        ...client,
                        accountId: client.accountId || 'admin'
                    }));
                } else {
                    data.clients = [];
                }

                // campaign_budgets는 그대로 유지 (글로벌)
                if (!data.campaign_budgets) {
                    data.campaign_budgets = {};
                }

                // alerts 초기화
                if (!data.alerts) {
                    data.alerts = [];
                }

                // settings는 그대로 유지
                if (!data.settings) {
                    data.settings = {};
                }

                console.log('[DB] Migration complete: created admin and test agency accounts');
            }

            // 기존 계정에 status 필드 없는 경우 마이그레이션
            if (data.accounts) {
                data.accounts.forEach((acc: any) => {
                    if (!acc.status) {
                        acc.status = 'active';
                        acc.provider = acc.provider || 'email';
                        changed = true;
                    }
                });
            }

            // 멀티 토큰 마이그레이션 (기존 단일 토큰 구조 → 배열 구조)
            if (data.accountTokens) {
                data.accountTokens.forEach((at: any) => {
                    // google 토큰이 객체 형태면 배열로 변환
                    if (at.tokens.google && !Array.isArray(at.tokens.google)) {
                        at.tokens.google = [at.tokens.google];
                        changed = true;
                    } else if (!at.tokens.google) {
                        at.tokens.google = [];
                        changed = true;
                    }

                    // meta 토큰이 객체 형태면 배열로 변환
                    if (at.tokens.meta && !Array.isArray(at.tokens.meta)) {
                        at.tokens.meta = [at.tokens.meta];
                        changed = true;
                    } else if (!at.tokens.meta) {
                        at.tokens.meta = [];
                        changed = true;
                    }
                });
            }

            if (changed) {
                fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
                console.log('[DB] Migration: Single token structure migrated to Multi-token array structure');
            }
        } catch (e) {
            console.error('[DB] Migration error:', e);
        }
    }
};

initializeDB();

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
            console.error('[DB] Error reading:', error);
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

    write: (data: DBData) => {
        dbCache = data;

        if (writeTimeout) {
            clearTimeout(writeTimeout);
        }

        writeTimeout = setTimeout(() => {
            try {
                fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
            } catch (error) {
                console.error('[DB] Error writing:', error);
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
    }
};
