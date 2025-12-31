import { db } from './db';
import axios from 'axios';

// Helper: Get overlap days between two ranges
const getOverlapDays = (s1: string, e1: string, s2: string, e2: string) => {
    const start1 = new Date(s1);
    const end1 = new Date(e1);
    const start2 = new Date(s2);
    const end2 = new Date(e2);

    start1.setUTCHours(0, 0, 0, 0);
    end1.setUTCHours(0, 0, 0, 0);
    start2.setUTCHours(0, 0, 0, 0);
    end2.setUTCHours(0, 0, 0, 0);

    const start = start1 > start2 ? start1 : start2;
    const end = end1 < end2 ? end1 : end2;

    if (start > end) return 0;

    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// Helper: Get total days in range
const getTotalDays = (s: string, e: string) => {
    const start = new Date(s);
    const end = new Date(e);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

// Helper: Get yesterday's date (YYYY-MM-DD)
const getYesterdayDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
};

// Helper: Get today's date (YYYY-MM-DD)
const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
};

/**
 * Helper to get the correct token for a client
 */
const getClientToken = (accountId: string, client: any) => {
    const provider = client.provider === 'meta' ? 'meta' : 'google';
    const tokens = db.getTokens(accountId, provider);
    if (tokens.length === 0) return null;

    if (client.tokenEmail) {
        return tokens.find(t => t.email === client.tokenEmail) || tokens[0];
    }
    return tokens[0];
};

// ==========================================
// 규칙 #1: 일 예산 초과/미달 체크
// ==========================================
export const checkDailyBudgetAlerts = async () => {
    console.log('[Alert Checker] Checking daily budget alerts...');

    const accounts = db.getAccounts();
    const yesterdayStr = getYesterdayDate();

    for (const account of accounts) {
        if (account.type !== 'agency') continue;

        const settings = db.getAlertSettings(account.id);

        const clients = db.getClients(account.id);

        for (const client of clients) {
            const token = getClientToken(account.id, client);
            if (!token) continue;

            // Meta-specific check
            if (client.provider === 'meta' && client.id.startsWith('act_')) {
                try {
                    const timeRange = JSON.stringify({ since: yesterdayStr, until: yesterdayStr });
                    const insightsField = `insights.time_range(${timeRange}).time_increment(1){spend,date_start,date_stop}`;

                    const campaignsRes = await axios.get(`https://graph.facebook.com/v17.0/${client.id}/campaigns`, {
                        params: {
                            fields: `id,name,status,daily_budget,adsets{daily_budget,status},${insightsField}`,
                            access_token: token.access_token
                        }
                    });

                    for (const camp of campaignsRes.data.data) {
                        if (camp.status !== 'ACTIVE') continue;

                        let dailyBudget = parseFloat(camp.daily_budget || 0);
                        if (!dailyBudget) {
                            const adSets = camp.adsets?.data || [];
                            dailyBudget = adSets
                                .filter((as: any) => as.status === 'ACTIVE')
                                .reduce((sum: number, as: any) => sum + parseFloat(as.daily_budget || 0), 0);
                        }

                        const insights = camp.insights?.data || [];
                        const yesterdaySpend = insights.reduce((acc: number, day: any) => acc + parseFloat(day.spend || 0), 0);

                        if (dailyBudget === 0) continue;

                        const diff = Math.abs(yesterdaySpend - dailyBudget);
                        const diffPercent = (diff / dailyBudget) * 100;

                        if (diffPercent > settings.dailyBudgetThreshold) {
                            const alertType = yesterdaySpend > dailyBudget * (1 + settings.dailyBudgetThreshold / 100) ? 'daily_budget_over' : 'daily_budget_under';

                            if (!settings.enabledTypes.includes(alertType)) continue;
                            if (db.hasRecentAlert(account.id, camp.id, alertType, 24)) continue;

                            const message = yesterdaySpend > dailyBudget * (1 + settings.dailyBudgetThreshold / 100)
                                ? `⚠️ 일 예산 초과: 전일 소화 금액이 설정 예산보다 ${diffPercent.toFixed(1)}% 높습니다.`
                                : `⚡ 일 예산 미달: 전일 소화 금액이 설정 예산보다 ${diffPercent.toFixed(1)}% 낮습니다.`;

                            db.addAlert({
                                accountId: account.id,
                                campaignId: camp.id,
                                campaignName: camp.name,
                                type: alertType,
                                severity: 'high',
                                message,
                                metadata: { dailyBudget, yesterdaySpend },
                                isRead: false
                            });
                        }
                    }
                } catch (error) {
                    console.error(`[Alert Checker] Error checking daily budget for client ${client.id}:`, error);
                }
            }
        }
    }
};

// ==========================================
// 규칙 #2: 기간-예산 진척 불균형 체크
// ==========================================
export const checkProgressMismatchAlerts = async () => {
    console.log('[Alert Checker] Checking progress mismatch alerts...');

    const accounts = db.getAccounts();
    const todayStr = getTodayDate();
    const today = new Date(todayStr);

    for (const account of accounts) {
        if (account.type !== 'agency') continue;

        const settings = db.getAlertSettings(account.id);
        const clients = db.getClients(account.id);

        for (const client of clients) {
            const token = getClientToken(account.id, client);
            if (!token) continue;

            if (client.provider === 'meta' && client.id.startsWith('act_')) {
                try {
                    const campaignsRes = await axios.get(`https://graph.facebook.com/v17.0/${client.id}/campaigns`, {
                        params: {
                            fields: 'id,name,status',
                            access_token: token.access_token
                        }
                    });

                    for (const camp of campaignsRes.data.data) {
                        if (camp.status !== 'ACTIVE') continue;

                        const budgetConfig = db.getCampaignBudget(camp.id);
                        if (!budgetConfig || !budgetConfig.periods || budgetConfig.periods.length === 0) continue;

                        const activePeriod = budgetConfig.periods.find(p => {
                            const start = new Date(p.startDate);
                            const end = new Date(p.endDate);
                            return today >= start && today <= end;
                        });

                        if (!activePeriod) continue;

                        const totalDays = getTotalDays(activePeriod.startDate, activePeriod.endDate);
                        const elapsedDays = getTotalDays(activePeriod.startDate, todayStr);
                        const periodProgress = (elapsedDays / totalDays) * 100;

                        const timeRange = JSON.stringify({ since: activePeriod.startDate, until: todayStr });
                        const insightsField = `insights.time_range(${timeRange}){spend}`;

                        const campDetailRes = await axios.get(`https://graph.facebook.com/v17.0/${camp.id}`, {
                            params: {
                                fields: insightsField,
                                access_token: token.access_token
                            }
                        });

                        const totalSpend = parseFloat(campDetailRes.data.insights?.data?.[0]?.spend || 0);
                        const budgetProgress = (totalSpend / activePeriod.amount) * 100;

                        const progressDiff = Math.abs(budgetProgress - periodProgress);

                        if (progressDiff > settings.progressMismatchThreshold) {
                            const alertType = budgetProgress > periodProgress + settings.progressMismatchThreshold
                                ? 'progress_mismatch_over'
                                : 'progress_mismatch_under';

                            if (!settings.enabledTypes.includes(alertType)) continue;
                            if (db.hasRecentAlert(account.id, camp.id, alertType, 24)) continue;

                            const message = budgetProgress > periodProgress + settings.progressMismatchThreshold
                                ? `🔴 예산 소진 과다: 예산 진척률(${budgetProgress.toFixed(1)}%)이 기간 진척률(${periodProgress.toFixed(1)}%)보다 ${progressDiff.toFixed(1)}% 높습니다.`
                                : `🟡 예산 소진 부족: 예산 진척률(${budgetProgress.toFixed(1)}%)이 기간 진척률(${periodProgress.toFixed(1)}%)보다 ${progressDiff.toFixed(1)}% 낮습니다.`;

                            db.addAlert({
                                accountId: account.id,
                                campaignId: camp.id,
                                campaignName: camp.name,
                                type: alertType,
                                severity: 'high',
                                message,
                                metadata: { periodProgress, budgetProgress },
                                isRead: false
                            });
                        }
                    }
                } catch (error) {
                    console.error(`[Alert Checker] Error checking progress mismatch for client ${client.id}:`, error);
                }
            }
        }
    }
};

// ==========================================
// 규칙 #3: 예산 종료 임박 알람
// ==========================================
export const checkCampaignEndingAlerts = async () => {
    console.log('[Alert Checker] Checking campaign ending alerts...');

    const accounts = db.getAccounts();
    const todayStr = getTodayDate();
    const today = new Date(todayStr);

    for (const account of accounts) {
        if (account.type !== 'agency') continue;

        const settings = db.getAlertSettings(account.id);
        const clients = db.getClients(account.id);

        for (const client of clients) {
            const token = getClientToken(account.id, client);
            if (!token) continue;

            if (client.provider === 'meta' && client.id.startsWith('act_')) {
                try {
                    const campaignsRes = await axios.get(`https://graph.facebook.com/v17.0/${client.id}/campaigns`, {
                        params: {
                            fields: 'id,name,status',
                            access_token: token.access_token
                        }
                    });

                    for (const camp of campaignsRes.data.data) {
                        if (camp.status !== 'ACTIVE') continue;

                        const budgetConfig = db.getCampaignBudget(camp.id);
                        if (!budgetConfig || !budgetConfig.periods || budgetConfig.periods.length === 0) continue;

                        const activePeriod = budgetConfig.periods.find(p => {
                            const start = new Date(p.startDate);
                            const end = new Date(p.endDate);
                            return today >= start && today <= end;
                        });

                        if (!activePeriod) continue;

                        const periodEnd = new Date(activePeriod.endDate);
                        const daysLeft = Math.ceil((periodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                        if (daysLeft <= 7 && daysLeft > 0) {
                            const timeRange = JSON.stringify({ since: activePeriod.startDate, until: todayStr });
                            const insightsField = `insights.time_range(${timeRange}){spend}`;

                            const campDetailRes = await axios.get(`https://graph.facebook.com/v17.0/${camp.id}`, {
                                params: {
                                    fields: insightsField,
                                    access_token: token.access_token
                                }
                            });

                            const totalSpend = parseFloat(campDetailRes.data.insights?.data?.[0]?.spend || 0);
                            const spendRate = (totalSpend / activePeriod.amount) * 100;

                            if (spendRate < 80) {
                                if (!settings.enabledTypes.includes('campaign_ending')) continue;
                                if (db.hasRecentAlert(account.id, camp.id, 'campaign_ending', 24)) continue;

                                const message = `📅 캠페인 종료 임박: ${daysLeft}일 남았으나 예산 소진율이 ${spendRate.toFixed(1)}%입니다.`;

                                db.addAlert({
                                    accountId: account.id,
                                    campaignId: camp.id,
                                    campaignName: camp.name,
                                    type: 'campaign_ending',
                                    severity: 'medium',
                                    message,
                                    metadata: { daysLeft, spendRate },
                                    isRead: false
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error(`[Alert Checker] Error checking campaign ending for client ${client.id}:`, error);
                }
            }
        }
    }
};

// ==========================================
// 규칙 #4: 예산 소진 95% 이상 알람
// ==========================================
export const checkBudgetExhaustedAlerts = async () => {
    console.log('[Alert Checker] Checking budget exhausted alerts...');

    const accounts = db.getAccounts();
    const todayStr = getTodayDate();
    const today = new Date(todayStr);

    for (const account of accounts) {
        if (account.type !== 'agency') continue;

        const settings = db.getAlertSettings(account.id);
        const clients = db.getClients(account.id);

        for (const client of clients) {
            const token = getClientToken(account.id, client);
            if (!token) continue;

            if (client.provider === 'meta' && client.id.startsWith('act_')) {
                try {
                    const campaignsRes = await axios.get(`https://graph.facebook.com/v17.0/${client.id}/campaigns`, {
                        params: {
                            fields: 'id,name,status',
                            access_token: token.access_token
                        }
                    });

                    for (const camp of campaignsRes.data.data) {
                        if (camp.status !== 'ACTIVE') continue;

                        const budgetConfig = db.getCampaignBudget(camp.id);
                        if (!budgetConfig || !budgetConfig.periods || budgetConfig.periods.length === 0) continue;

                        const activePeriod = budgetConfig.periods.find(p => {
                            const start = new Date(p.startDate);
                            const end = new Date(p.endDate);
                            return today >= start && today <= end;
                        });

                        if (!activePeriod) continue;

                        const timeRange = JSON.stringify({ since: activePeriod.startDate, until: todayStr });
                        const insightsField = `insights.time_range(${timeRange}){spend}`;

                        const campDetailRes = await axios.get(`https://graph.facebook.com/v17.0/${camp.id}`, {
                            params: {
                                fields: insightsField,
                                access_token: token.access_token
                            }
                        });

                        const totalSpend = parseFloat(campDetailRes.data.insights?.data?.[0]?.spend || 0);
                        const spendRate = (totalSpend / activePeriod.amount) * 100;

                        if (spendRate >= settings.exhaustionThreshold) {
                            if (!settings.enabledTypes.includes('budget_almost_exhausted')) continue;
                            if (db.hasRecentAlert(account.id, camp.id, 'budget_almost_exhausted', 24)) continue;

                            const message = `🚨 예산 소진 ${spendRate.toFixed(1)}% - 캠페인이 곧 중지될 수 있습니다.`;

                            db.addAlert({
                                accountId: account.id,
                                campaignId: camp.id,
                                campaignName: camp.name,
                                type: 'budget_almost_exhausted',
                                severity: 'high',
                                message,
                                metadata: { spendRate },
                                isRead: false
                            });
                        }
                    }
                } catch (error) {
                    console.error(`[Alert Checker] Error checking budget exhausted for client ${client.id}:`, error);
                }
            }
        }
    }
};

// ==========================================
// 규칙 #5: 예산 미설정 캠페인 알람
// ==========================================
export const checkBudgetNotSetAlerts = async () => {
    console.log('[Alert Checker] Checking budget not set alerts...');

    const accounts = db.getAccounts();

    for (const account of accounts) {
        if (account.type !== 'agency') continue;

        const settings = db.getAlertSettings(account.id);
        const clients = db.getClients(account.id);

        for (const client of clients) {
            const token = getClientToken(account.id, client);
            if (!token) continue;

            if (client.provider === 'meta' && client.id.startsWith('act_')) {
                try {
                    const campaignsRes = await axios.get(`https://graph.facebook.com/v17.0/${client.id}/campaigns`, {
                        params: {
                            fields: 'id,name,status',
                            access_token: token.access_token
                        }
                    });

                    for (const camp of campaignsRes.data.data) {
                        if (camp.status !== 'ACTIVE') continue;

                        const budgetConfig = db.getCampaignBudget(camp.id);

                        if (!budgetConfig || !budgetConfig.periods || budgetConfig.periods.length === 0) {
                            if (!settings.enabledTypes.includes('budget_not_set')) continue;
                            if (db.hasRecentAlert(account.id, camp.id, 'budget_not_set', 168)) continue;

                            const message = `⚙️ 예산 미설정: 활성 캠페인이지만 커스텀 예산이 설정되지 않았습니다.`;

                            db.addAlert({
                                accountId: account.id,
                                campaignId: camp.id,
                                campaignName: camp.name,
                                type: 'budget_not_set',
                                severity: 'low',
                                message,
                                metadata: {},
                                isRead: false
                            });
                        }
                    }
                } catch (error) {
                    console.error(`[Alert Checker] Error checking budget not set for client ${client.id}:`, error);
                }
            }
        }
    }
};

// ==========================================
// 전체 알람 체크 실행
// ==========================================
export const runDailyAlertCheck = async () => {
    console.log('[Alert Checker] ===== Starting daily alert check =====');

    try {
        await checkDailyBudgetAlerts();
        await checkProgressMismatchAlerts();
        await checkCampaignEndingAlerts();
        await checkBudgetExhaustedAlerts();
        await checkBudgetNotSetAlerts();

        console.log('[Alert Checker] ===== Daily alert check completed =====');
    } catch (error) {
        console.error('[Alert Checker] Error during daily alert check:', error);
    }
};
