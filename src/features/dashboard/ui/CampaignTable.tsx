import React, { useState, useMemo } from 'react';
import type { DateRange } from './DateRangePicker';
import { BudgetManager } from './BudgetManager';

export interface Campaign {
    id: string;
    client: string;
    name: string;
    status: 'active' | 'paused' | 'ended';
    budget: number;
    spend: number;
    dailyBudget?: number;
    hasCustomBudget?: boolean;
    yesterdaySpend?: number;
}

const ProgressBar: React.FC<{ value: number; max: number; projected?: number }> = ({ value, max, projected }) => {
    const percent = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
    const projectedPercent = projected && max > 0 ? Math.min(Math.max(projected / max, 0), 1) : 0;

    return (
        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden relative">
            {/* Projected Bar (background) */}
            {projectedPercent > percent && (
                <div
                    className="absolute top-0 left-0 h-full bg-blue-100"
                    style={{ width: `${projectedPercent * 100}%` }}
                />
            )}
            {/* Actual Spend Bar (foreground) */}
            <div
                className={`absolute top-0 left-0 h-full ${percent > 1 ? 'bg-red-500' : 'bg-black'}`}
                style={{ width: `${percent * 100}%` }}
            />
        </div>
    );
};

interface CampaignTableProps {
    campaigns: Campaign[];
    loading: boolean;
    selectedAccountId?: string;
    dateRange: DateRange;
    onRefresh: () => void;
}

type SortKey = 'client' | 'name' | 'status' | 'spend' | 'usage';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | 'active' | 'paused' | 'ended';

export const CampaignTable: React.FC<CampaignTableProps> = ({ campaigns, loading, selectedAccountId, dateRange, onRefresh }) => {
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);

    // Budget Manager State
    const [activeCampaign, setActiveCampaign] = useState<{ id: string; name: string; spend: number } | null>(null);

    const handleSort = (key: SortKey) => {
        let direction: SortDirection = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getStatusWeight = (status: string) => {
        if (status === 'active') return 1;
        if (status === 'paused') return 2;
        return 3;
    };

    const processedCampaigns = useMemo(() => {
        let data = [...campaigns];

        // 1. Filter
        if (filterStatus !== 'all') {
            data = data.filter(c => c.status === filterStatus);
        }

        // 2. Sort
        if (sortConfig) {
            data.sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof Campaign];
                let bValue: any = b[sortConfig.key as keyof Campaign];

                // Special handling for computed/custom sorts
                if (sortConfig.key === 'status') {
                    aValue = getStatusWeight(a.status);
                    bValue = getStatusWeight(b.status);
                } else if (sortConfig.key === 'usage') {
                    aValue = a.budget > 0 ? a.spend / a.budget : 0;
                    bValue = b.budget > 0 ? b.spend / b.budget : 0;
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [campaigns, filterStatus, sortConfig]);

    if (!selectedAccountId) {
        return <div className="p-8 border border-black font-mono text-sm text-center text-gray-500">SELECT A CLIENT TO VIEW ACTIVE CAMPAIGNS</div>;
    }

    if (loading) {
        return <div className="p-4 border border-black font-mono text-xs text-center">LOADING DATA STREAM...</div>;
    }

    const SortIcon = ({ colKey }: { colKey: SortKey }) => {
        if (sortConfig?.key !== colKey) return <span className="opacity-20 ml-1">⇅</span>;
        return <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <div className="border border-black overflow-hidden bg-white">
            {/* Filter Tabs */}
            <div className="flex border-b border-black text-xs font-mono font-bold">
                {(['all', 'active', 'paused', 'ended'] as FilterStatus[]).map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 border-r border-black uppercase transition-colors ${filterStatus === status ? 'bg-black text-white' : 'hover:bg-gray-100'
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-black bg-gray-50 text-xs uppercase font-bold select-none">
                        <th
                            className="p-3 border-r border-black w-32 cursor-pointer hover:bg-gray-200 transition-colors"
                            onClick={() => handleSort('client')}
                        >
                            Client <SortIcon colKey="client" />
                        </th>
                        <th
                            className="p-3 border-r border-black cursor-pointer hover:bg-gray-200 transition-colors"
                            onClick={() => handleSort('name')}
                        >
                            Campaign <SortIcon colKey="name" />
                        </th>
                        <th
                            className="p-3 border-r border-black w-24 cursor-pointer hover:bg-gray-200 transition-colors"
                            onClick={() => handleSort('status')}
                        >
                            Status <SortIcon colKey="status" />
                        </th>
                        <th
                            className="p-3 w-[500px] cursor-pointer hover:bg-gray-200 transition-colors"
                            onClick={() => handleSort('spend')}
                        >
                            Budget Overview <SortIcon colKey="spend" />
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {processedCampaigns.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="p-8 text-center text-xs font-mono text-gray-400">
                                NO CAMPAIGNS FOUND
                            </td>
                        </tr>
                    ) : (
                        processedCampaigns.map((camp: any) => {
                            // Calculation Logic for Projections
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            let daysLeft = 0;
                            let recDaily = 0;
                            let projectedSpend = camp.spend;

                            // Calculate Gross Spend (Ad Spend + Estimated Commission)
                            let grossSpend = camp.spend;
                            if (camp.hasCommission && camp.commission) {
                                if (camp.commission.type === 'percentage') {
                                    // Ad Spend / (1 - Fee%) = Gross
                                    grossSpend = camp.spend / (1 - camp.commission.value / 100);
                                } else {
                                    // Fixed: For progress, we pro-rate the fixed fee based on spend ratio
                                    // Total Gross = AdBudget + Fixed. If we spent 50% of AdBudget, we've "used" 50% of Fixed.
                                    if (camp.adBudget > 0) {
                                        const spendRatio = camp.spend / camp.adBudget;
                                        grossSpend = camp.spend + (camp.commission.value * spendRatio);
                                    }
                                }
                            }

                            if (dateRange.end) {
                                const end = new Date(dateRange.end);
                                end.setHours(0, 0, 0, 0);
                                if (end >= today) {
                                    const diffTime = end.getTime() - today.getTime();
                                    daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                    const grossRemaining = Math.max(0, camp.budget - grossSpend);
                                    if (daysLeft > 0) {
                                        recDaily = grossRemaining / daysLeft;
                                        // Projected Gross Spend = Current Gross Spend + (Rec Daily * Days Left)
                                        if (camp.status === 'active') {
                                            // Scale the platform daily budget to Gross for projection
                                            let dailyGross = camp.dailyBudget || 0;
                                            if (camp.hasCommission && camp.commission?.type === 'percentage') {
                                                dailyGross = (camp.dailyBudget || 0) / (1 - camp.commission.value / 100);
                                            }
                                            projectedSpend = grossSpend + (dailyGross * daysLeft);
                                        }
                                    }
                                }
                            }

                            const projectedRatio = camp.budget > 0 ? (projectedSpend / camp.budget) * 100 : 0;
                            const isOverBudget = projectedSpend > camp.budget;

                            return (
                                <tr
                                    key={camp.id}
                                    className="border-b border-black last:border-b-0 hover:bg-black hover:text-white group transition-colors duration-75 text-sm cursor-pointer"
                                    onClick={() => setActiveCampaign({ id: camp.id, name: camp.name, spend: camp.spend })}
                                >
                                    <td className="p-3 border-r border-black group-hover:border-white font-bold">{camp.client}</td>
                                    <td
                                        className="p-3 border-r border-black group-hover:border-white font-mono truncate max-w-[200px]"
                                        title={camp.name}
                                    >
                                        <div className="flex items-center gap-2">
                                            <StatusIndicator status={getCampaignStatus(camp, dateRange)} />
                                            <span className="truncate">{camp.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 border-r border-black group-hover:border-white uppercase text-xs">
                                        <span className={`px-1 border ${camp.status === 'active' ? 'border-accent text-accent group-hover:border-white group-hover:text-white' : 'border-gray-400 text-gray-400'}`}>
                                            {camp.status}
                                        </span>
                                    </td>
                                    <td className="p-3 group-hover:border-white">
                                        <div className="grid grid-cols-12 gap-4 items-center">
                                            {/* Left: Main Numbers (Daily) */}
                                            <div className="col-span-4 flex flex-col">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xs uppercase text-gray-500 group-hover:text-gray-400" title="Net Daily Ad Budget">Set</span>
                                                    <span className="font-bold font-mono text-lg">
                                                        ¥{(camp.dailyBudget || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xs uppercase text-gray-500 group-hover:text-gray-400" title="Recommended Gross Daily">Rec</span>
                                                    <span className={`font-mono text-sm ${(recDaily > (camp.dailyBudget || 0) * 1.3) ? 'text-red-500 font-bold' : ''}`}>
                                                        ¥{Math.round(recDaily).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Middle: Secondary Numbers (Monthly, Yesterday) */}
                                            <div className="col-span-4 flex flex-col font-mono text-xs border-l border-gray-300 pl-4 group-hover:border-gray-600">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500 group-hover:text-gray-400">Month</span>
                                                    <span className="font-bold">
                                                        ¥{(camp.hasCustomBudget ? camp.budget : 0).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between" title="Estimated Gross Spend (with Commission)">
                                                    <span className="text-gray-500 group-hover:text-gray-400">Total</span>
                                                    <span>¥{Math.round(grossSpend).toLocaleString()}</span>
                                                </div>
                                            </div>

                                            {/* Right: Projection & Progress */}
                                            <div className="col-span-4 flex flex-col gap-1 pl-4 border-l border-gray-300 group-hover:border-gray-600">
                                                <div className="flex justify-between items-center text-xs font-mono">
                                                    <span className="text-gray-500 group-hover:text-gray-400">Projected</span>
                                                    <span className={isOverBudget ? 'text-red-500 font-bold' : ''}>
                                                        {Math.round(projectedRatio)}%
                                                    </span>
                                                </div>
                                                <ProgressBar value={grossSpend} max={camp.budget} projected={projectedSpend} />
                                                <div className="flex justify-between text-[10px] font-mono text-gray-400 group-hover:text-gray-500">
                                                    <span>Ads: ¥{camp.spend.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>

            <BudgetManager
                isOpen={!!activeCampaign}
                onClose={() => setActiveCampaign(null)}
                campaign={activeCampaign}
                clientId={selectedAccountId}
                onSave={onRefresh}
            />
        </div>
    );
};

// Helper: Calculate Status
const getCampaignStatus = (camp: Campaign, dateRange: DateRange) => {
    if (camp.status !== 'active') return 'gray';

    // If no end date, we can't really calculate pacing accurately in this model, default to green? or gray?
    // Project assumes monthly view usually has an end date.
    if (!dateRange.end) return 'gray';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.end);
    end.setHours(0, 0, 0, 0);

    // If period is passed
    if (today > end) return 'gray';

    const diffTime = end.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const remaining = camp.budget - camp.spend;

    // Overspent
    if (remaining < 0) return 'red';

    // Logic: Compare Current Daily Budget vs Recommended Daily Budget
    // Rec Daily = Remaining Budget / Days Left
    if (daysLeft <= 0) return 'gray'; // Should not happen given check above but safety

    const recDaily = remaining / daysLeft;
    const currentDaily = camp.dailyBudget || 0;

    if (currentDaily === 0) return 'red'; // No budget set?

    const ratio = currentDaily / recDaily;
    const deviation = Math.abs(1 - ratio);

    if (deviation <= 0.05) return 'green'; // ±5%
    if (deviation <= 0.15) return 'yellow'; // ±15%
    return 'red'; // > 15%
};

const StatusIndicator: React.FC<{ status: 'gray' | 'green' | 'yellow' | 'red' }> = ({ status }) => {
    const colors = {
        gray: 'bg-gray-400',
        green: 'bg-green-500',
        yellow: 'bg-yellow-400',
        red: 'bg-red-500'
    };

    // Add tooltip text
    const titles = {
        gray: 'Disabled / Finished',
        green: 'On Track (±5%)',
        yellow: 'Attention Needed (±15%)',
        red: 'Critical Action Required'
    };

    return (
        <span
            className={`inline-block w-3 h-3 mr-2 flex-shrink-0 ${colors[status]}`}
            style={{ borderRadius: '50%' }}
            title={titles[status]}
        />
    );
};

