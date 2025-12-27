import axios from 'axios';
import { db } from '../db';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { getValidGoogleToken } from '../utils/tokenRefresh';

export const syncConnections = async (accountId: string) => {
    logger.info(`Starting connection sync for account ${accountId}`);

    const googleTokens = db.getTokens(accountId, 'google');
    const metaTokens = db.getTokens(accountId, 'meta');

    let accounts: any[] = [];

    // 1. Fetch Google Accounts
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

            // Fetch detailed info for each customer
            const googleAccounts = await Promise.all(
                (response.data.resourceNames || []).map(async (rn: string) => {
                    const customerId = rn.split('/')[1];
                    try {
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

                        const result = customerInfo?.data.results?.[0];
                        const descriptiveName = result?.customer?.descriptiveName;
                        const formattedId = customerId.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
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
                        // Fallback on error
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

            // AUTO-UPDATE names logic integrated
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
                            }
                        }
                    }
                }
                if (updated) {
                    await db.write(data);
                }
            } catch (dbErr) { /* ignore */ }

            accounts = [...accounts, ...googleAccounts];
        } catch (error: any) {
            logger.error(`Error fetching Google accounts in sync for ${token.email}`, { message: error.message });
        }
    }

    // 2. Fetch Meta Accounts
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
            logger.error(`Error fetching Meta accounts in sync for ${token.email}`, { message: error.message });
        }
    }

    // Store in DB Cache
    db.setCache(accountId, 'connections', accounts);
    return accounts;
};

export const runFullSync = async () => {
    // Only agency accounts or selected account logic? Sync ALL accounts to be safe.
    const accounts = db.getAccounts();
    logger.info(`[Sync] Running background sync for ${accounts.length} accounts...`);

    for (const acc of accounts) {
        await syncConnections(acc.id);
    }
    logger.info('[Sync] Full sync completed.');
};

export const startSyncScheduler = () => {
    // Initial sync
    runFullSync();

    // Schedule every 5 minutes
    setInterval(runFullSync, 5 * 60 * 1000);
};
