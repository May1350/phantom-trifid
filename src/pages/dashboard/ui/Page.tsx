import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { KPIGrid } from '../../../features/dashboard/ui/KPIGrid';
import { CampaignTable, type Campaign } from '../../../features/dashboard/ui/CampaignTable';
import { ClientManager } from '../../../features/dashboard/ui/ClientManager';
import { MonthPicker } from '../../../features/dashboard/ui/MonthPicker';
import { AlertBadge } from '../../../features/alerts/ui/AlertBadge';

interface Account {
    id: string;
    name: string;
    provider: 'google' | 'meta';
}

export const DashboardPage: React.FC = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [isManagerOpen, setIsManagerOpen] = useState(false);

    // Campaign Data State
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(false);

    // Month State (Default to today)
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

    // Helper to get start/end of current month
    const getDateRange = useCallback(() => {
        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

        // Use local time formatting YYYY-MM-DD
        const formatDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        return {
            start: formatDate(start),
            end: formatDate(end)
        };
    }, [currentMonth]);

    const loadClients = useCallback(() => {
        fetch('/api/data/clients')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setAccounts(data);
                    if (data.length > 0) {
                        setSelectedAccountId(prev => {
                            if (!prev || !data.find((c: Account) => c.id === prev)) {
                                return data[0].id;
                            }
                            return prev;
                        });
                    } else {
                        setSelectedAccountId('');
                    }
                } else {
                    setAccounts([]);
                    setSelectedAccountId('');
                }
            })
            .catch(err => {
                console.error('Failed to load clients', err);
                setAccounts([]);
            });
    }, []);

    useEffect(() => {
        loadClients();
    }, [loadClients]);

    const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedAccountId(e.target.value);
    };

    // Fetch Campaigns
    const fetchCampaigns = useCallback(() => {
        if (!selectedAccountId) {
            setCampaigns([]);
            return;
        }

        setLoading(true);

        const { start, end } = getDateRange();
        const params = new URLSearchParams();
        params.append('accountId', selectedAccountId);
        params.append('startDate', start);
        params.append('endDate', end);

        fetch(`/api/data/campaigns?${params.toString()}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setCampaigns(data);
                } else {
                    setCampaigns([]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to load campaigns', err);
                setCampaigns([]);
                setLoading(false);
            });
    }, [selectedAccountId, getDateRange]);

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    // Calculate Aggregates
    const { totalSpend, totalBudget } = useMemo(() => {
        return campaigns.reduce((acc, camp) => ({
            totalSpend: acc.totalSpend + camp.spend,
            // Only sum up budget if it is a custom set budget, otherwise 0
            totalBudget: acc.totalBudget + (camp.hasCustomBudget ? camp.budget : 0)
        }), { totalSpend: 0, totalBudget: 0 });
    }, [campaigns]);

    // Memoize date range object for CampaignTable
    const dateRangeObj = useMemo(() => {
        const { start, end } = getDateRange();
        return { start, end, preset: 'custom' };
    }, [getDateRange]);

    return (
        <div className="p-8 max-w-7xl mx-auto relative">
            <header className="mb-8 border-b-4 border-black pb-4">
                <div className="flex justify-between items-start mb-4">
                    <h1 className="text-3xl font-black uppercase tracking-tighter">
                        Agency Dashboard
                    </h1>
                </div>

                <div className="flex justify-between items-end flex-wrap gap-4">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsManagerOpen(true)}
                            className="h-9 px-4 text-[11px] font-mono border border-black hover:bg-black hover:text-white transition-all active:scale-95 cursor-pointer uppercase tracking-wider flex items-center justify-center"
                        >
                            Manage Client
                        </button>

                        <select
                            id="client-select"
                            value={selectedAccountId}
                            onChange={handleAccountChange}
                            className="h-9 px-4 border border-black bg-transparent font-mono text-[11px] min-w-[200px] focus:outline-none focus:ring-1 focus:ring-black cursor-pointer uppercase appearance-none"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 0.5rem center',
                                backgroundSize: '1rem'
                            }}
                        >
                            <option value="" disabled>-- SELECT CLIENT --</option>
                            {accounts.map(account => (
                                <option key={account.id} value={account.id}>
                                    {account.name} ({account.provider.toUpperCase()})
                                </option>
                            ))}
                        </select>
                    </div>

                    <MonthPicker
                        currentDate={currentMonth}
                        onChange={setCurrentMonth}
                    />
                </div>
            </header>

            <KPIGrid totalSpend={totalSpend} totalBudget={totalBudget} />

            <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold uppercase text-lg">Active Campaigns</h2>
                <div className="text-xs font-mono uppercase text-gray-500">Live Data Stream</div>
            </div>

            <CampaignTable
                campaigns={campaigns}
                loading={loading}
                selectedAccountId={selectedAccountId}
                dateRange={dateRangeObj}
                onRefresh={fetchCampaigns}
            />

            <ClientManager
                isOpen={isManagerOpen}
                onClose={() => setIsManagerOpen(false)}
                onUpdate={loadClients}
            />
        </div>
    );
};
