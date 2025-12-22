import React, { useState, useEffect } from 'react';

interface BudgetPeriod {
    startDate: string; // YYYY-MM-DD
    endDate: string;
    amount: number;
}

interface CampaignBudgetConfig {
    id: string;
    type: 'recurring' | 'fixed';
    periods: BudgetPeriod[];
    rawConfig?: any;
    history?: BudgetHistoryItem[];
}

interface BudgetHistoryItem {
    timestamp: string;
    type: 'recurring' | 'fixed';
    amount: number;
    period: string;
    user?: string;
}

interface BudgetManagerProps {
    isOpen: boolean;
    onClose: () => void;
    campaign: { id: string; name: string; spend: number } | null;
    clientId?: string;
    onSave: () => void;
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({ isOpen, onClose, campaign, clientId, onSave }) => {
    const [mode, setMode] = useState<'recurring' | 'fixed'>('recurring');
    const [commission, setCommission] = useState<{ type: 'fixed' | 'percentage', value: number } | null>(null);

    // Recurring State
    const [recStartMonth, setRecStartMonth] = useState(''); // YYYY-MM
    const [recEndMonth, setRecEndMonth] = useState('');     // YYYY-MM
    const [recAmount, setRecAmount] = useState<number>(0);

    // Fixed State
    const [fixStart, setFixStart] = useState('');
    const [fixEnd, setFixEnd] = useState('');
    const [fixAmount, setFixAmount] = useState<number>(0);

    // Extension State
    const [showExtension, setShowExtension] = useState(false);
    const [extAmount, setExtAmount] = useState<number>(0);
    const [extNewEndDate, setExtNewEndDate] = useState(''); // New end date picker

    const [previewPeriods, setPreviewPeriods] = useState<BudgetPeriod[]>([]);
    const [history, setHistory] = useState<BudgetHistoryItem[]>([]);

    const [existingType, setExistingType] = useState<'recurring' | 'fixed' | null>(null);

    // Helper: Format date to YYYY-MM-DD using local time
    const toLocalYMD = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Helper: Calculate days between two dates (YYYY-MM-DD)
    const daysBetween = (start: string, end: string): number => {
        if (!start || !end) return 0;
        const startDate = new Date(start);
        const endDate = new Date(end);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        const diffTime = endDate.getTime() - startDate.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both days
    };

    // Reset when opening
    useEffect(() => {
        if (isOpen && campaign) {
            // Reset Extension
            setShowExtension(false);
            setExtAmount(0);
            setExtNewEndDate('');

            // Fetch Commission
            if (clientId) {
                fetch(`/api/data/clients/${clientId}/commission`)
                    .then(res => res.json())
                    .then(data => setCommission(data))
                    .catch(err => console.error('Failed to load commission', err));
            }

            // Load existing config
            fetch(`/api/data/campaigns/${campaign.id}/budget`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.type) {
                        setMode(data.type);
                        setExistingType(data.type);
                        setPreviewPeriods(data.periods || []);
                        setHistory(data.history || []);
                        if (data.rawConfig) {
                            // Restore UI state
                            if (data.type === 'recurring') {
                                setRecStartMonth(data.rawConfig.startMonth || '');
                                setRecEndMonth(data.rawConfig.endMonth || '');
                                setRecAmount(data.rawConfig.amount || 0);
                            } else {
                                setFixStart(data.rawConfig.start || '');
                                setFixEnd(data.rawConfig.end || '');
                                setFixAmount(data.rawConfig.amount || 0);
                            }
                        }
                    } else {
                        // Default
                        setMode('recurring');
                        setExistingType(null);
                        setPreviewPeriods([]);
                        const today = new Date();
                        const currentMonth = toLocalYMD(today).slice(0, 7);
                        setRecStartMonth(currentMonth);
                        // Default end: +1 year
                        const nextYear = new Date(today);
                        nextYear.setFullYear(nextYear.getFullYear() + 1);
                        setRecEndMonth(toLocalYMD(nextYear).slice(0, 7));
                    }
                })
                .catch(err => console.error(err));
        }
    }, [isOpen, campaign]);

    // Auto-calculate extAmount when extNewEndDate changes
    useEffect(() => {
        if (extNewEndDate && fixStart && fixEnd && fixAmount > 0) {
            const currentTotalDays = daysBetween(fixStart, fixEnd);
            const addedDays = daysBetween(fixEnd, extNewEndDate) - 1; // -1 because fixEnd is already counted

            if (addedDays > 0 && currentTotalDays > 0) {
                const currentDailyBudget = fixAmount / currentTotalDays;
                const suggestedAmount = Math.round(currentDailyBudget * addedDays);
                setExtAmount(suggestedAmount);
            } else {
                setExtAmount(0);
            }
        }
    }, [extNewEndDate, fixStart, fixEnd, fixAmount]);

    // Generate Preview
    useEffect(() => {
        let periods: BudgetPeriod[] = [];

        if (mode === 'recurring') {
            if (recStartMonth && recEndMonth && recAmount > 0) {
                // Parse "YYYY-MM" parts directly to avoid timezone weirdness
                const [sY, sM] = recStartMonth.split('-').map(Number);
                const [eY, eM] = recEndMonth.split('-').map(Number);

                // Start from the 1st of the start month
                let currentYear = sY;
                let currentMonth = sM; // 1-based

                // Loop until we pass the end month
                while (
                    currentYear < eY ||
                    (currentYear === eY && currentMonth <= eM)
                ) {
                    // Create Date objects using local time constructor: new Date(year, monthIndex, day)
                    // monthIndex is 0-based
                    const firstDay = new Date(currentYear, currentMonth - 1, 1);
                    const lastDay = new Date(currentYear, currentMonth, 0); // 0th day of next month = last day of current

                    periods.push({
                        startDate: toLocalYMD(firstDay),
                        endDate: toLocalYMD(lastDay),
                        amount: recAmount
                    });

                    // Next month
                    currentMonth++;
                    if (currentMonth > 12) {
                        currentMonth = 1;
                        currentYear++;
                    }
                }
            }
        } else {
            if (fixStart && fixEnd && fixAmount > 0) {
                periods.push({
                    startDate: fixStart,
                    endDate: fixEnd,
                    amount: fixAmount
                });
            }
        }
        setPreviewPeriods(periods);
    }, [mode, recStartMonth, recEndMonth, recAmount, fixStart, fixEnd, fixAmount]);

    const handleApplyExtension = () => {
        if (!fixAmount || !extNewEndDate) return;
        const newTotal = fixAmount + extAmount;

        setFixAmount(newTotal);
        setFixEnd(extNewEndDate);

        // Reset extension inputs
        setExtAmount(0);
        setExtNewEndDate('');
        setShowExtension(false);
    };

    // Calculate projected daily for extension preview
    const getProjectedDaily = () => {
        if (!campaign) return 0;
        const newTotal = (fixAmount || 0) + extAmount;
        const newEndStr = extNewEndDate || fixEnd;

        if (!newEndStr) return 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(newEndStr);
        endDate.setHours(0, 0, 0, 0);

        const diffTime = endDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (daysLeft <= 0) return 0;

        const remainingBudget = newTotal - campaign.spend;
        return remainingBudget > 0 ? remainingBudget / daysLeft : 0;
    };

    const handleSave = async () => {
        if (!campaign) return;

        const config: CampaignBudgetConfig = {
            id: campaign.id,
            type: mode,
            periods: previewPeriods,
            rawConfig: mode === 'recurring'
                ? { startMonth: recStartMonth, endMonth: recEndMonth, amount: recAmount }
                : { start: fixStart, end: fixEnd, amount: fixAmount }
        };

        try {
            await fetch(`/api/data/campaigns/${campaign.id}/budget`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            onSave();
            onClose();
        } catch (err) {
            console.error('Failed to save budget', err);
            alert('Failed to save budget');
        }
    };

    if (!isOpen || !campaign) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white w-[600px] border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[90vh]">
                <header className="flex justify-between items-center mb-6 border-b-2 border-black pb-2 flex-shrink-0">
                    <h2 className="text-xl font-black uppercase">Budget Settings</h2>
                    <button onClick={onClose} className="text-xl font-bold hover:text-red-600">×</button>
                </header>

                <div className="mb-4 flex-shrink-0">
                    <div className="text-sm font-mono text-gray-500 mb-1">CAMPAIGN</div>
                    <div className="font-bold text-lg">{campaign.name}</div>
                    <div className="text-xs font-mono text-gray-400 mt-1">Current Spend: ¥{campaign.spend.toLocaleString()}</div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-black mb-6 flex-shrink-0">
                    <button
                        onClick={() => setMode('recurring')}
                        className={`flex-1 py-2 font-mono font-bold uppercase transition-colors ${mode === 'recurring' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                    >
                        Monthly Recurring
                    </button>
                    <button
                        onClick={() => setMode('fixed')}
                        className={`flex-1 py-2 font-mono font-bold uppercase transition-colors ${mode === 'fixed' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                    >
                        Fixed Period
                    </button>
                </div>

                {existingType && existingType !== mode && (
                    <div className="bg-red-50 border border-red-500 text-red-700 p-3 mb-6 text-xs font-bold uppercase flex items-center gap-2 flex-shrink-0">
                        <span className="text-lg">⚠️</span>
                        <span>
                            Warning: A {existingType} budget is already configured. Save will overwrite it.
                        </span>
                    </div>
                )}

                {/* Content - Scrollable if needed */}
                <div className="flex-1 overflow-y-auto min-h-0 mb-6 pr-2">
                    <div className="space-y-6">
                        {mode === 'recurring' ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-1">Start Month</label>
                                        <input
                                            type="month"
                                            value={recStartMonth}
                                            onChange={(e) => setRecStartMonth(e.target.value)}
                                            className="w-full border border-black p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-1">End Month</label>
                                        <input
                                            type="month"
                                            value={recEndMonth}
                                            onChange={(e) => setRecEndMonth(e.target.value)}
                                            className="w-full border border-black p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Monthly Budget (Gross)</label>
                                    <input
                                        type="number"
                                        value={recAmount || ''}
                                        onChange={(e) => setRecAmount(parseFloat(e.target.value))}
                                        placeholder="0"
                                        className="w-full border border-black p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black mb-2"
                                    />
                                    {recAmount > 0 && commission && (
                                        <div className="bg-blue-50 border border-blue-500 p-2 text-[11px] font-mono flex justify-between">
                                            <span className="uppercase text-blue-700">Estimated Ad Budget (Net)</span>
                                            <span className="font-bold">
                                                ¥{Math.round(commission.type === 'percentage'
                                                    ? recAmount * (1 - commission.value / 100)
                                                    : recAmount - commission.value
                                                ).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={fixStart}
                                            onChange={(e) => setFixStart(e.target.value)}
                                            className="w-full border border-black p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={fixEnd}
                                            onChange={(e) => setFixEnd(e.target.value)}
                                            className="w-full border border-black p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Total Budget (Gross)</label>
                                    <input
                                        type="number"
                                        value={fixAmount || ''}
                                        onChange={(e) => setFixAmount(parseFloat(e.target.value))}
                                        placeholder="0"
                                        className="w-full border border-black p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black mb-2"
                                    />
                                    {fixAmount > 0 && commission && (
                                        <div className="bg-blue-50 border border-blue-500 p-2 text-[11px] font-mono flex justify-between">
                                            <span className="uppercase text-blue-700">Estimated Ad Budget (Net)</span>
                                            <span className="font-bold">
                                                ¥{Math.round(commission.type === 'percentage'
                                                    ? fixAmount * (1 - commission.value / 100)
                                                    : fixAmount - commission.value
                                                ).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Extension / Top-up Section */}
                                <div className="border border-black bg-white p-4 mt-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-xs font-bold uppercase flex items-center gap-2">
                                            <span>⚡</span> Extend / Top-up
                                        </h3>
                                        <button
                                            onClick={() => setShowExtension(!showExtension)}
                                            className="text-xs font-bold underline hover:no-underline"
                                        >
                                            {showExtension ? 'CLOSE' : 'OPEN'}
                                        </button>
                                    </div>

                                    {showExtension && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase mb-1">+ Add Budget</label>
                                                    <input
                                                        type="number"
                                                        value={extAmount || ''}
                                                        onChange={(e) => setExtAmount(parseFloat(e.target.value) || 0)}
                                                        placeholder="Auto-calculated"
                                                        className="w-full border border-black p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black bg-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase mb-1">New End Date</label>
                                                    <input
                                                        type="date"
                                                        value={extNewEndDate}
                                                        onChange={(e) => setExtNewEndDate(e.target.value)}
                                                        min={fixEnd}
                                                        className="w-full border border-black p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black bg-white"
                                                    />
                                                </div>
                                            </div>

                                            {/* Live Preview */}
                                            <div className="bg-gray-50 border border-black p-3 text-xs space-y-2 font-mono">
                                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                                    <span className="text-gray-500 uppercase">New Total</span>
                                                    <span className="font-bold">
                                                        ¥{fixAmount?.toLocaleString()} <span className="text-gray-400">→</span> ¥{((fixAmount || 0) + extAmount).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                                    <span className="text-gray-500 uppercase">New End Date</span>
                                                    <span className="font-bold">
                                                        {fixEnd} <span className="text-gray-400">→</span> {extNewEndDate || fixEnd}
                                                    </span>
                                                </div>
                                                {extNewEndDate && fixEnd && (
                                                    <div className="flex justify-between border-b border-gray-200 pb-2 text-[10px]">
                                                        <span className="text-gray-500 uppercase">Days Added</span>
                                                        <span className="font-bold">
                                                            +{daysBetween(fixEnd, extNewEndDate) - 1} days
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center pt-1">
                                                    <span className="text-gray-500 uppercase">Proj. Daily</span>
                                                    <span className="font-bold bg-black text-white px-2 py-1">
                                                        ¥{Math.round(getProjectedDaily()).toLocaleString()} / day
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleApplyExtension}
                                                disabled={!extNewEndDate}
                                                className="w-full py-2 bg-black text-white text-xs font-bold uppercase border border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Apply Changes
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* History Log */}
                    <div className="mt-8">
                        <h3 className="text-xs font-bold uppercase mb-2">History: Change Log</h3>
                        <div className="bg-gray-50 border border-black p-4 max-h-40 overflow-y-auto">
                            {history.length === 0 ? (
                                <div className="text-xs font-mono text-gray-400">No history available</div>
                            ) : (
                                <table className="w-full text-xs font-mono text-left">
                                    <thead>
                                        <tr className="border-b border-gray-300">
                                            <th className="pb-1">Date</th>
                                            <th className="pb-1">Type</th>
                                            <th className="pb-1">Period</th>
                                            <th className="pb-1 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((item, idx) => (
                                            <tr key={idx} className="border-b border-gray-100 last:border-0">
                                                <td className="py-1">{new Date(item.timestamp).toLocaleDateString()}</td>
                                                <td className="py-1 uppercase">{item.type}</td>
                                                <td className="py-1 truncate max-w-[120px]" title={item.period}>{item.period}</td>
                                                <td className="py-1 text-right">¥{item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 flex-shrink-0 pt-4 border-t border-black">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold uppercase border border-transparent hover:underline"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={previewPeriods.length === 0}
                        className="px-6 py-2 bg-black text-white text-sm font-bold uppercase border border-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};
