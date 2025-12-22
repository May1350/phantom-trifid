import React from 'react';

interface KPIGridProps {
    totalSpend?: number;
    totalBudget?: number;
}

export const KPIGrid: React.FC<KPIGridProps> = ({ totalSpend = 0, totalBudget = 0 }) => {
    const usage = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0;

    const kpis = [
        {
            label: 'Total Spend',
            value: `¥${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
        },
        {
            label: 'Total Budget',
            value: `¥${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
        },
        {
            label: 'Budget Usage',
            value: `${usage.toFixed(1)}%`,
            trend: usage > 90 ? 'Critical' : 'Normal',
            trendColor: usage > 90 ? 'text-red-600' : 'text-green-600'
        },
    ];

    return (
        <div className="grid grid-cols-3 border border-black mb-8 bg-white">
            {kpis.map((kpi, index) => (
                <div
                    key={kpi.label}
                    className={`p-4 border-black ${index !== 2 ? 'border-r' : ''}`}
                >
                    <div className="text-xs font-mono uppercase text-gray-500 mb-1">
                        {kpi.label}
                    </div>
                    <div className="text-2xl font-black tracking-tight">
                        {kpi.value}
                    </div>
                    {kpi.trend && (
                        <div className={`text-xs font-bold mt-2 ${kpi.trendColor}`}>
                            {kpi.trend}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
