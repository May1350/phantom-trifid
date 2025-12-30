import React, { useState, useMemo } from 'react';
import { DemoAlertBadge } from './DemoAlertBadge';

// Mock campaign data
interface DemoCampaign {
    id: string;
    client: string;
    name: string;
    status: 'active' | 'paused' | 'ended';
    budget: number;
    spend: number;
    dailyBudget: number;
    hasCustomBudget: boolean;
}

const DEMO_CAMPAIGNS: DemoCampaign[] = [
    {
        id: '1',
        client: 'TechCorp',
        name: 'Q1 Product Launch - AI Platform',
        status: 'active',
        budget: 5000000,
        spend: 3200000,
        dailyBudget: 180000,
        hasCustomBudget: true,
    },
    {
        id: '2',
        client: 'FashionBrand',
        name: 'Summer Collection 2025',
        status: 'active',
        budget: 3000000,
        spend: 850000,
        dailyBudget: 120000,
        hasCustomBudget: true,
    },
    {
        id: '3',
        client: 'TechCorp',
        name: 'Brand Awareness Campaign',
        status: 'active',
        budget: 2500000,
        spend: 2450000,
        dailyBudget: 95000,
        hasCustomBudget: true,
    },
    {
        id: '4',
        client: 'FoodDelivery',
        name: 'New Year Special Promotion',
        status: 'paused',
        budget: 1800000,
        spend: 1200000,
        dailyBudget: 0,
        hasCustomBudget: true,
    },
    {
        id: '5',
        client: 'FoodDelivery',
        name: 'Weekend Flash Sale',
        status: 'active',
        budget: 800000,
        spend: 250000,
        dailyBudget: 50000,
        hasCustomBudget: true,
    },
];

type FilterStatus = 'all' | 'active' | 'paused' | 'ended';
type SortKey = 'client' | 'name' | 'status' | 'spend' | 'usage';
type SortDirection = 'asc' | 'desc';

const ProgressBar: React.FC<{ value: number; max: number; projected?: number }> = ({ value, max, projected }) => {
    const percent = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
    const projectedPercent = projected && max > 0 ? Math.min(Math.max(projected / max, 0), 1) : 0;

    return (
        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden relative">
            {projectedPercent > percent && (
                <div
                    className="absolute top-0 left-0 h-full bg-blue-100"
                    style={{ width: `${projectedPercent * 100}%` }}
                />
            )}
            <div
                className={`absolute top-0 left-0 h-full ${percent > 1 ? 'bg-red-500' : 'bg-black'}`}
                style={{ width: `${percent * 100}%` }}
            />
        </div>
    );
};

const StatusIndicator: React.FC<{ status: 'gray' | 'green' | 'yellow' | 'red' }> = ({ status }) => {
    const colors = {
        gray: 'bg-gray-400',
        green: 'bg-green-500',
        yellow: 'bg-yellow-400',
        red: 'bg-red-500'
    };

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

export const DemoDashboard: React.FC = () => {
    const [campaigns] = useState<DemoCampaign[]>(DEMO_CAMPAIGNS);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
    const [selectedCampaign, setSelectedCampaign] = useState<DemoCampaign | null>(null);

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

        // Filter
        if (filterStatus !== 'all') {
            data = data.filter(c => c.status === filterStatus);
        }

        // Sort
        if (sortConfig) {
            data.sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof DemoCampaign];
                let bValue: any = b[sortConfig.key as keyof DemoCampaign];

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

    const calculateMetrics = (camp: DemoCampaign) => {
        const today = new Date();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const daysInMonth = endOfMonth.getDate();
        const currentDay = today.getDate();
        const daysLeft = daysInMonth - currentDay + 1;

        const remaining = camp.budget - camp.spend;
        const recDaily = daysLeft > 0 ? remaining / daysLeft : 0;
        const projectedSpend = camp.status === 'active' ? camp.spend + (camp.dailyBudget * daysLeft) : camp.spend;

        return { recDaily, projectedSpend, daysLeft };
    };

    const getCampaignStatus = (camp: DemoCampaign) => {
        if (camp.status !== 'active') return 'gray';

        const remaining = camp.budget - camp.spend;
        if (remaining < 0) return 'red';

        const { recDaily } = calculateMetrics(camp);
        const currentDaily = camp.dailyBudget || 0;

        if (currentDaily === 0) return 'red';

        const ratio = currentDaily / recDaily;
        const deviation = Math.abs(1 - ratio);

        if (deviation <= 0.05) return 'green';
        if (deviation <= 0.15) return 'yellow';
        return 'red';
    };

    const SortIcon = ({ colKey }: { colKey: SortKey }) => {
        if (sortConfig?.key !== colKey) return <span className="opacity-20 ml-1">⇅</span>;
        return <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <div className="w-full max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 pb-4 border-b-4 border-black">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="inline-block border border-black px-2 py-0.5 bg-black text-white">
                            <span className="font-mono text-[10px] uppercase font-bold tracking-widest">LIVE DEMO</span>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Demo Dashboard</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <DemoAlertBadge />
                        <div className="h-9 px-4 text-[11px] font-mono border border-black bg-gray-100 text-gray-400 cursor-not-allowed uppercase tracking-wider flex items-center justify-center">
                            Manage Client
                        </div>
                        <div className="h-9 px-4 border border-black bg-gray-50 text-gray-400 font-mono text-[11px] min-w-[200px] flex items-center justify-between uppercase cursor-not-allowed">
                            <span>-- TechCorp --</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
                <div className="flex justify-center">
                    <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest animate-pulse">
                        Interactive Preview • Click campaigns to explore • Try the alerts above ↑
                    </p>
                </div>
            </div>

            <div className="border border-black overflow-hidden bg-white shadow-2xl">
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
                        {processedCampaigns.map(camp => {
                            const { recDaily, projectedSpend } = calculateMetrics(camp);
                            const effectiveBudget = camp.hasCustomBudget ? camp.budget : 0;
                            const projectedRatio = effectiveBudget > 0 ? (projectedSpend / effectiveBudget) * 100 : 0;
                            const isOverBudget = effectiveBudget > 0 && projectedSpend > effectiveBudget;

                            return (
                                <tr
                                    key={camp.id}
                                    className="border-b border-black last:border-b-0 hover:bg-black hover:text-white group transition-colors duration-75 text-sm cursor-pointer"
                                    onClick={() => setSelectedCampaign(camp)}
                                >
                                    <td className="p-3 border-r border-black group-hover:border-white font-bold">
                                        {camp.client}
                                    </td>
                                    <td
                                        className="p-3 border-r border-black group-hover:border-white font-mono truncate max-w-[200px]"
                                        title={camp.name}
                                    >
                                        <div className="flex items-center gap-2">
                                            <StatusIndicator status={getCampaignStatus(camp)} />
                                            <span className="truncate">{camp.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 border-r border-black group-hover:border-white uppercase text-xs">
                                        <span
                                            className={`px-1 border ${camp.status === 'active'
                                                ? 'border-black text-black group-hover:border-white group-hover:text-white'
                                                : 'border-gray-400 text-gray-400'
                                                }`}
                                        >
                                            {camp.status}
                                        </span>
                                    </td>
                                    <td className="p-3 group-hover:border-white">
                                        <div className="grid grid-cols-12 gap-4 items-center">
                                            {/* Daily */}
                                            <div className="col-span-4 flex flex-col">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xs uppercase text-gray-500 group-hover:text-gray-400">
                                                        Set
                                                    </span>
                                                    <span className="font-bold font-mono text-lg">
                                                        ¥{(camp.dailyBudget || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xs uppercase text-gray-500 group-hover:text-gray-400">
                                                        Rec
                                                    </span>
                                                    <span
                                                        className={`font-mono text-sm ${recDaily > (camp.dailyBudget || 0) * 1.3
                                                            ? 'text-red-500 font-bold'
                                                            : ''
                                                            }`}
                                                    >
                                                        ¥{Math.round(recDaily).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Monthly */}
                                            <div className="col-span-4 flex flex-col font-mono text-xs border-l border-gray-300 pl-4 group-hover:border-gray-600">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500 group-hover:text-gray-400">Month</span>
                                                    <span className="font-bold">¥{effectiveBudget.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500 group-hover:text-gray-400">Total</span>
                                                    <span>¥{Math.round(camp.spend).toLocaleString()}</span>
                                                </div>
                                            </div>

                                            {/* Projection */}
                                            <div className="col-span-4 flex flex-col gap-1 pl-4 border-l border-gray-300 group-hover:border-gray-600">
                                                <div className="flex justify-between items-center text-xs font-mono">
                                                    <span className="text-gray-500 group-hover:text-gray-400">
                                                        Projected
                                                    </span>
                                                    <span className={isOverBudget ? 'text-red-500 font-bold' : ''}>
                                                        {effectiveBudget > 0 ? `${Math.round(projectedRatio)}%` : '-'}
                                                    </span>
                                                </div>
                                                <ProgressBar
                                                    value={camp.spend}
                                                    max={effectiveBudget}
                                                    projected={projectedSpend}
                                                />
                                                <div className="flex justify-between text-[10px] font-mono text-gray-400 group-hover:text-gray-500">
                                                    <span>Spend: ¥{camp.spend.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Simple popup when campaign clicked */}
            {selectedCampaign && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedCampaign(null)}
                >
                    <div
                        className="bg-white border-4 border-black p-8 max-w-md w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-2xl font-black uppercase mb-4">Campaign Details</h3>
                        <div className="space-y-2 font-mono text-sm mb-6">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Client:</span>
                                <span className="font-bold">{selectedCampaign.client}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Campaign:</span>
                                <span className="font-bold">{selectedCampaign.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Status:</span>
                                <span className="font-bold uppercase">{selectedCampaign.status}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Monthly Budget:</span>
                                <span className="font-bold">¥{selectedCampaign.budget.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Current Spend:</span>
                                <span className="font-bold">¥{selectedCampaign.spend.toLocaleString()}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedCampaign(null)}
                            className="w-full bg-black text-white py-3 font-bold uppercase hover:bg-gray-800 transition-colors"
                        >
                            Close
                        </button>
                        <p className="text-xs text-center text-gray-500 mt-4 font-mono">
                            This is a demo. Sign up to manage real campaigns.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
