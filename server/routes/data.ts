import { Router } from 'express';
import axios from 'axios';
import { db } from '../db';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { getValidGoogleToken } from '../utils/tokenRefresh';

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

    const googleTokens = db.getTokens(accountId, 'google');
    const metaTokens = db.getTokens(accountId, 'meta');

    let accounts: any[] = [];

    // 1. Fetch Google Accounts (Iterate over all connected Google accounts)
    for (const token of googleTokens) {
        try {
            const developerToken = config.google.developerToken;
            if (!developerToken) {
                logger.warn(`[WARNING] Google Developer Token is missing. Cannot fetch Google Ads accounts for ${token.email}.`);
                continue;
            }

            // Get valid token (auto-refresh if expired)
            const validToken = await getValidGoogleToken(accountId, token.email || '');
            if (!validToken) {
                logger.error(`Failed to get valid token for ${token.email}`);
                continue;
            }

            const response = await axios.get('https://googleads.googleapis.com/v19/customers:listAccessibleCustomers', {
                headers: {
                    'Authorization': `Bearer ${validToken}`,
                    'developer-token': developerToken
                }
            });

            logger.info(`[DEBUG] Google API Response for ${token.email}`, {
                resourceNames: response.data.resourceNames,
                count: response.data.resourceNames?.length
            });

            // Fetch detailed info for each customer to get real account names
            const googleAccounts = await Promise.all(
                response.data.resourceNames.map(async (rn: string) => {
                    const customerId = rn.split('/')[1];
                    try {
                        // Attempt to fetch name, trying both with and without login-customer-id if needed
                        let customerInfo;
                        try {
                            customerInfo = await axios.post(
                                `https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:search`,
                                {
                                    query: `SELECT customer.id, customer.descriptive_name, customer.manager FROM customer WHERE customer.id = ${customerId}`
                                },
                                {
                                    headers: {
                                        'Authorization': `Bearer ${validToken}`,
                                        'developer-token': developerToken,
                                        'Content-Type': 'application/json',
                                        'login-customer-id': customerId
                                    }
                                }
                            );
                        } catch (err: any) {
                            if (err.response?.status === 403 || err.response?.status === 400) {
                                // Try again WITHOUT login-customer-id header
                                customerInfo = await axios.post(
                                    `https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:search`,
                                    {
                                        query: `SELECT customer.id, customer.descriptive_name, customer.manager FROM customer WHERE customer.id = ${customerId}`
                                    },
                                    {
                                        headers: {
                                            'Authorization': `Bearer ${validToken}`,
                                            'developer-token': developerToken,
                                            'Content-Type': 'application/json'
                                        }
                                    }
                                );
                            } else {
                                throw err;
                            }
                        }

                        // Extract descriptive_name from search results
                        const result = customerInfo?.data.results?.[0];
                        const descriptiveName = result?.customer?.descriptiveName;

                        // Format customer ID as XXX-XXX-XXXX
                        const formattedId = customerId.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');

                        // Always show: "Name (XXX-XXX-XXXX)" or "Google Ads (XXX-XXX-XXXX)"
                        const accountName = descriptiveName
                            ? `${descriptiveName} (${formattedId})`
                            : `Google Ads (${formattedId})`;

                        return {
                            id: rn,
                            name: accountName,
                            provider: 'google' as const,
                            status: 'CONNECTED',
                            connectedEmail: token.email
                        };
                    } catch (err: any) {
                        // Enhanced error logging to diagnose 403 issues
                        logger.warn(`Failed to fetch name for customer ${customerId}`, {
                            error: err.message,
                            status: err.response?.status,
                            statusText: err.response?.statusText,
                            errorDetails: err.response?.data
                        });

                        // Fallback: Format ID even on error
                        const formattedId = customerId.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');

                        return {
                            id: rn,
                            name: `Google Ads (${formattedId})`,
                            provider: 'google' as const,
                            status: 'CONNECTED',
                            connectedEmail: token.email
                        };
                    }
                })
            );

            // AUTO-UPDATE names in DB for existing clients if we found a better name
            try {
                const data = db.read();
                let updated = false;
                if (data.clients) {
                    for (const client of data.clients) {
                        if (client.accountId === accountId) {
                            const match = googleAccounts.find(ga => ga.id === client.id);
                            if (match && match.name !== client.name && !match.name.startsWith('Google Ads (')) {
                                client.name = match.name;
                                updated = true;
                                logger.info(`Updating saved client name for ${client.id} to ${match.name}`);
                            }
                        }
                    }
                }
                if (updated) {
                    await db.write(data);
                    logger.info(`Auto-updated client names in database for account ${accountId}`);
                }
            } catch (dbErr: any) {
                logger.error('Failed to auto-update client names in DB', { error: dbErr.message });
            }

            logger.info(`[DEBUG] Parsed Google Accounts`, { count: googleAccounts.length, accounts: googleAccounts });

            accounts = [...accounts, ...googleAccounts];
        } catch (error: any) {
            logger.error(`Error fetching Google accounts for ${token.email}`, {
                message: error.message,
                responseData: error.response?.data
            });
        }
    }

    // 2. Fetch Meta Accounts (Iterate over all connected Meta accounts)
    for (const token of metaTokens) {
        try {
            const response = await axios.get('https://graph.facebook.com/v17.0/me/adaccounts', {
                params: {
                    fields: 'id,name,account_id',
                    access_token: token.access_token
                }
            });
            const metaAccounts = response.data.data.map((acc: any) => ({
                id: acc.id,
                name: acc.name,
                provider: 'meta',
                status: 'CONNECTED',
                connectedEmail: token.email
            }));
            accounts = [...accounts, ...metaAccounts];
        } catch (error: any) {
            logger.error(`Error fetching Meta accounts for ${token.email}`, { message: error.message });
        }
    }

    res.json(accounts);
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
