import { Router } from 'express';
import axios from 'axios';
import { db } from '../db';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { getValidGoogleToken } from '../utils/tokenRefresh';
import { syncConnections } from '../services/syncService';

const router = Router();

// Helper to map Meta status to frontend status
const mapMetaStatus = (status: string): 'active' | 'paused' | 'ended' => {
    const s = status.toUpperCase();
    if (s === 'ACTIVE') return 'active';
    if (s === 'PAUSED') return 'paused';
    return 'ended';
};

// Helper: Get overlap days between two ranges
const getOverlapDays = (s1: string, e1: string, s2: string, e2: string) => {
    const start1 = new Date(s1);
    const end1 = new Date(e1);
    const start2 = new Date(s2);
    const end2 = new Date(e2);

    // Normalize to UTC midnight to avoid DST/Timezone issues
    start1.setUTCHours(0, 0, 0, 0);
    end1.setUTCHours(0, 0, 0, 0);
    start2.setUTCHours(0, 0, 0, 0);
    end2.setUTCHours(0, 0, 0, 0);

    const start = start1 > start2 ? start1 : start2;
    const end = end1 < end2 ? end1 : end2;

    // Check if ranges actually overlap
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

// ==========================================
// CLIENT MANAGEMENT API
// ==========================================

// Get My Clients
router.get('/clients', (req, res) => {
    const accountId = req.accountId;
    if (!accountId) return res.status(401).json({ error: 'Unauthorized' });
    res.json(db.getClients(accountId));
});

// Add Client
router.post('/clients', (req, res) => {
    const accountId = req.accountId;
    if (!accountId) return res.status(401).json({ error: 'Unauthorized' });
    const client = { ...req.body, accountId };

    if (!client.id || !client.name) {
        return res.status(400).json({ error: 'Missing client info' });
    }

    db.addClient(client);
    res.json({ success: true });
});

// Remove Client
router.delete('/clients/:id', (req, res) => {
    const { id } = req.params;
    const accountId = req.accountId;
    db.removeClient(id, accountId);
    res.json({ success: true });
});

// Set Client Commission
router.post('/clients/:id/commission', (req, res) => {
    const { id } = req.params;
    const { type, value } = req.body;

    if (!type || value === undefined) {
        return res.status(400).json({ error: 'Missing commission info' });
    }

    if (type !== 'fixed' && type !== 'percentage') {
        return res.status(400).json({ error: 'Invalid commission type' });
    }

    if (typeof value !== 'number' || value < 0) {
        return res.status(400).json({ error: 'Invalid commission value' });
    }

    if (type === 'percentage' && value > 100) {
        return res.status(400).json({ error: 'Percentage cannot exceed 100' });
    }

    const accountId = req.accountId;
    const success = db.setClientCommission(id, { type, value }, accountId);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Client not found' });
    }
});

// Get Client Commission
router.get('/clients/:id/commission', (req, res) => {
    const { id } = req.params;
    const accountId = req.accountId;
    const commission = db.getClientCommission(id, accountId);
    res.json(commission || null);
});

// ==========================================
// EXTERNAL CONNECTIONS API
// ==========================================

router.get('/connections', async (req, res) => {
    const accountId = req.accountId;
    if (!accountId) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Try Cache First (0ms latency target)
    const cached = db.getCache(accountId, 'connections');
    if (cached && Array.isArray(cached)) {
        return res.json(cached);
    }

    // 2. Fallback: Sync immediately if no cache
    logger.info(`No connection cache for ${accountId}, syncing now...`);
    try {
        const freshData = await syncConnections(accountId);
        res.json(freshData);
    } catch (error) {
        logger.error(`Initial sync failed for ${accountId}`, { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to fetch connections' });
    }
});

// ==========================================
// CAMPAIGN BUDGET CONFIG API
// ==========================================

router.get('/campaigns/:id/budget', (req, res) => {
    const { id } = req.params;
    const config = db.getCampaignBudget(id);
    res.json(config || null);
});

// Update POST /campaigns/:id/budget
router.post('/campaigns/:id/budget', (req, res) => {
    const { id } = req.params;
    const newConfig = { ...req.body, id }; // Ensure ID matches

    // Get existing to preserve history
    const existingConfig = db.getCampaignBudget(id);
    const history = existingConfig?.history || [];

    // Create new history item
    let periodStr = '';
    if (newConfig.type === 'recurring') {
        const raw = newConfig.rawConfig;
        periodStr = `${raw.startMonth} ~ ${raw.endMonth}`;
    } else {
        const raw = newConfig.rawConfig;
        periodStr = `${raw.start} ~ ${raw.end}`;
    }

    const newItem = {
        timestamp: new Date().toISOString(),
        type: newConfig.type,
        amount: newConfig.rawConfig.amount,
        period: periodStr,
        user: 'Admin' // Placeholder
    };

    // Append new item to history
    newConfig.history = [newItem, ...history]; // Add to top

    db.setCampaignBudget(newConfig);
    res.json({ success: true });
});

// ==========================================
// CAMPAIGN DATA API
// ==========================================

router.get('/campaigns', async (req, res) => {
    const currentAccountId = req.accountId;
    if (!currentAccountId) return res.status(401).json({ error: 'Unauthorized' });

    const googleToken = db.getToken(currentAccountId, 'google');
    const metaToken = db.getToken(currentAccountId, 'meta');
    const { accountId: clientAccountId, startDate, endDate, preset } = req.query;

    if (!clientAccountId) {
        return res.json([]);
    }

    let allCampaigns: any[] = [];

    // 1. Meta Campaigns
    if (metaToken) {
        try {
            if (String(clientAccountId).startsWith('act_')) {
                let clientName = 'Meta Client';
                try {
                    const accInfo = await axios.get(`https://graph.facebook.com/v17.0/${clientAccountId}`, {
                        params: { fields: 'name,currency', access_token: metaToken.access_token }
                    });
                    clientName = accInfo.data.name;
                } catch (e) {
                    console.error('Error fetching account name', e);
                }

                let insightsField = 'insights.date_preset(maximum){spend}';
                let reqStart = '';
                let reqEnd = '';
                let isDailyMetrics = false;

                if (preset === 'maximum') {
                    insightsField = 'insights.date_preset(maximum){spend}';
                } else if (startDate && endDate) {
                    const timeRange = JSON.stringify({ since: startDate, until: endDate });
                    // Fetch daily breakdowns to get Yesterday's spend and Total spend
                    insightsField = `insights.time_range(${timeRange}).time_increment(1){spend,date_start,date_stop}`;
                    reqStart = String(startDate);
                    reqEnd = String(endDate);
                    isDailyMetrics = true;
                }

                const campaignsRes = await axios.get(`https://graph.facebook.com/v17.0/${clientAccountId}/campaigns`, {
                    params: {
                        fields: `id,name,status,daily_budget,lifetime_budget,adsets{daily_budget,status},${insightsField}`,
                        access_token: metaToken.access_token
                    }
                });

                // Helper to get yesterday's date string YYYY-MM-DD
                const getYesterdayDate = () => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    return d.toISOString().split('T')[0];
                };
                const yesterdayStr = getYesterdayDate();

                const campaigns = campaignsRes.data.data.map((camp: any) => {
                    let spend = 0;
                    let yesterdaySpend = 0;

                    if (isDailyMetrics && camp.insights) {
                        const data = camp.insights.data || [];
                        // Sum up all days for total spend in range
                        spend = data.reduce((acc: number, day: any) => acc + parseFloat(day.spend || 0), 0);

                        // Find yesterday's spend
                        const yData = data.find((day: any) => day.date_start === yesterdayStr);
                        if (yData) {
                            yesterdaySpend = parseFloat(yData.spend);
                        }
                    } else {
                        // Fallback for maximum or non-daily
                        spend = parseFloat(camp.insights?.data?.[0]?.spend || 0);
                    }

                    // 1. Calculate Daily Budget
                    // Priority: Campaign Daily Budget -> Sum of Active AdSets Daily Budget
                    // Meta API returns JPY values directly (not in cents for JPY accounts)
                    let calculatedDailyBudget = parseFloat(camp.daily_budget || 0);

                    if (!calculatedDailyBudget) {
                        const adSets = camp.adsets?.data || [];
                        calculatedDailyBudget = adSets
                            .filter((as: any) => as.status === 'ACTIVE')
                            .reduce((sum: number, as: any) => sum + parseFloat(as.daily_budget || 0), 0);
                    }

                    // 2. Main Budget Display (Daily or Lifetime)
                    // No conversion needed - already in JPY
                    let budget = parseFloat(camp.daily_budget || camp.lifetime_budget || 0);
                    if (budget === 0 && calculatedDailyBudget > 0) {
                        budget = calculatedDailyBudget;
                    }


                    // Custom Budget Logic
                    const customConfig = db.getCampaignBudget(camp.id);
                    let customBudget = 0;
                    let hasCustomBudget = false;

                    if (customConfig && customConfig.periods && reqStart && reqEnd) {
                        hasCustomBudget = true;
                        customConfig.periods.forEach((period: any) => {
                            const overlap = getOverlapDays(reqStart, reqEnd, period.startDate, period.endDate);
                            if (overlap > 0) {
                                // Logic Split based on Budget Type
                                const budgetType = customConfig.type || 'fixed'; // Default to fixed if not set

                                if (budgetType === 'fixed') {
                                    // 1. Fixed Period: Pro-rata distribution (Spread budget evenly over days)
                                    const periodDays = getTotalDays(period.startDate, period.endDate);
                                    if (periodDays > 0) {
                                        const dailyAmount = period.amount / periodDays;
                                        // Add calculated amount for the overlapping days in this month
                                        customBudget += dailyAmount * overlap;

                                        // NOTE: Do NOT override calculatedDailyBudget
                                        // Keep the actual platform daily budget for "Set" display
                                    }
                                } else {
                                    // 2. Monthly Recurring: Full Monthly Amount (No pro-rata)
                                    // If there is ANY overlap with this month, show the full monthly budget.
                                    customBudget += period.amount;

                                    // NOTE: Do NOT override calculatedDailyBudget
                                    // Keep the actual platform daily budget for "Set" display
                                }
                            }
                        });
                    }

                    if (hasCustomBudget && customBudget > 0) {
                        budget = customBudget;
                    }

                    // Apply commission if set for this client
                    // Subtract commission from budget to show actual ad spend
                    const commission = db.getClientCommission(String(clientAccountId), currentAccountId);
                    let actualAdBudget = budget;
                    if (commission) {
                        if (commission.type === 'fixed') {
                            // Subtract fixed amount from budget
                            actualAdBudget = budget - commission.value;
                        } else {
                            // Subtract percentage from budget
                            // If commission is 10%, actual ad budget = budget * (1 - 0.10) = budget * 0.9
                            actualAdBudget = budget * (1 - commission.value / 100);
                        }
                    }

                    return {
                        id: camp.id,
                        client: clientName,
                        name: camp.name,
                        status: mapMetaStatus(camp.status),
                        budget: budget, // Return Gross Budget (what the user set)
                        adBudget: actualAdBudget, // Return Net Ad Budget (after commission)
                        spend: spend, // Actual Ad Spend (Net)
                        dailyBudget: calculatedDailyBudget,
                        yesterdaySpend: yesterdaySpend,
                        hasCustomBudget: hasCustomBudget,
                        hasCommission: !!commission,
                        commission: commission
                    };
                });

                allCampaigns = [...allCampaigns, ...campaigns];
            }
        } catch (error) {
            console.error('Error fetching Meta campaigns:', error);
            // Don't crash, just return what we have (or empty)
        }
    }

    res.json(allCampaigns);
});

router.post('/accounts/select', (req, res) => {
    const { accountId } = req.body;
    db.setSelectedAccount(accountId);
    res.json({ success: true, selected: accountId });
});

export default router;
