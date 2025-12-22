import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { KPIGrid } from '../../../features/dashboard/ui/KPIGrid';
import { CampaignTable, type Campaign } from '../../../features/dashboard/ui/CampaignTable';
import { ClientManager } from '../../../features/dashboard/ui/ClientManager';
import { MonthPicker } from '../../../features/dashboard/ui/MonthPicker';

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
                setAccounts(data);
                if (data.length > 0) {
                    // Use functional update to avoid dependency on selectedAccountId
                    setSelectedAccountId(prev => {
                        if (!prev || !data.find((c: Account) => c.id === prev)) {
                            return data[0].id;
                        }
                        return prev;
                    });
                } else {
                    setSelectedAccountId('');
                }
            })
            .catch(err => console.error('Failed to load clients', err));
    }, []); // Removed selectedAccountId dependency to prevent unnecessary re-renders

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
                setCampaigns(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to load campaigns', err);
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
            totalBudget: acc.totalBudget + camp.budget
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
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsManagerOpen(true)}
                            className="text-xs font-mono border border-black px-2 py-1 hover:bg-black hover:text-white transition-colors mr-2 cursor-pointer"
                        >
                            [MANAGE]
                        </button>

                        <label htmlFor="client-select" className="text-xs font-bold uppercase">Client:</label>
                        <select
                            id="client-select"
                            value={selectedAccountId}
                            onChange={handleAccountChange}
                            className="border border-black bg-transparent font-mono text-xs p-1 min-w-[200px] focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
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
