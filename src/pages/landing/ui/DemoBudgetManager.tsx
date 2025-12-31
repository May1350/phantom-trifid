import React, { useState, useEffect } from 'react';

interface BudgetHistoryItem {
    timestamp: string;
    type: 'recurring' | 'fixed';
    amount: number;
    period: string;
    user?: string;
}

interface DemoBudgetManagerProps {
    isOpen: boolean;
    onClose: () => void;
    campaign: { id: string; name: string; spend: number; budget: number } | null;
    onSave: (newBudget: number) => void;
}

export const DemoBudgetManager: React.FC<DemoBudgetManagerProps> = ({ isOpen, onClose, campaign, onSave }) => {
    const [mode, setMode] = useState<'recurring' | 'fixed'>('recurring');
    // Recurring State
    const [recStartMonth, setRecStartMonth] = useState('');
    const [recEndMonth, setRecEndMonth] = useState('');
    const [recAmount, setRecAmount] = useState<number>(0);

    // Fixed State
    const [fixStart, setFixStart] = useState('');
    const [fixEnd, setFixEnd] = useState('');
    const [fixAmount, setFixAmount] = useState<number>(0);

    // Extension State
    const [showExtension, setShowExtension] = useState(false);
    const [extAmount, setExtAmount] = useState<number>(0);
    const [extNewEndDate, setExtNewEndDate] = useState('');

    const [history, setHistory] = useState<BudgetHistoryItem[]>([]);

    const toLocalYMD = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const daysBetween = (start: string, end: string): number => {
        if (!start || !end) return 0;
        const startDate = new Date(start);
        const endDate = new Date(end);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        const diffTime = endDate.getTime() - startDate.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    // Initialize with campaign data and mock history
    useEffect(() => {
        if (isOpen && campaign) {
            setShowExtension(false);
            setExtAmount(0);
            setExtNewEndDate('');

            // Mock History
            setHistory([
                {
                    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
                    type: 'recurring',
                    amount: campaign.budget,
                    period: 'Auto-initialized',
                    user: 'System'
                }
            ]);

            // Default UI State
            setMode('recurring');
            const today = new Date();
            const currentMonth = toLocalYMD(today).slice(0, 7);
            setRecStartMonth(currentMonth);

            const nextYear = new Date(today);
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            setRecEndMonth(toLocalYMD(nextYear).slice(0, 7));
            setRecAmount(campaign.budget);

            // Fixed defaults
            setFixStart(toLocalYMD(today));
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            setFixEnd(toLocalYMD(endOfMonth));
            setFixAmount(campaign.budget);
        }
    }, [isOpen, campaign]);

    // Auto-calculate extension
    useEffect(() => {
        if (extNewEndDate && fixStart && fixEnd && fixAmount > 0) {
            const currentTotalDays = daysBetween(fixStart, fixEnd);
            const addedDays = daysBetween(fixEnd, extNewEndDate) - 1;
            if (addedDays > 0 && currentTotalDays > 0) {
                const currentDailyBudget = fixAmount / currentTotalDays;
                setExtAmount(Math.round(currentDailyBudget * addedDays));
            } else {
                setExtAmount(0);
            }
        }
    }, [extNewEndDate, fixStart, fixEnd, fixAmount]);


    const handleApplyExtension = () => {
        if (!fixAmount || !extNewEndDate) return;
        setFixAmount(prev => prev + extAmount);
        setFixEnd(extNewEndDate);
        setExtAmount(0);
        setExtNewEndDate('');
        setShowExtension(false);
    };

    const getProjectedDaily = () => {
        if (!campaign) return 0;
        const newTotal = (fixAmount || 0) + extAmount;
        const newEndStr = extNewEndDate || fixEnd;
        if (!newEndStr) return 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(newEndStr);
        endDate.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (daysLeft <= 0) return 0;
        const remainingBudget = newTotal - campaign.spend;
        return remainingBudget > 0 ? remainingBudget / daysLeft : 0;
    };

    const handleSave = () => {
        const finalAmount = mode === 'recurring' ? recAmount : fixAmount;
        onSave(finalAmount);
        onClose();
    };

    if (!isOpen || !campaign) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white w-full max-w-2xl border-4 border-black p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
                <header className="flex justify-between items-center mb-6 border-b-2 border-black pb-2 flex-shrink-0">
                    <h2 className="text-xl font-black uppercase tracking-tighter">Budget Settings (Demo)</h2>
                    <button onClick={onClose} className="text-2xl font-bold hover:text-red-600 transition-colors">×</button>
                </header>

                <div className="mb-4 flex-shrink-0">
                    <div className="text-[10px] font-mono text-gray-500 mb-1">CAMPAIGN</div>
                    <div className="font-bold text-lg">{campaign.name}</div>
                    <div className="text-xs font-mono text-gray-400 mt-1">Current Spend: ¥{campaign.spend.toLocaleString()}</div>
                </div>

                <div className="flex border-b-2 border-black mb-6 flex-shrink-0 font-mono">
                    <button
                        onClick={() => setMode('recurring')}
                        className={`flex-1 py-2 font-bold uppercase transition-colors ${mode === 'recurring' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                    >
                        Monthly Recurring
                    </button>
                    <button
                        onClick={() => setMode('fixed')}
                        className={`flex-1 py-2 font-bold uppercase transition-colors ${mode === 'fixed' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                    >
                        Fixed Period
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 mb-6 pr-2 custom-scrollbar">
                    <div className="space-y-6">
                        {mode === 'recurring' ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase mb-1">Start Month</label>
                                        <input
                                            type="month"
                                            value={recStartMonth}
                                            onChange={(e) => setRecStartMonth(e.target.value)}
                                            className="w-full border-2 border-black p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase mb-1">End Month</label>
                                        <input
                                            type="month"
                                            value={recEndMonth}
                                            onChange={(e) => setRecEndMonth(e.target.value)}
                                            className="w-full border-2 border-black p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                    </div>
                                </div>
                                <div className="relative">
                                    <label className="block text-[10px] font-black uppercase mb-1">Monthly Budget (Gross)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-gray-400">¥</span>
                                        <input
                                            type="number"
                                            value={recAmount || ''}
                                            onChange={(e) => setRecAmount(parseFloat(e.target.value) || 0)}
                                            className="w-full border-2 border-black p-2 pl-8 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                    </div>
                                    <div className="mt-2 bg-blue-50 border border-blue-500 p-2 text-[10px] font-mono">
                                        <div className="flex justify-between">
                                            <span className="text-blue-700 uppercase">Estimated Ad Budget (Net - 20% Comm)</span>
                                            <span className="font-bold">¥{Math.round(recAmount * 0.8).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={fixStart}
                                            onChange={(e) => setFixStart(e.target.value)}
                                            className="w-full border-2 border-black p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={fixEnd}
                                            onChange={(e) => setFixEnd(e.target.value)}
                                            className="w-full border-2 border-black p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                    </div>
                                </div>
                                <div className="relative">
                                    <label className="block text-[10px] font-black uppercase mb-1">Total Budget (Gross)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-gray-400">¥</span>
                                        <input
                                            type="number"
                                            value={fixAmount || ''}
                                            onChange={(e) => setFixAmount(parseFloat(e.target.value) || 0)}
                                            className="w-full border-2 border-black p-2 pl-8 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                    </div>
                                    <div className="mt-2 bg-blue-50 border border-blue-500 p-2 text-[10px] font-mono">
                                        <div className="flex justify-between">
                                            <span className="text-blue-700 uppercase">Estimated Ad Budget (Net - 20% Comm)</span>
                                            <span className="font-bold">¥{Math.round(fixAmount * 0.8).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-xs font-bold uppercase flex items-center gap-2">
                                            <span>⚡</span> Extend / Top-up
                                        </h3>
                                        <button
                                            onClick={() => setShowExtension(!showExtension)}
                                            className="text-[10px] font-black underline hover:no-underline uppercase"
                                        >
                                            {showExtension ? '[CLOSE]' : '[OPEN]'}
                                        </button>
                                    </div>

                                    {showExtension && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[9px] font-bold uppercase mb-1">+ Add Budget</label>
                                                    <input
                                                        type="number"
                                                        value={extAmount || ''}
                                                        onChange={(e) => setExtAmount(parseFloat(e.target.value) || 0)}
                                                        className="w-full border border-black p-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black bg-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold uppercase mb-1">New End Date</label>
                                                    <input
                                                        type="date"
                                                        value={extNewEndDate}
                                                        onChange={(e) => setExtNewEndDate(e.target.value)}
                                                        min={fixEnd}
                                                        className="w-full border border-black p-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black bg-white"
                                                    />
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 border border-black p-3 text-[10px] space-y-2 font-mono">
                                                <div className="flex justify-between border-b border-gray-200 pb-1">
                                                    <span className="text-gray-500 uppercase">Proj. Daily</span>
                                                    <span className="font-bold bg-black text-white px-1">
                                                        ¥{Math.round(getProjectedDaily()).toLocaleString()} / day
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleApplyExtension}
                                                disabled={!extNewEndDate}
                                                className="w-full py-2 bg-black text-white text-[10px] font-black uppercase border border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                                            >
                                                Apply Changes
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="mt-8">
                            <h3 className="text-[10px] font-black uppercase mb-2 tracking-widest">History: Change Log</h3>
                            <div className="bg-gray-50 border border-black p-3 max-h-40 overflow-y-auto font-mono">
                                <table className="w-full text-[9px] text-left">
                                    <thead>
                                        <tr className="border-b border-gray-300">
                                            <th className="pb-1">Date</th>
                                            <th className="pb-1">Type</th>
                                            <th className="pb-1 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((item, idx) => (
                                            <tr key={idx} className="border-b border-gray-100 last:border-0">
                                                <td className="py-1">{new Date(item.timestamp).toLocaleDateString()}</td>
                                                <td className="py-1 uppercase">{item.type}</td>
                                                <td className="py-1 text-right font-bold">¥{item.amount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 flex-shrink-0 pt-4 border-t-2 border-black">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold uppercase hover:underline"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-8 py-3 bg-black text-white text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};
